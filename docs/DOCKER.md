# Docker Setup Guide

## 🐳 Quick Start dengan Docker

Cara tercepat untuk setup development environment menggunakan Docker Compose.

### Prerequisites

- Docker Desktop installed
- Docker Compose installed

### Start All Services

```powershell
# Start semua services (MongoDB, Redis, MQTT)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Services Yang Akan Running:

| Service | Port | Description |
|---------|------|-------------|
| MongoDB | 27017 | Database |
| Redis | 6379 | Queue |
| Mosquitto (MQTT) | 1883 | Message Broker |
| Mongo Express | 8082 | MongoDB Web UI |
| Redis Commander | 8081 | Redis Web UI |

### Access Web UIs:

**Mongo Express**: http://localhost:8082
- Username: `admin`
- Password: `admin`

**Redis Commander**: http://localhost:8081

### Update .env File

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MONGODB_URI=mongodb://admin:admin123@localhost:27017
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Run Application

```powershell
# Start application
npm start
```

### Stop Services

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Useful Commands

```powershell
# Restart specific service
docker-compose restart mongodb
docker-compose restart redis
docker-compose restart mosquitto

# View logs for specific service
docker-compose logs -f mongodb
docker-compose logs -f redis

# Execute command in container
docker exec -it iot-mongodb mongosh -u admin -p admin123
docker exec -it iot-redis redis-cli
```

### Test MQTT Connection

```powershell
# Subscribe to test topic
docker exec -it iot-mosquitto mosquitto_sub -t "test/#" -v

# In another terminal, publish message
docker exec -it iot-mosquitto mosquitto_pub -t "test/hello" -m "Hello World"
```

### Production Notes

⚠️ This Docker Compose setup is for **DEVELOPMENT ONLY**.

For production:
- Use separate servers for each service
- Enable MongoDB authentication
- Use Redis password
- Configure MQTT with SSL/TLS
- Setup proper backup strategy
- Use Docker secrets for credentials
