/**
 * Topic parsing. Pure — unit tested.
 *
 * Subscribed shapes:
 *   kennel/{k}/sensor/{id}/temperature | humidity | airquality
 *   kennel/{k}/door/{id}/status
 *   kennel/{k}/motion/{id}/status
 *
 * Bug this fixes: the old code took the LAST segment as the sensor type, so a
 * door and a motion topic both ended up as "status" -> both mapped to "door".
 * The type is the device *class* (segment 2) except for a generic sensor, where
 * it is the leaf.
 */

export interface Classified {
  kennelId: string;
  deviceClass: string; // sensor | door | motion
  deviceId: string;
  leaf: string; // temperature | humidity | airquality | status
  sensorType: string; // temperature | humidity | air_quality | door | motion
  unit: string;
}

const UNIT: Record<string, string> = {
  temperature: "celsius",
  humidity: "percent",
  air_quality: "ppm",
  door: "boolean",
  motion: "boolean",
};

const SENSOR_LEAF_TYPE: Record<string, string> = {
  temperature: "temperature",
  humidity: "humidity",
  airquality: "air_quality",
};

export function classifyTopic(topic: string): Classified | null {
  const p = topic.split("/");
  if (p.length !== 5 || p[0] !== "kennel") return null;
  const [, kennelId, deviceClass, deviceId, leaf] = p;
  if (!kennelId || !deviceId) return null;

  let sensorType: string;
  if (deviceClass === "sensor") {
    sensorType = SENSOR_LEAF_TYPE[leaf];
    if (!sensorType) return null;
  } else if (deviceClass === "door" || deviceClass === "motion") {
    sensorType = deviceClass;
  } else {
    return null;
  }

  return { kennelId, deviceClass, deviceId, leaf, sensorType, unit: UNIT[sensorType] ?? "" };
}

/** The numeric reading from a payload, tolerant of the various field names. */
export function readingValue(payload: Record<string, unknown>, sensorType: string): number {
  const candidates =
    sensorType === "temperature" ? ["value", "temperature", "temp", "celsius"]
    : sensorType === "humidity" ? ["value", "humidity", "rh"]
    : sensorType === "air_quality" ? ["value", "airquality", "co2", "ppm", "tvoc"]
    : ["value"];
  for (const k of candidates) {
    const v = payload[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  // door/motion: boolean-ish -> 1/0
  const s = payload.state ?? payload.status ?? payload.value;
  if (typeof s === "boolean") return s ? 1 : 0;
  if (s === "open" || s === "detected" || s === "on") return 1;
  if (s === "closed" || s === "clear" || s === "off") return 0;
  return NaN;
}
