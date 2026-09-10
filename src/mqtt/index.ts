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
import { log } from "../log.js";

const mlog = log.child({ mod: "mqtt" });

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

      mlog.info({ url }, "connecting");
      this.client = mqtt.connect(url, options);

      this.client.on("connect", () => {
        mlog.info("connected");
        this.reconnectAttempts = 0;
        this.subscribe();
        resolve();
      });
      this.client.on("error", (error) => {
        mlog.error({ err: error }, "error");
        reject(error);
      });
      this.client.on("reconnect", () => {
        this.reconnectAttempts++;
        mlog.warn({ attempt: this.reconnectAttempts }, "reconnecting");
      });
      this.client.on("offline", () => mlog.warn("offline"));
      this.client.on("message", (topic, message) => {
        void this.handleMessage(topic, message);
      });
    });
  }

  private subscribe(): void {
    for (const t of TOPICS) {
      this.client?.subscribe(t, { qos: 1 }, (err) => {
        if (err) mlog.error({ err, topic: t }, "subscribe failed");
        else mlog.debug({ topic: t }, "subscribed");
      });
    }
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      mlog.warn({ topic }, "bad JSON");
      return;
    }

    const c = classifyTopic(topic);
    if (!c) {
      mlog.warn({ topic }, "unroutable topic");
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
