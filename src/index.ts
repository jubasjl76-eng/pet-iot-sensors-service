/**
 * Pet IoT Sensors Service
 * Main entry point - sends sensor data to backend API
 */

import './instrument.js'; // Sentry — must be the very first import
import * as Sentry from '@sentry/node';
import express from 'express';
import helmet from 'helmet';
import type { Server } from 'http';
import { config } from './config/index.js';
import { mqttClient } from './mqtt/index.js';
import { backendClient } from './services/backendClient.js';
import { redis, redisHealthy, closeRedis } from './redis.js';
import { httpMetricsMiddleware, metricsHandler } from './metrics.js';
import { log } from './log.js';

const startedAt = Date.now();
let server: Server | undefined;
let shuttingDown = false;

async function main() {
  log.info(
    { port: config.port, mqtt: `${config.mqttHost}:${config.mqttPort}`, backend: backendClient.getBackendUrl() },
    'sensors service starting',
  );

  const app = express();

  // Security headers (Phase 18, A12 #11). Pure JSON API — nothing to render —
  // so `default-src 'none'`; helmet's defaults add HSTS / nosniff / frameguard
  // and drop `X-Powered-By`.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] },
    },
  }));

  app.use(express.json());
  app.use(httpMetricsMiddleware);

  // Liveness: the process is up. Always 200.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sensors', uptimeS: Math.round((Date.now() - startedAt) / 1000) });
  });

  // Prometheus metrics (Phase 16).
  app.get('/metrics', metricsHandler);

  // Readiness: safe to route traffic. 503 until the MQTT dep is connected
  // and (when REDIS_URL is set) Redis PINGs. `redis` is `null` in the body
  // when unconfigured (dev/local, expected) rather than a failure.
  app.get('/ready', async (_req, res) => {
    const mqtt = mqttClient.isConnected();
    const redisOk = await redisHealthy();
    const ok = mqtt && redisOk && !shuttingDown;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ready' : 'not-ready',
      mqtt,
      redis: redis ? redisOk : null,
      backendOnline: backendClient.isOnline(), // informational — offline queue tolerates a down backend
      shuttingDown,
    });
  });

  app.get('/api/status', (_req, res) => {
    res.json({
      mqtt: mqttClient.isConnected(),
      backendOnline: backendClient.isOnline(),
      backendUrl: backendClient.getBackendUrl(),
    });
  });

  // Connect MQTT before we start listening so /ready flips true promptly.
  try {
    await mqttClient.connect();
    log.info('MQTT connected');
  } catch (error) {
    log.warn({ err: error }, 'MQTT connect failed; retrying in background');
  }

  // After the routes, before listen. No-op without a DSN.
  Sentry.setupExpressErrorHandler(app);

  server = app.listen(config.port, () => {
    log.info({ port: config.port }, 'HTTP server listening');
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function shutdown(signal?: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal: signal ?? 'shutdown' }, 'draining');

  // Force-exit if draining hangs past the orchestrator's grace period.
  const guard = setTimeout(() => {
    log.error('drain timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  guard.unref();

  const done = async () => {
    backendClient.stop();
    mqttClient.disconnect();
    await closeRedis();
    clearTimeout(guard);
    log.info('stopped');
    process.exit(0);
  };

  if (server) server.close(() => void done());
  else void done();
}

main();
