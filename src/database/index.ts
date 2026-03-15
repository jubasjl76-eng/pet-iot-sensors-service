/**
 * PostgreSQL Database Setup
 * Handles connection and migrations
 */

import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.pgHost,
  port: config.pgPort,
  database: config.pgDatabase,
  user: config.pgUser,
  password: config.pgPassword,
});

export async function initializeDatabase(): Promise<void> {
  console.log('[Database] Initializing...');
  
  // Create tables
  await pool.query(`
    -- Sensors table
    CREATE TABLE IF NOT EXISTS sensors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sensor_id VARCHAR(255) UNIQUE NOT NULL,
      sensor_type VARCHAR(50) NOT NULL,
      kennel_id VARCHAR(255),
      name VARCHAR(255),
      location VARCHAR(255),
      unit VARCHAR(20),
      threshold_min FLOAT,
      threshold_max FLOAT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Sensor events table
    CREATE TABLE IF NOT EXISTS sensor_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sensor_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      value FLOAT NOT NULL,
      unit VARCHAR(20),
      timestamp TIMESTAMP DEFAULT NOW()
    );
    
    -- Sensor health table
    CREATE TABLE IF NOT EXISTS sensor_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sensor_id VARCHAR(255) UNIQUE NOT NULL,
      is_online BOOLEAN DEFAULT false,
      battery_level INTEGER,
      signal_strength INTEGER,
      last_heartbeat TIMESTAMP,
      uptime_percentage FLOAT DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Alerts table
    CREATE TABLE IF NOT EXISTS sensor_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      alert_id VARCHAR(255) UNIQUE NOT NULL,
      sensor_id VARCHAR(255),
      kennel_id VARCHAR(255),
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      value FLOAT,
      threshold FLOAT,
      acknowledged BOOLEAN DEFAULT false,
      acknowledged_at TIMESTAMP,
      resolved BOOLEAN DEFAULT false,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sensor_events_sensor_id ON sensor_events(sensor_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_events_timestamp ON sensor_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sensor_health_sensor_id ON sensor_health(sensor_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_sensor_id ON sensor_alerts(sensor_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_kennel_id ON sensor_alerts(kennel_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON sensor_alerts(acknowledged);
  `);
  
  console.log('[Database] Tables created successfully');
}

// Query helpers
export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne<T>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}
