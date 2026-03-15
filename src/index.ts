/**
 * Pet IoT Sensors Service
 * Main entry point
 */

import express from 'express';
import { config } from './config/index.js';
import { initializeDatabase } from './database/index.js';
import { mqttClient } from './mqtt/index.js';
import sensorRoutes from './routes/index.js';

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🐾 Pet IoT Sensors Service v1.0.0 🐾           ║
╠═══════════════════════════════════════════════════════════╣
║  Port:      ${config.port.toString().padEnd(39)}║
║  MQTT:      ${`${config.mqttHost}:${config.mqttPort}`.padEnd(39)}║
║  PostgreSQL: ${`${config.pgHost}:${config.pgPort}`.padEnd(39)}║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    // Initialize database
    await initializeDatabase();
    console.log('[Service] Database initialized');

    // Connect to MQTT
    await mqttClient.connect();
    console.log('[Service] MQTT connected');

    // Start Express server
    const app = express();
    app.use(express.json());

    // Routes
    app.use('/api', sensorRoutes);

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
  mqttClient.disconnect();
  process.exit(0);
}

main();
