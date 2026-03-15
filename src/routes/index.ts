/**
 * Sensors API Routes
 */

import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { storage } from '../storage/index.js';

const router = Router();

// Validation middleware
const validate = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// ============== SENSORS ==============

// GET /api/sensors - List all sensors
router.get('/sensors', async (req: Request, res: Response) => {
  try {
    const { kennel_id } = req.query;
    const sensors = await storage.getSensors(kennel_id as string);
    res.json({ sensors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

// GET /api/sensors/:id - Get single sensor
router.get('/sensors/:id', async (req: Request, res: Response) => {
  try {
    const sensor = await storage.getSensor(req.params.id);
    if (!sensor) {
      res.status(404).json({ error: 'Sensor not found' });
      return;
    }
    const stats = await storage.getSensorStats(req.params.id);
    res.json({ sensor, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sensor' });
  }
});

// GET /api/sensors/:id/events - Get sensor events
router.get('/sensors/:id/events', async (req: Request, res: Response) => {
  try {
    const { type, limit } = req.query;
    const events = type
      ? await storage.getSensorEventsByType(req.params.id, type as string, Number(limit) || 50)
      : await storage.getSensorEvents(req.params.id, Number(limit) || 50);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/sensors/:id/health - Get sensor health
router.get('/sensors/:id/health', async (req: Request, res: Response) => {
  try {
    const health = await storage.getSensorHealth(req.params.id);
    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

// GET /api/sensors/health - Get all sensors health
router.get('/sensors/health', async (_req: Request, res: Response) => {
  try {
    const health = await storage.getAllSensorHealth();
    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

// ============== ALERTS ==============

// GET /api/alerts - Get alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { kennel_id, acknowledged } = req.query;
    const alerts = await storage.getAlerts(
      kennel_id as string,
      acknowledged !== undefined ? acknowledged === 'true' : undefined
    );
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PUT /api/alerts/:id/acknowledge - Acknowledge alert
router.put('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    await storage.acknowledgeAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// PUT /api/alerts/:id/resolve - Resolve alert
router.put('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    await storage.resolveAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// ============== HEALTH ==============

// GET /health - Service health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'sensors',
    timestamp: new Date().toISOString() 
  });
});

export default router;
