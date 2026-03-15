/**
 * MQTT Client for Sensor Communication
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';
import { config } from '../config/index.js';
import { storage } from '../storage/index.js';

export class MQTTSensorClient extends EventEmitter {
  private client: MqttClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;

  constructor() {
    super();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `mqtt://${config.mqttHost}:${config.mqttPort}`;
      
      const options: IClientOptions = {
        clientId: `sensor-service-${Math.random().toString(16).slice(2, 10)}`,
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

      this.client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        this.reconnectAttempts = 0;
        this.subscribeToSensors();
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error.message);
        reject(error);
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`[MQTT] Reconnecting... (attempt ${this.reconnectAttempts})`);
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Client offline');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
    });
  }

  private subscribeToSensors(): void {
    if (!this.client) return;

    // Subscribe to all sensor topics
    const topics = [
      'kennel/+/sensor/+/temperature',
      'kennel/+/sensor/+/humidity',
      'kennel/+/sensor/+/airquality',
      'kennel/+/door/+/status',
      'kennel/+/motion/+/status',
    ];

    topics.forEach(topic => {
      this.client?.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Subscribe error for ${topic}:`, err);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      const topicParts = topic.split('/');
      
      // Topic: kennel/{kennelId}/sensor/{deviceId}/{type}
      const [, kennelId, , deviceId, sensorType] = topicParts;
      
      console.log(`[MQTT] Sensor message on ${topic}:`, payload);

      // Register or update sensor
      storage.upsertSensor({
        sensorId: deviceId,
        sensorType: this.mapSensorType(sensorType),
        kennelId,
        name: payload.name || deviceId,
        location: payload.location,
      });

      // Store event
      storage.storeSensorEvent({
        sensorId: deviceId,
        eventType: sensorType,
        value: payload.value || payload.temperature || payload.humidity || payload.co2 || 0,
        unit: payload.unit || this.getUnit(sensorType),
      });

      // Update health
      storage.updateSensorHealth({
        sensorId: deviceId,
        isOnline: true,
        battery: payload.battery,
        signal: payload.rssi,
      });

      // Check thresholds and trigger alerts
      this.checkThresholds(deviceId, kennelId, sensorType, payload.value || payload.temperature || payload.humidity || 0);

      this.emit('sensorData', { deviceId, kennelId, sensorType, payload });
      
    } catch (error) {
      console.error('[MQTT] Failed to parse message:', error);
    }
  }

  private mapSensorType(type: string): string {
    const mapping: Record<string, string> = {
      temperature: 'temperature',
      humidity: 'humidity',
      airquality: 'air_quality',
      status: 'door',
      motion: 'motion',
    };
    return mapping[type] || type;
  }

  private getUnit(type: string): string {
    const units: Record<string, string> = {
      temperature: 'celsius',
      humidity: 'percent',
      air_quality: 'ppm',
      door: 'boolean',
      motion: 'boolean',
    };
    return units[type] || '';
  }

  private async checkThresholds(sensorId: string, kennelId: string, sensorType: string, value: number): Promise<void> {
    if (sensorType === 'temperature') {
      if (value > config.temperatureHigh) {
        await storage.createAlert({
          alertId: `alert_${Date.now()}`,
          sensorId,
          kennelId,
          alertType: 'temperature_high',
          severity: 'critical',
          title: 'High Temperature Alert',
          message: `Temperature too high: ${value}°C`,
          value,
          threshold: config.temperatureHigh,
        });
      } else if (value < config.temperatureLow) {
        await storage.createAlert({
          alertId: `alert_${Date.now()}`,
          sensorId,
          kennelId,
          alertType: 'temperature_low',
          severity: 'warning',
          title: 'Low Temperature Alert',
          message: `Temperature too low: ${value}°C`,
          value,
          threshold: config.temperatureLow,
        });
      }
    }
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
