# Pet IoT Sensors Service

Handles all IoT sensor data for kennels and pet owners.

## Architecture Role

```
Devices → MQTT → Sensors Service → Backend API → PostgreSQL
```

This service subscribes to MQTT topics for sensor events and forwards them to the backend API. It does NOT store data directly in databases.

## Supported Sensors

- 🌡️ Temperature sensors
- 💧 Humidity sensors
- 🚪 Door open/close sensors
- 🏃 Motion sensors
- 🌬️ Air quality sensors

## Technology Stack

- Node.js + TypeScript
- MQTT Client
- Backend API Client (no direct database)

## MQTT Topics (Subscribe)

```
kennel/{kennelId}/sensor/{deviceId}/temperature
kennel/{kennelId}/sensor/{deviceId}/humidity
kennel/{kennelId}/sensor/{deviceId}/airquality
kennel/{kennelId}/door/{deviceId}/status
kennel/{kennelId}/motion/{deviceId}/status
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 3005 |
| MQTT_HOST | MQTT broker host | localhost |
| MQTT_PORT | MQTT broker port | 1883 |
| LOCAL_BACKEND_URL | Local backend URL | http://localhost:3000 |
| CLOUD_BACKEND_URL | Cloud backend URL | - |
| API_KEY | Backend API key | smart-pet-api-key-2026 |
| TEMP_HIGH | High temp alert threshold | 30°C |
| TEMP_LOW | Low temp alert threshold | 10°C |

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

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Service health |
| GET | /api/status | Connection status |

## Integration

This service communicates with:
- **MQTT Broker**: Receives sensor data from devices
- **Backend API**: Sends sensor data via `POST /api/devices/ingest`

## Offline Support

When backend is unavailable, events are queued locally and synced when connection is restored.

## License

MIT
