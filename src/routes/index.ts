/**
 * Sensors API Routes
 * Forwards requests to backend API
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const BACKEND_URL = process.env.LOCAL_BACKEND_URL || process.env.CLOUD_BACKEND_URL || 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'smart-pet-api-key-2026';

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// ============== SENSORS ==============

// GET /api/sensors - List all sensors
router.get('/sensors', async (req: Request, res: Response) => {
  try {
    const { kennel_id } = req.query;
    const response = await apiClient.get('/devices', { 
      params: { type: 'sensor', kennel_id } 
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch sensors' });
  }
});

// GET /api/sensors/:id - Get single sensor
router.get('/sensors/:id', async (req: Request, res: Response) => {
  try {
    const response = await apiClient.get(`/devices/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch sensor' });
  }
});

// GET /api/sensors/:id/events - Get sensor events
router.get('/sensors/:id/events', async (req: Request, res: Response) => {
  try {
    const { type, limit } = req.query;
    const response = await apiClient.get(`/devices/${req.params.id}/events`, {
      params: { type, limit },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch events' });
  }
});

// GET /api/sensors/:id/health - Get sensor health
router.get('/sensors/:id/health', async (req: Request, res: Response) => {
  try {
    const response = await apiClient.get(`/devices/${req.params.id}/health`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch health' });
  }
});

// GET /api/sensors/health - Get all sensors health
router.get('/sensors/health', async (_req: Request, res: Response) => {
  try {
    const response = await apiClient.get('/devices/health');
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch health' });
  }
});

// ============== ALERTS ==============

// GET /api/alerts - Get alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { kennel_id, acknowledged } = req.query;
    const response = await apiClient.get('/alerts', {
      params: { kennel_id, acknowledged },
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch alerts' });
  }
});

// PUT /api/alerts/:id/acknowledge - Acknowledge alert
router.put('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const response = await apiClient.put(`/alerts/${req.params.id}/acknowledge`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to acknowledge alert' });
  }
});

// PUT /api/alerts/:id/resolve - Resolve alert
router.put('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const response = await apiClient.put(`/alerts/${req.params.id}/resolve`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resolve alert' });
  }
});

// ============== HEALTH ==============

// GET /health - Service health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'sensors',
    backend: BACKEND_URL,
    timestamp: new Date().toISOString() 
  });
});

export default router;
