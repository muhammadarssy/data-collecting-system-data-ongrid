# 📋 CHEAT SHEET - IoT Data Collection System

## 🚀 Quick Commands

### Setup & Installation
```powershell
# Install dependencies
npm install

# Setup dengan Docker (RECOMMENDED untuk testing)
npm run docker:up

# Start application
npm start

# Send test data
npm run test:publisher
```

### Development
```powershell
# Development mode dengan auto-reload
npm run dev

# Start individual services
npm run subscriber       # MQTT Subscriber
npm run worker:history   # History Worker
npm run worker:realtime  # Realtime Worker
npm run monitor          # System Monitor
npm run dashboard        # Health Dashboard
```

### Health Dashboard

```powershell
# Start dashboard
npm run dashboard

# Access via browser
http://localhost:3000
```

### Docker Management
```powershell
# Start all services (MongoDB, Redis, MQTT)
npm run docker:up
# atau
docker-compose up -d

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart service
docker-compose restart mongodb
docker-compose restart redis
```

### Production (PM2)
```powershell
# Install PM2
npm install -g pm2

# Start
npm run pm2:start
# atau
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

### Monitoring

#### Check Queue Length
```powershell
redis-cli
> LLEN queue:history
> LLEN queue:realtime
> LLEN queue:dead_letter
> exit
```

#### Check MongoDB Data
```powershell
mongosh
> use energy_db
> db.realtime_data.countDocuments()
> db.history_data.countDocuments()
> db.history_data.find().limit(5).pretty()
> exit
```

#### Check Logs
```powershell
# Real-time logs (Windows)
Get-Content logs\app.log -Wait -Tail 50

# Error logs
Get-Content logs\app-error.log -Wait -Tail 20
```

### Testing

#### MQTT Test Publisher
```powershell
node test/mqtt-publisher.js
```

#### Manual MQTT Publish
```powershell
# Subscribe
docker exec -it iot-mosquitto mosquitto_sub -t "data/#" -v

# Publish
docker exec -it iot-mosquitto mosquitto_pub -t "data/site001/realtime/energy_db/realtime_data/gateway001" -m '{"deviceId":"meter_001","voltage":220,"current":10}'
```

---

## ⚙️ Configuration Quick Reference

### .env File
```env
# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# MongoDB
MONGODB_URI=mongodb://localhost:27017

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Workers
WORKER_HISTORY_INSTANCES=4
WORKER_REALTIME_INSTANCES=2
BATCH_SIZE_HISTORY=100
BATCH_SIZE_REALTIME=50

# Rate Limiting
RATE_LIMIT_MAX_CONCURRENT=10
RATE_LIMIT_RESERVOIR=1000

# Monitoring
MONITOR_INTERVAL_MS=30000
QUEUE_ALERT_THRESHOLD_HISTORY=50000
QUEUE_ALERT_THRESHOLD_REALTIME=10000
```

---

## 🔧 Troubleshooting Quick Fix

### Problem: Can't connect to MQTT
```powershell
# Start MQTT broker
docker-compose up -d mosquitto

# Test connection
docker exec -it iot-mosquitto mosquitto_sub -t test
```

### Problem: Can't connect to MongoDB
```powershell
# Start MongoDB
docker-compose up -d mongodb

# Test connection
mongosh --host localhost --port 27017
```

### Problem: Can't connect to Redis
```powershell
# Start Redis
docker-compose up -d redis

# Test connection
redis-cli ping
```

### Problem: Queue tidak berkurang
```powershell
# 1. Check workers running
pm2 status

# 2. Check MongoDB connection
mongosh

# 3. Check error logs
Get-Content logs\app-error.log -Tail 50

# 4. Restart workers
pm2 restart all
```

### Problem: High memory usage
```env
# Reduce di .env
WORKER_HISTORY_INSTANCES=2
WORKER_REALTIME_INSTANCES=1
BATCH_SIZE_HISTORY=50
BATCH_SIZE_REALTIME=25
```

---

## 📊 Web UIs (Docker Mode)

| Service | URL | Credentials |
|---------|-----|-------------|
| Mongo Express | http://localhost:8082 | admin / admin |
| Redis Commander | http://localhost:8081 | - |

---

## 🎯 Performance Tuning

### Increase Processing Speed
```env
WORKER_HISTORY_INSTANCES=8
BATCH_SIZE_HISTORY=200
RATE_LIMIT_RESERVOIR=2000
```

### Reduce MongoDB Load
```env
RATE_LIMIT_MAX_CONCURRENT=5
BATCH_SIZE_HISTORY=50
WORKER_HISTORY_INSTANCES=2
```

### Memory Optimization
```env
WORKER_HISTORY_INSTANCES=2
WORKER_REALTIME_INSTANCES=1
BATCH_SIZE_HISTORY=50
```

---

## 📝 Common NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start semua services |
| `npm run dev` | Development mode |
| `npm run subscriber` | MQTT subscriber only |
| `npm run worker:history` | History worker only |
| `npm run worker:realtime` | Realtime worker only |
| `npm run monitor` | Monitor only |
| `npm run test:publisher` | Send test data |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run pm2:start` | Start with PM2 |
| `npm run pm2:logs` | View PM2 logs |

---

## 🔍 Debugging

### Enable Debug Logging
```env
LOG_LEVEL=debug
```

### Check Service Health
```powershell
# MQTT
docker exec -it iot-mosquitto mosquitto_sub -t '$$SYS/#' -C 10

# MongoDB
mongosh --eval "db.serverStatus()"

# Redis
redis-cli INFO stats
```

### Monitor Resource Usage
```powershell
# PM2 monitoring
pm2 monit

# Docker stats
docker stats
```

---

## 📞 Quick Help

| Issue | Solution File |
|-------|---------------|
| Getting started | `QUICKSTART.md` |
| Configuration | `README.md` |
| Docker setup | `DOCKER.md` |
| Production deploy | `DEPLOYMENT.md` |
| Project structure | `STRUCTURE.md` |
| Implementation details | `IMPLEMENTATION_COMPLETE.md` |

---

## 🎓 Topic Format

```
Realtime: data/:site_id/realtime/:database/:collection/:idGateway
History:  data/:site_id/history/:database/:collection/:idGateway

Example:
data/site001/realtime/energy_db/realtime_data/gateway001
data/site001/history/energy_db/history_data/gateway001
```

---

## ✅ Health Check Checklist

```powershell
# 1. Services running?
docker-compose ps
# atau
pm2 status

# 2. Queue length normal?
redis-cli LLEN queue:history    # Should be < 1000
redis-cli LLEN queue:realtime   # Should be < 100

# 3. MongoDB responsive?
mongosh --eval "db.adminCommand('ping')"

# 4. No errors in logs?
Get-Content logs\app-error.log -Tail 20

# 5. Data flowing?
mongosh --eval "db.history_data.countDocuments()"
```

---

**Print this file or bookmark it for quick reference!** 📌
