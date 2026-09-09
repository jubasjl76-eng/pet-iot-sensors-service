/**
 * Sensors API — a thin proxy to the backend's device/alert endpoints.
 *
 * Order matters: the literal /sensors/health must come before /sensors/:id, or
 * Express matches :id = "health". (This was the bug.)
 */

import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

const BACKEND_URL =
  process.env.LOCAL_BACKEND_URL || process.env.CLOUD_BACKEND_URL || "http://localhost:3000/api";
const API_KEY = process.env.API_KEY || "smart-pet-api-key-2026";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
});

const proxy =
  (fn: (req: Request) => Promise<{ data: unknown }>) =>
  async (req: Request, res: Response) => {
    try {
      const r = await fn(req);
      res.json(r.data);
    } catch (err) {
      const e = err as { message?: string };
      res.status(502).json({ error: e.message || "backend request failed" });
    }
  };

// ── health ────────────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "sensors", backend: BACKEND_URL, timestamp: new Date().toISOString() });
});

router.get("/sensors/health", proxy(() => api.get("/devices/health")));

// ── sensors ───────────────────────────────────────────────────────────────
router.get("/sensors", proxy((req) => api.get("/devices", { params: { type: "sensor", kennel_id: req.query.kennel_id } })));
router.get("/sensors/:id/events", proxy((req) => api.get(`/devices/${req.params.id}/events`, { params: { type: req.query.type, limit: req.query.limit } })));
router.get("/sensors/:id/health", proxy((req) => api.get(`/devices/${req.params.id}/health`)));
router.get("/sensors/:id", proxy((req) => api.get(`/devices/${req.params.id}`))); // most generic — last

// ── alerts ────────────────────────────────────────────────────────────────
router.get("/alerts", proxy((req) => api.get("/alerts", { params: { kennel_id: req.query.kennel_id, acknowledged: req.query.acknowledged } })));
router.put("/alerts/:id/acknowledge", proxy((req) => api.put(`/alerts/${req.params.id}/acknowledge`)));
router.put("/alerts/:id/resolve", proxy((req) => api.put(`/alerts/${req.params.id}/resolve`)));

export default router;
