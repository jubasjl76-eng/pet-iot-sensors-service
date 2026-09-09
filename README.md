# Pet IoT Sensors Service

Handles all IoT sensor data for kennels and pet owners.

## Supported Sensors

- 🌡️ Temperature sensors
- 💧 Humidity sensors
- 🚪 Door open/close sensors
- 🏃 Motion sensors
- 🌬️ Air quality sensors

## Technology Stack

- Node.js + TypeScript
- PostgreSQL
- MQTT Client

## Features

- Subscribe to MQTT topics for sensor events
  (`kennel/{k}/sensor/{id}/{temperature|humidity|airquality}`, `kennel/{k}/{door|motion}/{id}/status`)
- Store readings + health in PostgreSQL
- Threshold alerts: temperature high/low, humidity high/low, air quality poor,
  door open, motion detected — de-duplicated (`ALERT_DEDUPE_MINUTES`, default 15)
- REST API under `/api`; `/health` at the root for the load balancer

## Env

`PORT` (3005), `MQTT_HOST` / `MQTT_PORT` / `MQTT_USERNAME` / `MQTT_PASSWORD`,
`PG_HOST` / `PG_PORT` / `PG_DATABASE` / `PG_USER` / `PG_PASSWORD`,
`TEMP_HIGH` (30) / `TEMP_LOW` (10) / `HUMIDITY_HIGH` (80) / `HUMIDITY_LOW` (25) /
`AIR_QUALITY_HIGH` (1200) / `ALERT_DEDUPE_MINUTES` (15).

## Quick Start

### Docker

```bash
docker-compose up -d
```

### Local Development

```bash
npm install
npm run dev
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 3005 |
| MQTT_HOST | MQTT broker | localhost |
| PG_HOST | PostgreSQL host | localhost |
| PG_DATABASE | Database name | sensors |
| TEMP_HIGH | High temp alert threshold | 30°C |
| TEMP_LOW | Low temp alert threshold | 10°C |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sensors | List sensors |
| GET | /api/sensors/:id | Sensor details |
| GET | /api/sensors/:id/events | Sensor events |
| GET | /api/sensors/:id/health | Sensor health |
| GET | /api/sensors/health | All sensors health |
| GET | /api/alerts | List alerts |
| PUT | /api/alerts/:id/acknowledge | Acknowledge alert |
| PUT | /api/alerts/:id/resolve | Resolve alert |

## MQTT Topics

```
kennel/{kennelId}/sensor/{deviceId}/temperature
kennel/{kennelId}/sensor/{deviceId}/humidity
kennel/{kennelId}/sensor/{deviceId}/airquality
kennel/{kennelId}/door/{deviceId}/status
kennel/{kennelId}/motion/{deviceId}/status
```

## License

MIT
