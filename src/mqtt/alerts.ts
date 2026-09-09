/**
 * Threshold → alert rules. Pure — unit tested. The old service only had
 * temperature_high / temperature_low.
 */
import type { Config } from "../config/index.js";

export interface AlertDraft {
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  threshold: number;
}

export function evaluateThresholds(
  sensorType: string,
  value: number,
  cfg: Config,
): AlertDraft[] {
  if (!Number.isFinite(value)) return [];
  const out: AlertDraft[] = [];

  if (sensorType === "temperature") {
    if (value > cfg.temperatureHigh)
      out.push({ alertType: "temperature_high", severity: "critical", title: "High temperature", message: `Temperature ${value}°C over ${cfg.temperatureHigh}°C`, threshold: cfg.temperatureHigh });
    else if (value < cfg.temperatureLow)
      out.push({ alertType: "temperature_low", severity: "warning", title: "Low temperature", message: `Temperature ${value}°C under ${cfg.temperatureLow}°C`, threshold: cfg.temperatureLow });
  } else if (sensorType === "humidity") {
    if (value > cfg.humidityHigh)
      out.push({ alertType: "humidity_high", severity: "warning", title: "High humidity", message: `Humidity ${value}% over ${cfg.humidityHigh}%`, threshold: cfg.humidityHigh });
    else if (value < cfg.humidityLow)
      out.push({ alertType: "humidity_low", severity: "warning", title: "Low humidity", message: `Humidity ${value}% under ${cfg.humidityLow}%`, threshold: cfg.humidityLow });
  } else if (sensorType === "air_quality") {
    if (value > cfg.airQualityHigh)
      out.push({ alertType: "air_quality_poor", severity: "critical", title: "Poor air quality", message: `Air quality ${value}ppm over ${cfg.airQualityHigh}ppm`, threshold: cfg.airQualityHigh });
  } else if (sensorType === "door") {
    if (value >= 1)
      out.push({ alertType: "door_open", severity: "info", title: "Door open", message: "A monitored door is open", threshold: 1 });
  } else if (sensorType === "motion") {
    if (value >= 1)
      out.push({ alertType: "motion_detected", severity: "info", title: "Motion detected", message: "Motion on a monitored sensor", threshold: 1 });
  }

  return out;
}
