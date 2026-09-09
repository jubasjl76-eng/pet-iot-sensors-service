/**
 * MQTT client — subscribes to sensor topics, forwards readings to the backend,
 * and raises threshold alerts.
 */

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { config } from "../config/index.js";
import { backendClient } from "../services/backendClient.js";
import { classifyTopic, readingValue } from "./topic.js";
import { evaluateThresholds, AlertDedupe } from "./alerts.js";

const TOPICS = [
  "kennel/+/sensor/+/temperature",
  "kennel/+/sensor/+/humidity",
  "kennel/+/sensor/+/airquality",
  "kennel/+/door/+/status",
  "kennel/+/motion/+/status",
];

export class MQTTSensorClient extends EventEmitter {
  private client: MqttClient | null = null;
  private reconnectAttempts = 0;
  private dedupe = new AlertDedupe(config.alertDedupeMinutes * 60_000);

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `mqtt://${config.mqttHost}:${config.mqttPort}`;
      const options: IClientOptions = {
        clientId: `sensor-service-${randomUUID().slice(0, 8)}`,
        clean: false,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };
      if (config.mqttUsername && config.mqttPassword) {
        options.username = config.mqttUsername;
        options.password = config.mqttPassword;
      }

      console.log(`[MQTT] Connecting to ${url}...`);
      this.client = mqtt.connect(url, options);

      this.client.on("connect", () => {
        console.log("[MQTT] Connected");
        this.reconnectAttempts = 0;
        this.subscribe();
        resolve();
      });
      this.client.on("error", (error) => {
        console.error("[MQTT] error:", error.message);
        reject(error);
      });
      this.client.on("reconnect", () => {
        this.reconnectAttempts++;
        console.log(`[MQTT] reconnecting (#${this.reconnectAttempts})`);
      });
      this.client.on("offline", () => console.log("[MQTT] offline"));
      this.client.on("message", (topic, message) => {
        void this.handleMessage(topic, message);
      });
    });
  }

  private subscribe(): void {
    for (const t of TOPICS) {
      this.client?.subscribe(t, { qos: 1 }, (err) => {
        if (err) console.error(`[MQTT] subscribe ${t}:`, err.message);
        else console.log(`[MQTT] subscribed ${t}`);
      });
    }
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      console.error("[MQTT] bad JSON on", topic);
      return;
    }

    const c = classifyTopic(topic);
    if (!c) {
      console.warn("[MQTT] unroutable topic", topic);
      return;
    }

    const value = readingValue(payload, c.deviceType);

    await backendClient.sendDeviceData({
      deviceId: c.deviceId,
      deviceType: c.deviceType,
      eventType: c.eventType,
      value: Number.isFinite(value) ? value : (payload.value ?? 0),
      unit: typeof payload.unit === "string" ? payload.unit : c.unit,
      timestamp: Date.now(),
      kennelId: c.kennelId,
    });

    for (const draft of evaluateThresholds(c.deviceType, value, config)) {
      if (!this.dedupe.allow(c.deviceId, draft.alertType)) continue;
      await backendClient.sendAlert({
        deviceId: c.deviceId,
        deviceType: c.deviceType,
        kennelId: c.kennelId,
        alertType: draft.alertType,
        severity: draft.severity,
        title: draft.title,
        message: draft.message,
        value,
        threshold: draft.threshold,
      });
    }

    this.emit("sensorData", { deviceId: c.deviceId, kennelId: c.kennelId, deviceType: c.deviceType, value });
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  disconnect(): void {
    this.client?.end();
    this.client = null;
  }
}

export const mqttClient = new MQTTSensorClient();
