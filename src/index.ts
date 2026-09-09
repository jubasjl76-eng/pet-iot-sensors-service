/**
 * Pet IoT Sensors Service — entry point.
 */
import "dotenv/config";
import express from "express";
import { config } from "./config/index.js";
import { initializeDatabase } from "./database/index.js";
import { mqttClient } from "./mqtt/index.js";
import sensorRoutes from "./routes/index.js";

async function main() {
  console.log(`[sensors] starting on :${config.port}  mqtt=${config.mqttHost}:${config.mqttPort}  pg=${config.pgHost}:${config.pgPort}`);

  await initializeDatabase();
  console.log("[sensors] database ready");

  const app = express();
  app.use(express.json());

  // ALB / ECS health check (also available at /api/health).
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "sensors", mqtt: mqttClient.isConnected() });
  });
  app.use("/api", sensorRoutes);

  app.listen(config.port, () => console.log(`[sensors] http on :${config.port}`));

  // MQTT is not required for the HTTP API to be healthy; connect in the
  // background and keep retrying (mqtt.js reconnects on its own).
  mqttClient.connect().catch((err) => {
    console.error("[sensors] initial MQTT connect failed, will retry:", err.message);
  });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function shutdown() {
  console.log("[sensors] shutting down");
  mqttClient.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[sensors] fatal:", err);
  process.exit(1);
});
