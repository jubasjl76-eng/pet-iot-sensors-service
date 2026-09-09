/**
 * Backend Client for Edge/Cloud Communication
 * Sends device data to backend API with offline support
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.LOCAL_BACKEND_URL || process.env.CLOUD_BACKEND_URL || 'http://localhost:3000/api';
const OFFLINE_QUEUE_FILE = process.env.OFFLINE_QUEUE_FILE || './data/offline-queue.json';

interface DeviceData {
  deviceId: string;
  deviceType: string;
  eventType: string;
  value: any;
  unit?: string;
  timestamp: number;
  kennelId?: string;
}

class BackendClient {
  private client: AxiosInstance;
  private online: boolean = true;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY || 'smart-pet-api-key-2026',
      },
    });

    // Check connectivity periodically
    setInterval(() => this.checkConnectivity(), 30000);
    
    // Start sync worker
    this.startSyncWorker();
  }

  private async checkConnectivity(): Promise<void> {
    try {
      await this.client.get('/health');
      if (!this.online) {
        console.log('[BackendClient] Connection restored!');
        this.online = true;
        this.syncQueue();
      }
    } catch {
      if (this.online) {
        console.log('[BackendClient] Offline - queueing events');
        this.online = false;
      }
    }
  }

  /**
   * Send device data to backend
   */
  async sendDeviceData(data: DeviceData): Promise<boolean> {
    try {
      await this.client.post('/devices/ingest', data);
      console.log(`[BackendClient] Sent data: ${data.deviceId}/${data.eventType}`);
      return true;
    } catch (error) {
      console.log('[BackendClient] Failed to send, queueing offline');
      this.queueOffline(data);
      return false;
    }
  }

  /**
   * Send a threshold alert. Goes on the same ingest path (and offline queue) as
   * readings, tagged eventType "alert"; the backend routes it to the care inbox.
   */
  async sendAlert(alert: {
    deviceId: string;
    deviceType: string;
    kennelId: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    value: number;
    threshold: number;
  }): Promise<boolean> {
    return this.sendDeviceData({
      deviceId: alert.deviceId,
      deviceType: alert.deviceType,
      eventType: 'alert',
      value: alert,
      unit: alert.severity,
      timestamp: Date.now(),
      kennelId: alert.kennelId,
    });
  }

  /**
   * Queue data for offline sync
   */
  private queueOffline(data: DeviceData): void {
    const queue = this.getOfflineQueue();
    queue.push(data);
    
    // Limit queue size
    if (queue.length > 1000) {
      queue.shift();
    }
    
    this.saveOfflineQueue(queue);
  }

  /**
   * Get offline queue
   */
  private getOfflineQueue(): DeviceData[] {
    try {
      if (fs.existsSync(OFFLINE_QUEUE_FILE)) {
        return JSON.parse(fs.readFileSync(OFFLINE_QUEUE_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('[BackendClient] Failed to read queue:', e);
    }
    return [];
  }

  /**
   * Save offline queue
   */
  private saveOfflineQueue(queue: DeviceData[]): void {
    try {
      const dir = path.dirname(OFFLINE_QUEUE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(OFFLINE_QUEUE_FILE, JSON.stringify(queue, null, 2));
    } catch (e) {
      console.error('[BackendClient] Failed to save queue:', e);
    }
  }

  /**
   * Sync offline queue to backend
   */
  async syncQueue(): Promise<void> {
    if (!this.online) return;

    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[BackendClient] Syncing ${queue.length} queued events...`);
    
    const synced: number[] = [];
    
    for (let i = 0; i < queue.length; i++) {
      try {
        await this.client.post('/devices/ingest', queue[i]);
        synced.push(i);
      } catch {
        break; // Stop on first failure
      }
    }

    // Remove synced items
    if (synced.length > 0) {
      const remaining = queue.filter((_, i) => !synced.includes(i));
      this.saveOfflineQueue(remaining);
      console.log(`[BackendClient] Synced ${synced.length} events`);
    }
  }

  /**
   * Start automatic sync worker
   */
  private startSyncWorker(): void {
    this.syncInterval = setInterval(() => {
      if (this.online) {
        this.syncQueue();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.online;
  }

  /**
   * Get backend URL
   */
  getBackendUrl(): string {
    return BACKEND_URL;
  }

  /**
   * Stop sync worker
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const backendClient = new BackendClient();
export default backendClient;
