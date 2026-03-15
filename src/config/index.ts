// Configuration
export interface Config {
  // Service
  port: number;
  
  // MQTT
  mqttHost: string;
  mqttPort: number;
  mqttUsername?: string;
  mqttPassword?: string;
  
  // PostgreSQL
  pgHost: string;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  
  // Backend API
  apiUrl: string;
  apiKey: string;
  
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
  
  pgHost: process.env.PG_HOST || 'localhost',
  pgPort: parseInt(process.env.PG_PORT || '5432'),
  pgDatabase: process.env.PG_DATABASE || 'sensors',
  pgUser: process.env.PG_USER || 'postgres',
  pgPassword: process.env.PG_PASSWORD || 'postgres',
  
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || 'smart-pet-api-key-2026',
  
  // Alert thresholds
  temperatureHigh: parseInt(process.env.TEMP_HIGH || '30'),
  temperatureLow: parseInt(process.env.TEMP_LOW || '10'),
};
