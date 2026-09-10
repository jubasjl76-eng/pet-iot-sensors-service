/**
 * Typed config contract (hardening Phase 12, A8).
 *
 * ONE zod schema over process.env via @jubasjl76-eng/shared; a missing/invalid
 * var prints every problem and exits. The `config` object below keeps its
 * camelCase domain shape so nothing else in the service had to change.
 */
import { loadConfig, z, envInt, envPort } from '@jubasjl76-eng/shared';

const schema = z.object({
  // public / build-time
  PORT: envPort().default(3005),

  // runtime non-secret
  MQTT_HOST: z.string().default('localhost'),
  MQTT_PORT: envPort().default(1883),
  MQTT_USERNAME: z.string().optional(),
  LOCAL_BACKEND_URL: z.string().url().optional(),
  CLOUD_BACKEND_URL: z.string().url().optional(),
  OFFLINE_QUEUE_FILE: z.string().default('./data/offline-queue.json'),
  TEMP_HIGH: envInt().default(30),
  TEMP_LOW: envInt().default(10),
  HUMIDITY_HIGH: envInt().default(80),
  HUMIDITY_LOW: envInt().default(25),
  AIR_QUALITY_HIGH: envInt().default(1200),
  ALERT_DEDUPE_MINUTES: envInt().default(15),

  // error tracking (Phase 15) — read raw in src/instrument.ts; in the schema so
  // boot still validates them. A DSN is not a secret.
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),

  // secret (AWS Secrets Manager at runtime; SOPS+age for git-committed non-prod)
  MQTT_PASSWORD: z.string().optional(),
  API_KEY: z.string().default('smart-pet-api-key-2026'),
});

const env = loadConfig(schema, { name: 'sensors' });

export interface Config {
  port: number;
  mqttHost: string;
  mqttPort: number;
  mqttUsername?: string;
  mqttPassword?: string;
  localBackendUrl?: string;
  cloudBackendUrl?: string;
  apiKey: string;
  offlineQueueFile: string;
  temperatureHigh: number;
  temperatureLow: number;
  humidityHigh: number;
  humidityLow: number;
  airQualityHigh: number;
  alertDedupeMinutes: number;
}

export const config: Config = {
  port: env.PORT,
  mqttHost: env.MQTT_HOST,
  mqttPort: env.MQTT_PORT,
  mqttUsername: env.MQTT_USERNAME,
  mqttPassword: env.MQTT_PASSWORD,
  localBackendUrl: env.LOCAL_BACKEND_URL,
  cloudBackendUrl: env.CLOUD_BACKEND_URL,
  apiKey: env.API_KEY,
  offlineQueueFile: env.OFFLINE_QUEUE_FILE,
  temperatureHigh: env.TEMP_HIGH,
  temperatureLow: env.TEMP_LOW,
  humidityHigh: env.HUMIDITY_HIGH,
  humidityLow: env.HUMIDITY_LOW,
  airQualityHigh: env.AIR_QUALITY_HIGH,
  alertDedupeMinutes: env.ALERT_DEDUPE_MINUTES,
};
