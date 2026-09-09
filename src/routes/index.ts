/**
 * Sensors API routes.
 *
 * Order matters: the literal /sensors/health must be registered before the
 * /sensors/:id* routes, or Express matches :id = "health". (This was the bug.)
 */

import { Router, Request, Response } from "express";
import { storage } from "../storage/index.js";

const router = Router();

// ── health (service + all sensors) ─────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "sensors", timestamp: new Date().toISOString() });
});

router.get("/sensors/health", async (_req: Request, res: Response) => {
  try {
    res.json({ health: await storage.getAllSensorHealth() });
  } catch {
    res.status(500).json({ error: "Failed to fetch health" });
  }
});

// ── sensors ───────────────────────────────────────────────────────────────
router.get("/sensors", async (req: Request, res: Response) => {
  try {
    res.json({ sensors: await storage.getSensors(req.query.kennel_id as string | undefined) });
  } catch {
    res.status(500).json({ error: "Failed to fetch sensors" });
  }
});

router.get("/sensors/:id/events", async (req: Request, res: Response) => {
  try {
    const { type, limit } = req.query;
    const n = Number(limit) || 50;
    const events = type
      ? await storage.getSensorEventsByType(req.params.id, String(type), n)
      : await storage.getSensorEvents(req.params.id, n);
    res.json({ events });
  } catch {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/sensors/:id/health", async (req: Request, res: Response) => {
  try {
    res.json({ health: await storage.getSensorHealth(req.params.id) });
  } catch {
    res.status(500).json({ error: "Failed to fetch health" });
  }
});

// most generic — last
router.get("/sensors/:id", async (req: Request, res: Response) => {
  try {
    const sensor = await storage.getSensor(req.params.id);
    if (!sensor) {
      res.status(404).json({ error: "Sensor not found" });
      return;
    }
    res.json({ sensor, stats: await storage.getSensorStats(req.params.id) });
  } catch {
    res.status(500).json({ error: "Failed to fetch sensor" });
  }
});

// ── alerts ────────────────────────────────────────────────────────────────
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const { kennel_id, acknowledged } = req.query;
    const alerts = await storage.getAlerts(
      kennel_id as string | undefined,
      acknowledged !== undefined ? acknowledged === "true" : undefined,
    );
    res.json({ alerts });
  } catch {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.put("/alerts/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    await storage.acknowledgeAlert(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

router.put("/alerts/:id/resolve", async (req: Request, res: Response) => {
  try {
    await storage.resolveAlert(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

export default router;
