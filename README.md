# IoT Data Collection System

Sistem pengumpulan data IoT dengan Queue Management untuk mencegah MongoDB overload saat internet site reconnect setelah offline.

## 🎯 Fitur Utama

- **MQTT Subscriber**: Menerima data dari IoT Gateway via MQTT Broker
- **Redis Queue**: Buffer message untuk mencegah spike traffic ke MongoDB
- **Worker Pool**: Multiple workers dengan rate limiting untuk process data
- **Batch Processing**: Insert/update data dalam batch untuk efisiensi
- **Dead Letter Queue**: Automatic retry dan error handling
- **System Monitoring**: Real-time monitoring queue length dan system health
- **Health Dashboard**: Web-based monitoring dashboard dengan real-time updates
- **Message Formatting**: Automatic prefix removal untuk clean data storage
- **Graceful Shutdown**: Proper cleanup saat stop services

## 📋 Arsitektur

```
IoT Gateway → MQTT Broker → MQTT Subscriber → Redis Queue → Workers → MongoDB
                                                    ↓
                                              Dead Letter Queue
```

### Flow Data:

1. **IoT Gateway** mengirim data ke MQTT Broker dengan topic:
   - `data/:site_id/realtime/:database/:collection/:idGateway`
   - `data/:site_id/history/:database/:collection/:idGateway`

2. **MQTT Subscriber** menerima message dan push ke Redis Queue

3. **Workers** mengambil message dari queue dan process dengan:
   - Rate limiting untuk avoid MongoDB overload
   - Batch processing untuk efficiency
   - Automatic retry pada error

4. **History Worker**: Insert batch data history ke MongoDB
5. **Realtime Worker**: Upsert realtime data ke MongoDB

## 🚀 Installation

### Prerequisites

- Node.js >= 16.x
- MongoDB >= 5.0
- Redis >= 6.0
- MQTT Broker (Mosquitto, EMQX, dll)

### Setup

1. **Clone atau copy project**

```powershell
cd c:\Users\Arssy-Sundaya\Documents\Work-Office\system-data\data-collecting
```

2. **Install dependencies**

```powershell
npm install
```

3. **Configure environment**

Copy `.env.example` ke `.env` dan sesuaikan konfigurasi:

```powershell
cp .env.example .env
```

Edit `.env`:

```env
# MQTT Configuration
MQTT_BROKER_URL=mqtt://your-broker-ip:1883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password

# MongoDB Configuration
MONGODB_URI=mongodb://your-mongodb-ip:27017

# Redis Configuration
REDIS_HOST=your-redis-ip
REDIS_PORT=6379
```

4. **Create logs directory**

```powershell
mkdir logs
```

## 🎮 Usage

### Start All Services (Recommended)

```powershell
npm start
```

