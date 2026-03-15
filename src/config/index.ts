// Configuration
export interface Config {
  // Service
  port: number;
  
  // MQTT
  mqttHost: string;
  mqttPort: number;
  mqttUsername?: string;
  mqttPassword?: string;
  
  // Backend URLs (Edge/Cloud)
  localBackendUrl?: string;
  cloudBackendUrl?: string;
  
  // API
  apiKey: string;
  
  // Offline queue
  offlineQueueFile: string;
  
  // Alerts
  temperatureHigh: number;
  temperatureLow: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3005'),
  
  mqttHost: process.env.MQTT_HOST || 'localhost',
  mqttPort: parseInt(process.env.MQTT_PORT || '1883'),
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  
  // Backend URLs - automatically selects local or cloud
  localBackendUrl: process.env.LOCAL_BACKEND_URL,
  cloudBackendUrl: process.env.CLOUD_BACKEND_URL,
  
  apiKey: process.env.API_KEY || 'smart-pet-api-key-2026',
  
  offlineQueueFile: process.env.OFFLINE_QUEUE_FILE || './data/offline-queue.json',
  
  // Alert thresholds
  temperatureHigh: parseInt(process.env.TEMP_HIGH || '30'),
  temperatureLow: parseInt(process.env.TEMP_LOW || '10'),
};
