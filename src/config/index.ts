// Configuration
export interface Config {
  port: number;

  mqttHost: string;
  mqttPort: number;
  mqttUsername?: string;
  mqttPassword?: string;

  pgHost: string;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;

  // Alert thresholds
  temperatureHigh: number;
  temperatureLow: number;
  humidityHigh: number;
  humidityLow: number;
  airQualityHigh: number;
  // don't create the same alert again within this window (minutes)
  alertDedupeMinutes: number;
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const config: Config = {
  port: num(process.env.PORT, 3005),

  mqttHost: process.env.MQTT_HOST || "localhost",
  mqttPort: num(process.env.MQTT_PORT, 1883),
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,

  pgHost: process.env.PG_HOST || "localhost",
  pgPort: num(process.env.PG_PORT, 5432),
  pgDatabase: process.env.PG_DATABASE || "sensors",
  pgUser: process.env.PG_USER || "postgres",
  pgPassword: process.env.PG_PASSWORD || "postgres",

  temperatureHigh: num(process.env.TEMP_HIGH, 30),
  temperatureLow: num(process.env.TEMP_LOW, 10),
  humidityHigh: num(process.env.HUMIDITY_HIGH, 80),
  humidityLow: num(process.env.HUMIDITY_LOW, 25),
  airQualityHigh: num(process.env.AIR_QUALITY_HIGH, 1200),
  alertDedupeMinutes: num(process.env.ALERT_DEDUPE_MINUTES, 15),
};