Ini akan menjalankan:
- 1x MQTT Subscriber
- 4x History Workers
- 2x Realtime Workers
- 1x System Monitor
- 1x Health Dashboard (http://localhost:3000)

### Health Dashboard

Access web-based monitoring dashboard:

```
http://localhost:3000
```

**Features:**
- Real-time queue monitoring
- MongoDB & Redis connection status
- System metrics
- Queue management (clear queue)
- Auto-refresh every 5 seconds

### Start Individual Services

```powershell
# MQTT Subscriber only
npm run subscriber

# History Worker only
npm run worker:history

# Realtime Worker only
npm run worker:realtime

# Monitor only
npm run monitor

# Health Dashboard only
npm run dashboard
npm run monitor
```

### Development Mode (with auto-restart)

```powershell
npm run dev
```

## ⚙️ Configuration

### Queue Settings

Adjust di `.env`:

```env
# Batch sizes
BATCH_SIZE_HISTORY=100      # Batch size untuk history insert
BATCH_SIZE_REALTIME=50      # Batch size untuk realtime upsert

# Worker instances
WORKER_HISTORY_INSTANCES=4  # Jumlah history worker
WORKER_REALTIME_INSTANCES=2 # Jumlah realtime worker
```

### Rate Limiting

```env
RATE_LIMIT_MAX_CONCURRENT=10     # Max concurrent MongoDB operations
RATE_LIMIT_MIN_TIME_MS=100       # Min time between operations
RATE_LIMIT_RESERVOIR=1000        # Max operations per interval
```

### Monitoring

```env
MONITOR_INTERVAL_MS=30000                # Check every 30 seconds
QUEUE_ALERT_THRESHOLD_HISTORY=50000      # Alert jika history queue > 50k
QUEUE_ALERT_THRESHOLD_REALTIME=10000     # Alert jika realtime queue > 10k
```

## 📊 Monitoring

### Log Files

Logs disimpan di folder `logs/`:
- `app.log` - All logs
- `app-error.log` - Error logs only

### Queue Length

Check queue length via Redis CLI:

```bash
redis-cli
> LLEN queue:history
> LLEN queue:realtime
> LLEN queue:dead_letter
```

### System Stats

Monitor akan log stats setiap 30 detik:
- Queue lengths
- MongoDB status & response time
- Redis status & memory usage
- System memory & uptime

## 🔧 MongoDB Setup (Recommended)

### Create Time Series Collection (MongoDB 5.0+)

Untuk history data, gunakan Time Series Collection untuk efisiensi:

```javascript
// Connect to MongoDB
use your_database_name;

// Create time series collection
db.createCollection("energy_meter_history", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  },
  expireAfterSeconds: 31536000  // Auto-delete after 1 year
});
```

### Create Indexes

```javascript
// For realtime collection
db.realtime.createIndex(
  { "gatewayId": 1, "deviceId": 1 },
  { unique: true }
);

// For history collection
db.history.createIndex({ "timestamp": -1, "siteId": 1 });
db.history.createIndex({ "gatewayId": 1, "timestamp": -1 });
```

### MongoDB Configuration Tuning

Edit MongoDB config (`/etc/mongod.conf`):

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4  # 50% dari total RAM
    collectionConfig:
      blockCompressor: snappy

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

net:
  maxIncomingConnections: 1000
```

## 🐛 Troubleshooting

### Queue Overflow

Jika queue terlalu panjang:

1. **Tambah worker instances**:
   ```env
   WORKER_HISTORY_INSTANCES=8  # Dari 4 jadi 8
   ```

2. **Increase batch size**:
   ```env
   BATCH_SIZE_HISTORY=200  # Dari 100 jadi 200
   ```

3. **Check MongoDB performance**:
   ```javascript
   db.currentOp()  // Check slow queries
   db.serverStatus().opcounters  // Check operation counts
   ```

### MongoDB Down

Dead letter queue akan menampung failed messages:

```bash
redis-cli
> LLEN queue:dead_letter
> LRANGE queue:dead_letter 0 10  # Check first 10 failed messages
```

Setelah MongoDB up, reprocess dead letter queue manually atau restart workers.

### High Memory Usage

1. **Check Redis memory**:
   ```bash
   redis-cli INFO memory
   ```

2. **Adjust batch sizes** (smaller batches = less memory)

3. **Reduce worker instances**

## 📈 Performance Tuning

### Saat Recovery dari Offline (1 bulan data)

Estimasi: 5-8 device × 30 days × (12 × 24 realtime + 288 + 24 history) ≈ 150K messages

**Recommended settings**:

```env
# Aggressive processing
WORKER_HISTORY_INSTANCES=8
BATCH_SIZE_HISTORY=200
RATE_LIMIT_RESERVOIR=2000
```

**Expected recovery time**: 2-4 jam

### Normal Operation

```env
# Conservative settings
WORKER_HISTORY_INSTANCES=4
BATCH_SIZE_HISTORY=100
RATE_LIMIT_RESERVOIR=1000
```

## 🔒 Production Deployment

### Using PM2 (Recommended)

Install PM2:

```powershell
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'iot-data-collector',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start with PM2:

```powershell
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📝 Testing

### Send Test MQTT Message

```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  const topic = 'data/site001/history/energy_db/meter_data/gateway001';
  const payload = {
    deviceId: 'meter_001',
    voltage: 220,
    current: 10.5,
    power: 2310,
    energy: 1250.5,
    timestamp: new Date()
  };

  client.publish(topic, JSON.stringify(payload));
  console.log('Message published');
  client.end();
});
```

## 📄 License

ISC

## 👤 Author

Data Collection Team

## 🆘 Support

Untuk issues atau pertanyaan, silakan contact team atau buat issue di repository.
