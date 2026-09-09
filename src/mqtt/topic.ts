/**
 * Topic parsing. Pure — unit tested.
 *
 *   kennel/{k}/sensor/{id}/temperature | humidity | airquality
 *   kennel/{k}/door/{id}/status
 *   kennel/{k}/motion/{id}/status
 *
 * The old code took the LAST segment as the type, so a door and a motion topic
 * both became "status" and both mapped to "door". The type is the device
 * *class* (segment 2), except a generic sensor where it is the leaf.
 */

export interface Classified {
  kennelId: string;
  deviceId: string;
  deviceType: string; // temperature | humidity | air_quality | door | motion
  eventType: string; // as it appears on the wire (temperature|humidity|airquality|status)
  unit: string;
}

const UNIT: Record<string, string> = {
  temperature: "celsius",
  humidity: "percent",
  air_quality: "ppm",
  door: "boolean",
  motion: "boolean",
};

const SENSOR_LEAF: Record<string, string> = {
  temperature: "temperature",
  humidity: "humidity",
  airquality: "air_quality",
};

export function classifyTopic(topic: string): Classified | null {
  const p = topic.split("/");
  if (p.length !== 5 || p[0] !== "kennel") return null;
  const [, kennelId, cls, deviceId, leaf] = p;
  if (!kennelId || !deviceId) return null;

  let deviceType: string;
  if (cls === "sensor") {
    deviceType = SENSOR_LEAF[leaf];
    if (!deviceType) return null;
  } else if (cls === "door" || cls === "motion") {
    deviceType = cls;
  } else {
    return null;
  }

  return { kennelId, deviceId, deviceType, eventType: leaf, unit: UNIT[deviceType] ?? "" };
}

/** Numeric reading from a payload, tolerant of the various field names. */
export function readingValue(payload: Record<string, unknown>, deviceType: string): number {
  const keys =
    deviceType === "temperature" ? ["value", "temperature", "temp", "celsius"]
    : deviceType === "humidity" ? ["value", "humidity", "rh"]
    : deviceType === "air_quality" ? ["value", "airquality", "co2", "ppm", "tvoc"]
    : ["value"];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  const s = payload.state ?? payload.status ?? payload.value;
  if (typeof s === "boolean") return s ? 1 : 0;
  if (s === "open" || s === "detected" || s === "on") return 1;
  if (s === "closed" || s === "clear" || s === "off") return 0;
  return NaN;
}
