/**
 * Threshold → alert rules. Pure — unit tested. The refactor to backend-forwarding
 * dropped all alert logic; this brings it back with the extra types the plan
 * asked for (humidity, air quality, door, motion).
 */
import type { Config } from "../config/index.js";

export interface AlertDraft {
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  threshold: number;
}

export function evaluateThresholds(deviceType: string, value: number, cfg: Config): AlertDraft[] {
  if (!Number.isFinite(value)) return [];
  const out: AlertDraft[] = [];

  if (deviceType === "temperature") {
    if (value > cfg.temperatureHigh)
      out.push({ alertType: "temperature_high", severity: "critical", title: "High temperature", message: `${value}°C over ${cfg.temperatureHigh}°C`, threshold: cfg.temperatureHigh });
    else if (value < cfg.temperatureLow)
      out.push({ alertType: "temperature_low", severity: "warning", title: "Low temperature", message: `${value}°C under ${cfg.temperatureLow}°C`, threshold: cfg.temperatureLow });
  } else if (deviceType === "humidity") {
    if (value > cfg.humidityHigh)
      out.push({ alertType: "humidity_high", severity: "warning", title: "High humidity", message: `${value}% over ${cfg.humidityHigh}%`, threshold: cfg.humidityHigh });
    else if (value < cfg.humidityLow)
      out.push({ alertType: "humidity_low", severity: "warning", title: "Low humidity", message: `${value}% under ${cfg.humidityLow}%`, threshold: cfg.humidityLow });
  } else if (deviceType === "air_quality") {
    if (value > cfg.airQualityHigh)
      out.push({ alertType: "air_quality_poor", severity: "critical", title: "Poor air quality", message: `${value}ppm over ${cfg.airQualityHigh}ppm`, threshold: cfg.airQualityHigh });
  } else if (deviceType === "door" && value >= 1) {
    out.push({ alertType: "door_open", severity: "info", title: "Door open", message: "A monitored door is open", threshold: 1 });
  } else if (deviceType === "motion" && value >= 1) {
    out.push({ alertType: "motion_detected", severity: "info", title: "Motion detected", message: "Motion on a monitored sensor", threshold: 1 });
  }

  return out;
}

/** In-memory dedupe: don't re-send the same (device, type) within `windowMs`. */
export class AlertDedupe {
  private last = new Map<string, number>();
  constructor(private windowMs: number) {}
  allow(deviceId: string, alertType: string, now = Date.now()): boolean {
    const k = `${deviceId}:${alertType}`;
    const prev = this.last.get(k);
    if (prev !== undefined && now - prev < this.windowMs) return false;
    this.last.set(k, now);
    return true;
  }
}
