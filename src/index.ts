/**
 * Pet IoT Sensors Service
 * Main entry point - sends sensor data to backend API
 */

import './instrument.js'; // Sentry — must be the very first import
import * as Sentry from '@sentry/node';
import express from 'express';
import type { Server } from 'http';
import { config } from './config/index.js';
import { mqttClient } from './mqtt/index.js';
import { backendClient } from './services/backendClient.js';
import { httpMetricsMiddleware, metricsHandler } from './metrics.js';

const startedAt = Date.now();
let server: Server | undefined;
let shuttingDown = false;

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🐾 Pet IoT Sensors Service v1.0.0 🐾           ║
╠═══════════════════════════════════════════════════════════╣
║  Port:      ${config.port.toString().padEnd(39)}║
║  MQTT:      ${`${config.mqttHost}:${config.mqttPort}`.padEnd(39)}║
║  Backend:   ${backendClient.getBackendUrl().padEnd(39)}║
║  API Key:   ${config.apiKey.substring(0, 10).padEnd(39)}║
╚═══════════════════════════════════════════════════════════╝
  `);

  const app = express();
  app.use(express.json());
  app.use(httpMetricsMiddleware);

  // Liveness: the process is up. Always 200.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sensors', uptimeS: Math.round((Date.now() - startedAt) / 1000) });
  });

  // Prometheus metrics (Phase 16).
  app.get('/metrics', metricsHandler);

  // Readiness: safe to route traffic. 503 until the MQTT dep is connected.
  app.get('/ready', (_req, res) => {
    const mqtt = mqttClient.isConnected();
    res.status(mqtt && !shuttingDown ? 200 : 503).json({
      status: mqtt && !shuttingDown ? 'ready' : 'not-ready',
      mqtt,
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
    console.log('[Service] MQTT connected');
  } catch (error) {
    console.error('[Service] MQTT connect failed, will retry in background:', error);
  }

  // After the routes, before listen. No-op without a DSN.
  Sentry.setupExpressErrorHandler(app);

  server = app.listen(config.port, () => {
    console.log(`[Service] Server running on port ${config.port}`);
    console.log('[Service] =========================================');
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function shutdown(signal?: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Service] ${signal ?? 'shutdown'} — draining...`);

  // Force-exit if draining hangs past the orchestrator's grace period.
  const guard = setTimeout(() => {
    console.error('[Service] drain timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  guard.unref();

  const done = () => {
    backendClient.stop();
    mqttClient.disconnect();
    clearTimeout(guard);
    console.log('[Service] stopped');
    process.exit(0);
  };

  if (server) server.close(() => done());
  else done();
}

main();
