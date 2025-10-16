# Deployment Guide - IoT Data Collection System

## 📦 VPS Alibaba Setup

### 1. System Requirements

```bash
# OS: Ubuntu 20.04/22.04 or CentOS 7/8
# RAM: 8GB
# CPU: 4 Core
# Storage: 100GB+
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 3. Install MongoDB

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

### 4. Install Redis

```bash
# Install Redis
sudo apt-get update
sudo apt-get install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Set these values:
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
# save 60 10000

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### 5. Install PM2

```bash
sudo npm install -g pm2
```

---

## 🚀 Application Deployment

### 1. Upload Project Files

```bash
# Via SCP (from your local machine)
scp -r data-collecting root@your-vps-ip:/opt/

# Or via Git
cd /opt
git clone https://github.com/your-repo/data-collecting.git
cd data-collecting
```

### 2. Install Dependencies

```bash
cd /opt/data-collecting
npm install --production
```

### 3. Configure Environment

```bash
# Copy and edit .env file
cp .env.example .env
nano .env
```

Update configuration:

```env
# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883  # or your MQTT broker IP

# MongoDB
MONGODB_URI=mongodb://localhost:27017

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Workers
WORKER_HISTORY_INSTANCES=4
WORKER_REALTIME_INSTANCES=2
```

### 4. Create Logs Directory

```bash
mkdir -p /opt/data-collecting/logs
chmod 755 /opt/data-collecting/logs
```

### 5. Setup MongoDB Indexes

```bash
mongosh

use energy_db  # atau database name Anda

# Create indexes for realtime collection
db.realtime.createIndex({ "gatewayId": 1, "deviceId": 1 }, { unique: true })

# Create indexes for history collection
db.history.createIndex({ "timestamp": -1, "siteId": 1 })
db.history.createIndex({ "gatewayId": 1, "timestamp": -1 })

# Optional: Create time series collection
db.createCollection("meter_history", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  },
  expireAfterSeconds: 31536000
})

exit
```

### 6. Start Application with PM2

```bash
cd /opt/data-collecting

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Check status
pm2 status
pm2 logs iot-data-collector
```

---

## 🔧 MongoDB Production Configuration

Edit `/etc/mongod.conf`:

```yaml
# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # localhost only untuk keamanan

# Storage
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4  # 50% dari RAM
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

# Operation profiling
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

# Replication (optional, untuk HA)
# replication:
#   replSetName: "rs0"

# Security (RECOMMENDED for production)
# security:
#   authorization: enabled
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

### Create MongoDB User (Security)

```bash
mongosh

use admin

db.createUser({
  user: "dataCollector",
  pwd: "your-strong-password",
  roles: [
    { role: "readWrite", db: "energy_db" },
    { role: "readWrite", db: "iot_db" }
  ]
})

exit
```

Update `.env`:

```env
MONGODB_URI=mongodb://dataCollector:your-strong-password@localhost:27017
```

---

## 🔥 Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow MQTT (if MQTT broker on same server)
sudo ufw allow 1883/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📊 Monitoring Setup

### 1. PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
```

### 2. Log Rotation

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 3. System Monitoring Tools

```bash
# Install htop
sudo apt-get install -y htop

# Install iotop (I/O monitoring)
sudo apt-get install -y iotop

# Install netdata (Advanced monitoring)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

---

## 🔄 Maintenance Tasks

### Daily Checks

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs iot-data-collector --lines 100

# Check queue lengths
redis-cli
> LLEN queue:history
> LLEN queue:realtime
> LLEN queue:dead_letter
> exit
```

### Weekly Checks

```bash
# MongoDB stats
mongosh
> use energy_db
> db.stats()
> db.history.stats()
> exit

# Redis info
redis-cli INFO memory
redis-cli INFO stats
```

### Monthly Tasks

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Update Node.js dependencies (with caution)
cd /opt/data-collecting
npm outdated
npm update
pm2 restart iot-data-collector
```

---

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs iot-data-collector --err

# Check environment
cat /opt/data-collecting/.env

# Test connections manually
node -e "require('./src/database/mongodb').connect().then(() => console.log('OK')).catch(console.error)"
node -e "require('./src/database/redis').connect(); setTimeout(() => console.log('OK'), 1000)"
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart iot-data-collector

# Clear Redis queue if too large
redis-cli
> DEL queue:history
> DEL queue:realtime
```

### MongoDB Performance Issues

```bash
# Check slow queries
mongosh
> db.setProfilingLevel(2, { slowms: 100 })
> db.system.profile.find().limit(5).sort({ ts: -1 })

# Check current operations
> db.currentOp()

# Kill slow operation if needed
> db.killOp(<opid>)
```

---

## 🔐 Security Checklist

- [ ] MongoDB authentication enabled
- [ ] Redis password set (if exposed)
- [ ] Firewall configured (UFW)
- [ ] SSH key-based authentication
- [ ] Regular security updates
- [ ] Application user (non-root)
- [ ] Log monitoring enabled
- [ ] Backup strategy implemented

---

## 💾 Backup Strategy

### MongoDB Backup

```bash
# Create backup script
nano /opt/scripts/backup-mongodb.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump --out=$BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/scripts/backup-mongodb.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### Redis Backup

Redis RDB file: `/var/lib/redis/dump.rdb` (auto-saved)

```bash
# Manual save
redis-cli BGSAVE

# Copy backup
cp /var/lib/redis/dump.rdb /opt/backups/redis/dump_$(date +%Y%m%d).rdb
```

---

## 📞 Support

Untuk issue production, hubungi:
- DevOps Team
- Database Admin
- Application Developer
