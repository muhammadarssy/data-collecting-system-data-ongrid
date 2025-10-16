# Project Structure

```
data-collecting/
├── src/
│   ├── config/
│   │   └── config.js              # Konfigurasi aplikasi dari .env
│   │
│   ├── database/
│   │   ├── mongodb.js             # MongoDB connection manager
│   │   └── redis.js               # Redis connection & queue operations
│   │
│   ├── workers/
│   │   ├── history-worker.js      # Process history data (batch insert)
│   │   └── realtime-worker.js     # Process realtime data (upsert)
│   │
│   ├── monitoring/
│   │   └── monitor.js             # System health monitoring
│   │
│   ├── utils/
│   │   └── logger.js              # Winston logger configuration
│   │
│   ├── index.js                   # Main process manager
│   └── mqtt-subscriber.js         # MQTT message receiver
│
├── test/
│   └── mqtt-publisher.js          # Test data publisher
│
├── logs/                          # Log files (auto-created)
│   ├── app.log
│   └── app-error.log
│
├── .env                           # Environment configuration
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # NPM dependencies & scripts
├── ecosystem.config.js            # PM2 configuration
│
├── README.md                      # Complete documentation
├── QUICKSTART.md                  # Quick start guide
└── DEPLOYMENT.md                  # Production deployment guide
```

## 📂 Penjelasan Struktur

### `/src/config/`
Berisi konfigurasi aplikasi yang dibaca dari environment variables (.env)

### `/src/database/`
- **mongodb.js**: Singleton MongoDB connection dengan auto-reconnect
- **redis.js**: Redis client untuk queue operations (push, pop, get length)

### `/src/workers/`
- **history-worker.js**: 
  - Mengambil data dari `queue:history`
  - Batch insert ke MongoDB
  - Rate limiting untuk avoid overload
  
- **realtime-worker.js**:
  - Mengambil data dari `queue:realtime`
  - Batch upsert ke MongoDB
  - Update latest data per device

### `/src/monitoring/`
- **monitor.js**:
  - Monitor queue lengths
  - Check MongoDB & Redis health
  - Alert jika queue overflow
  - Log system stats

### `/src/utils/`
- **logger.js**: Winston logger dengan file & console output

### Main Files
- **index.js**: Spawn semua services (subscriber + workers + monitor)
- **mqtt-subscriber.js**: Subscribe MQTT topics, push messages ke queue

### Test
- **mqtt-publisher.js**: Kirim dummy data untuk testing

## 🔄 Data Flow

```
IoT Gateway
    ↓
MQTT Broker (port 1883)
    ↓
mqtt-subscriber.js
    ↓
Redis Queue (queue:realtime / queue:history)
    ↓
Workers (history-worker / realtime-worker)
    ↓
MongoDB (port 27017)
```

## 🚀 Process Architecture

Ketika menjalankan `npm start`:

```
index.js (Main Process)
    ├─→ mqtt-subscriber.js (1 instance)
    ├─→ history-worker.js (4 instances)
    ├─→ realtime-worker.js (2 instances)
    └─→ monitor.js (1 instance)
```

Semua process:
- Berjalan independent
- Auto-restart on crash
- Graceful shutdown (Ctrl+C)
- Shared MongoDB & Redis connection

## 📊 Queue Strategy

### Realtime Queue
- **Purpose**: Latest device status
- **Operation**: Upsert (update or insert)
- **Batch Size**: 50 messages
- **Workers**: 2 instances
- **Alert Threshold**: > 10,000 messages

### History Queue
- **Purpose**: Time-series data
- **Operation**: Insert (append only)
- **Batch Size**: 100 messages
- **Workers**: 4 instances
- **Alert Threshold**: > 50,000 messages

### Dead Letter Queue
- **Purpose**: Failed messages
- **Operation**: Store for retry/analysis
- **Manual processing required**

## 🔧 Scaling Guide

### Untuk handle lebih banyak data:

1. **Increase worker instances**:
   ```env
   WORKER_HISTORY_INSTANCES=8  # Default: 4
   WORKER_REALTIME_INSTANCES=4 # Default: 2
   ```

2. **Increase batch size**:
   ```env
   BATCH_SIZE_HISTORY=200      # Default: 100
   BATCH_SIZE_REALTIME=100     # Default: 50
   ```

3. **Adjust rate limiting**:
   ```env
   RATE_LIMIT_RESERVOIR=2000   # Default: 1000
   ```

### Untuk reduce memory usage:

1. **Decrease worker instances**
2. **Decrease batch size**
3. **Add more frequent garbage collection**

## 🔐 Security Notes

- `.env` file TIDAK di-commit ke Git
- MongoDB credentials di `.env`
- Redis password (optional) di `.env`
- MQTT credentials di `.env`
- Logs folder excluded dari Git

## 📝 Configuration Files

- **package.json**: Dependencies & NPM scripts
- **ecosystem.config.js**: PM2 process manager config
- **.env**: Runtime configuration (NOT in Git)
- **.env.example**: Configuration template (IN Git)
