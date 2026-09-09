import { describe, it, expect } from "vitest";
import { classifyTopic, readingValue } from "../mqtt/topic.js";
import { evaluateThresholds, AlertDedupe } from "../mqtt/alerts.js";
import type { Config } from "../config/index.js";

describe("classifyTopic", () => {
  it("routes the three sensor leaves", () => {
    expect(classifyTopic("kennel/home/sensor/s1/temperature")).toMatchObject({ deviceType: "temperature", unit: "celsius" });
    expect(classifyTopic("kennel/home/sensor/s1/airquality")).toMatchObject({ deviceType: "air_quality", unit: "ppm" });
  });
  it("keeps door and motion distinct (old bug mapped both to door)", () => {
    expect(classifyTopic("kennel/home/door/d1/status")?.deviceType).toBe("door");
    expect(classifyTopic("kennel/home/motion/m1/status")?.deviceType).toBe("motion");
  });
  it("rejects junk", () => {
    expect(classifyTopic("kennel/home/sensor/s1/pressure")).toBeNull();
    expect(classifyTopic("dogs/collar-1/location")).toBeNull();
    expect(classifyTopic("kennel/home/sensor/s1")).toBeNull();
  });
});

describe("readingValue", () => {
  it("finds the number under any usual key", () => {
    expect(readingValue({ temperature: 21.5 }, "temperature")).toBe(21.5);
    expect(readingValue({ co2: 900 }, "air_quality")).toBe(900);
  });
  it("maps door/motion state to 1/0", () => {
    expect(readingValue({ state: "open" }, "door")).toBe(1);
    expect(readingValue({ status: "clear" }, "motion")).toBe(0);
  });
  it("NaN when nothing usable", () => {
    expect(Number.isNaN(readingValue({}, "temperature"))).toBe(true);
  });
});

const cfg: Config = {
  port: 0, mqttHost: "", mqttPort: 0, apiKey: "", offlineQueueFile: "",
  temperatureHigh: 30, temperatureLow: 10, humidityHigh: 80, humidityLow: 25,
  airQualityHigh: 1200, alertDedupeMinutes: 15,
};

describe("evaluateThresholds", () => {
  it("temperature high/low", () => {
    expect(evaluateThresholds("temperature", 33, cfg)[0].alertType).toBe("temperature_high");
    expect(evaluateThresholds("temperature", 5, cfg)[0].alertType).toBe("temperature_low");
    expect(evaluateThresholds("temperature", 20, cfg)).toEqual([]);
  });
  it("humidity + air quality (the new types)", () => {
    expect(evaluateThresholds("humidity", 90, cfg)[0].alertType).toBe("humidity_high");
    expect(evaluateThresholds("humidity", 10, cfg)[0].alertType).toBe("humidity_low");
    expect(evaluateThresholds("air_quality", 1500, cfg)[0].alertType).toBe("air_quality_poor");
  });
  it("door / motion", () => {
    expect(evaluateThresholds("door", 1, cfg)[0].alertType).toBe("door_open");
    expect(evaluateThresholds("motion", 1, cfg)[0].alertType).toBe("motion_detected");
    expect(evaluateThresholds("door", 0, cfg)).toEqual([]);
  });
  it("ignores NaN", () => {
    expect(evaluateThresholds("temperature", NaN, cfg)).toEqual([]);
  });
});

describe("AlertDedupe", () => {
  it("blocks a repeat inside the window, allows after it", () => {
    const d = new AlertDedupe(60_000);
    expect(d.allow("s1", "temperature_high", 0)).toBe(true);
    expect(d.allow("s1", "temperature_high", 30_000)).toBe(false);
    expect(d.allow("s1", "temperature_high", 61_000)).toBe(true);
    expect(d.allow("s2", "temperature_high", 30_000)).toBe(true); // different device
  });
});
