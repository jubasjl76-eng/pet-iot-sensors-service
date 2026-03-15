/**
 * Pet IoT Sensors Service
 * Main entry point - sends sensor data to backend API
 */

import express from 'express';
import { config } from './config/index.js';
import { mqttClient } from './mqtt/index.js';
import { backendClient } from './services/backendClient.js';

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

  try {
    // Connect to MQTT
    await mqttClient.connect();
    console.log('[Service] MQTT connected');

    // Start Express server
    const app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'sensors',
        online: backendClient.isOnline(),
        backend: backendClient.getBackendUrl(),
        timestamp: new Date().toISOString() 
      });
    });

    // Status endpoint
    app.get('/api/status', (_req, res) => {
      res.json({
        mqtt: mqttClient.isConnected(),
        backendOnline: backendClient.isOnline(),
        backendUrl: backendClient.getBackendUrl(),
      });
    });

    // Start server
    app.listen(config.port, () => {
      console.log(`[Service] Server running on port ${config.port}`);
      console.log('[Service] =========================================');
    });

    // Handle shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('[Service] Failed to start:', error);
    process.exit(1);
  }
}

function shutdown() {
  console.log('\n[Service] Shutting down...');
  backendClient.stop();
  mqttClient.disconnect();
  process.exit(0);
}

main();
