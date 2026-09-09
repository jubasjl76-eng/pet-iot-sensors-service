/**
 * Storage Service
 * Handles database operations for sensors
 */

import { query, queryOne } from '../database/index.js';

export interface Sensor {
  id: string;
  sensor_id: string;
  sensor_type: string;
  kennel_id: string;
  name: string;
  location?: string;
  unit?: string;
  threshold_min?: number;
  threshold_max?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SensorEvent {
  id: string;
  sensor_id: string;
  event_type: string;
  value: number;
  unit?: string;
  timestamp: Date;
}

export interface SensorHealth {
  id: string;
  sensor_id: string;
  is_online: boolean;
  battery_level?: number;
  signal_strength?: number;
  last_heartbeat?: Date;
  uptime_percentage: number;
}

export interface SensorAlert {
  id: string;
  alert_id: string;
  sensor_id?: string;
  kennel_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  acknowledged: boolean;
  resolved: boolean;
  created_at: Date;
}

class StorageService {
  // ============== SENSORS ==============

  async upsertSensor(sensor: {
    sensorId: string;
    sensorType: string;
    kennelId: string;
    name: string;
    location?: string;
  }): Promise<void> {
    await query(`
      INSERT INTO sensors (sensor_id, sensor_type, kennel_id, name, location, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (sensor_id) DO UPDATE SET
        kennel_id = EXCLUDED.kennel_id,
        name = EXCLUDED.name,
        location = EXCLUDED.location,
        updated_at = NOW()
    `, [sensor.sensorId, sensor.sensorType, sensor.kennelId, sensor.name, sensor.location]);
  }

  async getSensors(kennelId?: string): Promise<Sensor[]> {
    if (kennelId) {
      return query<Sensor>('SELECT * FROM sensors WHERE kennel_id = $1 AND is_active = true ORDER BY name', [kennelId]);
    }
    return query<Sensor>('SELECT * FROM sensors WHERE is_active = true ORDER BY name');
  }

  async getSensor(sensorId: string): Promise<Sensor | null> {
    return queryOne<Sensor>('SELECT * FROM sensors WHERE sensor_id = $1', [sensorId]);
  }

  // ============== EVENTS ==============

  async storeSensorEvent(event: {
    sensorId: string;
    eventType: string;
    value: number;
    unit?: string;
  }): Promise<void> {
    await query(`
      INSERT INTO sensor_events (sensor_id, event_type, value, unit)
      VALUES ($1, $2, $3, $4)
    `, [event.sensorId, event.eventType, event.value, event.unit]);
  }

  async getSensorEvents(sensorId: string, limit = 50): Promise<SensorEvent[]> {
    return query<SensorEvent>(
      'SELECT * FROM sensor_events WHERE sensor_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [sensorId, limit]
    );
  }

  async getSensorEventsByType(sensorId: string, eventType: string, limit = 50): Promise<SensorEvent[]> {
    return query<SensorEvent>(
      'SELECT * FROM sensor_events WHERE sensor_id = $1 AND event_type = $2 ORDER BY timestamp DESC LIMIT $3',
      [sensorId, eventType, limit]
    );
  }

  // ============== HEALTH ==============

  async updateSensorHealth(health: {
    sensorId: string;
    isOnline: boolean;
    battery?: number;
    signal?: number;
  }): Promise<void> {
    await query(`
      INSERT INTO sensor_health (sensor_id, is_online, battery_level, signal_strength, last_heartbeat, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (sensor_id) DO UPDATE SET
        is_online = EXCLUDED.is_online,
        battery_level = COALESCE(EXCLUDED.battery_level, sensor_health.battery_level),
        signal_strength = COALESCE(EXCLUDED.signal_strength, sensor_health.signal_strength),
        last_heartbeat = NOW(),
        updated_at = NOW()
    `, [health.sensorId, health.isOnline, health.battery, health.signal]);
  }

  async getSensorHealth(sensorId: string): Promise<SensorHealth | null> {
    return queryOne<SensorHealth>('SELECT * FROM sensor_health WHERE sensor_id = $1', [sensorId]);
  }

  async getAllSensorHealth(): Promise<SensorHealth[]> {
    return query<SensorHealth>('SELECT * FROM sensor_health ORDER BY sensor_id');
  }

  // ============== ALERTS ==============

  async createAlert(alert: {
    alertId: string;
    sensorId: string;
    kennelId: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    value?: number;
    threshold?: number;
  }): Promise<void> {
    await query(`
      INSERT INTO sensor_alerts (alert_id, sensor_id, kennel_id, alert_type, severity, title, message, value, threshold)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [alert.alertId, alert.sensorId, alert.kennelId, alert.alertType, alert.severity, alert.title, alert.message, alert.value, alert.threshold]);
  }

  async getAlerts(kennelId?: string, acknowledged?: boolean): Promise<SensorAlert[]> {
    let sql = 'SELECT * FROM sensor_alerts WHERE 1=1';
    const params: any[] = [];

    if (kennelId) {
      params.push(kennelId);
      sql += ` AND kennel_id = $${params.length}`;
    }
    if (acknowledged !== undefined) {
      params.push(acknowledged);
      sql += ` AND acknowledged = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';
    return query<SensorAlert>(sql, params);
  }

  async hasRecentUnresolvedAlert(
    sensorId: string,
    alertType: string,
    minutes: number,
  ): Promise<boolean> {
    const row = await queryOne<{ n: string }>(
      `SELECT COUNT(*)::int AS n FROM sensor_alerts
        WHERE sensor_id = $1 AND alert_type = $2 AND resolved = false
          AND created_at > NOW() - ($3 || ' minutes')::interval`,
      [sensorId, alertType, minutes],
    );
    return Number(row?.n ?? 0) > 0;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await query(`
      UPDATE sensor_alerts SET acknowledged = true, acknowledged_at = NOW()
      WHERE alert_id = $1
    `, [alertId]);
  }

  async resolveAlert(alertId: string): Promise<void> {
    await query(`
      UPDATE sensor_alerts SET resolved = true, resolved_at = NOW()
      WHERE alert_id = $1
    `, [alertId]);
  }

  // ============== STATS ==============

  async getSensorStats(sensorId: string): Promise<any> {
    const latest = await queryOne<any>(`
      SELECT value, timestamp FROM sensor_events 
      WHERE sensor_id = $1 ORDER BY timestamp DESC LIMIT 1
    `, [sensorId]);

    const avg24h = await queryOne<any>(`
      SELECT AVG(value) as avg FROM sensor_events 
      WHERE sensor_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'
    `, [sensorId]);

    const count24h = await queryOne<any>(`
      SELECT COUNT(*) as count FROM sensor_events 
      WHERE sensor_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'
    `, [sensorId]);

    return { latest, avg24h: avg24h?.avg, count24h: count24h?.count };
  }
}

export const storage = new StorageService();
