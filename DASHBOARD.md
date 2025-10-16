# 🏥 Health Monitor Dashboard

## Overview

Web-based dashboard untuk monitoring real-time kondisi dan status koneksi sistem IoT Data Collection.

## Features

✅ **Real-time Monitoring** - Auto-refresh setiap 5 detik
✅ **Queue Status** - Monitor panjang queue realtime, history, dan dead letter
✅ **MongoDB Health** - Connection status, response time, operations count
✅ **Redis Health** - Connection status, memory usage, ops/sec
✅ **System Stats** - Uptime, memory usage, Node.js version
✅ **Queue Management** - Clear queue dengan satu klik
✅ **Visual Indicators** - Status badges dan progress bars
✅ **Responsive Design** - Mobile-friendly interface

## Access Dashboard

### URL
```
http://localhost:3000
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard HTML |
| `/api/health` | GET | All health stats (JSON) |
| `/api/queues` | GET | Queue stats only |
| `/api/mongodb` | GET | MongoDB stats only |
| `/api/redis` | GET | Redis stats only |
| `/api/queue/clear/:queueName` | POST | Clear specific queue |

## Running Dashboard

### Standalone

```powershell
npm run dashboard
```

Dashboard will start on port 3000 (or configured port).

### With Full System

```powershell
npm start
```

Dashboard akan otomatis start bersama services lainnya.

### Custom Port

Edit `.env`:
```env
DASHBOARD_PORT=8080
```

## Dashboard Sections

### 1. Queue Monitoring

**Realtime Queue:**
- Current queue length
- Threshold limit
- Status (OK/WARNING)
- Progress bar visualization
- Clear queue button

**History Queue:**
- Current queue length
- Threshold limit  
- Status (OK/WARNING)
- Progress bar visualization
- Clear queue button

**Dead Letter Queue:**
- Failed messages count
- Status indicator
- Clear queue button

### 2. MongoDB Status

**Metrics:**
- Connection Status (CONNECTED/DISCONNECTED/ERROR)
- Response Time (ms)
- Current/Available Connections
- Insert Operations Count
- Update Operations Count
- Memory Usage (Resident/Virtual)

**Visual Indicators:**
- 🟢 Green badge: Connected
- 🔴 Red badge: Disconnected
- 🟡 Yellow badge: Error

### 3. Redis Status

**Metrics:**
- Connection Status
- Response Time (ms)
- Connected Clients
- Memory Used
- Operations per Second
- Total Commands Processed

**Visual Indicators:**
- 🟢 Green badge: Connected
- 🔴 Red badge: Disconnected
- 🟡 Yellow badge: Error

### 4. System Information

**Metrics:**
- System Uptime (formatted)
- Node.js Version
- Memory Usage (Heap)
- Platform (OS)

## Status Indicators

### Queue Status

| Status | Color | Meaning |
|--------|-------|---------|
| OK | 🟢 Green | Queue length normal (< threshold) |
| WARNING | 🟡 Yellow | Queue length high (> threshold) |

### Connection Status

| Status | Color | Meaning |
|--------|-------|---------|
| CONNECTED | 🟢 Green | Service connected and responsive |
| DISCONNECTED | ⚫ Gray | Service not connected |
| ERROR | 🔴 Red | Connection error occurred |

## Queue Management

### Clear Queue

1. Click "Clear Queue" button on queue card
2. Confirm action in popup
3. Queue will be cleared immediately
4. Dashboard will auto-refresh

**Available Actions:**
- Clear Realtime Queue
- Clear History Queue
- Clear Dead Letter Queue

**⚠️ Warning:** Clearing queue will **permanently delete** all messages in that queue!

## Auto-Refresh

Dashboard automatically refreshes data every **5 seconds**.

Last update timestamp shown in header:
```
Last update: 10:30:15 AM
```

## API Usage Examples

### Get All Health Stats

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" | ConvertTo-Json

# curl
curl http://localhost:3000/api/health
```

### Get Queue Stats Only

```powershell
curl http://localhost:3000/api/queues
```

### Clear Queue via API

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/queue/clear/queue:realtime" -Method POST

# curl
curl -X POST http://localhost:3000/api/queue/clear/queue:realtime
```

## Response Format

### Health API Response

```json
{
  "success": true,
  "data": {
    "queues": {
      "realtime": {
        "name": "queue:realtime",
        "length": 150,
        "threshold": 10000,
        "status": "OK",
        "percentage": 1.5
      },
      "history": {
        "name": "queue:history",
        "length": 5200,
        "threshold": 50000,
        "status": "OK",
        "percentage": 10.4
      },
      "deadLetter": {
        "name": "queue:dead_letter",
        "length": 0,
        "status": "OK"
      }
    },
    "mongodb": {
      "status": "CONNECTED",
      "responseTime": 15,
      "connections": {
        "current": 12,
        "available": 838
      },
      "opcounters": {
        "insert": 125000,
        "update": 35000
      }
    },
    "redis": {
      "status": "CONNECTED",
      "responseTime": 2,
      "memory": {
        "used": "2.5M",
        "peak": "3.2M"
      },
      "clients": {
        "connected": 5
      },
      "stats": {
        "opsPerSec": 150
      }
    },
    "system": {
      "uptime": 3600,
      "uptimeFormatted": "1h",
      "nodeVersion": "v18.17.0",
      "platform": "win32"
    },
    "lastUpdate": "2024-01-15T10:30:15.000Z"
  },
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

## Configuration

### Environment Variables

```env
# Dashboard port
DASHBOARD_PORT=3000

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue thresholds (for alerts)
QUEUE_ALERT_THRESHOLD_HISTORY=50000
QUEUE_ALERT_THRESHOLD_REALTIME=10000
```

## Troubleshooting

### Dashboard Won't Start

**Error:** `Port 3000 already in use`

**Solution:**
```env
# Change port in .env
DASHBOARD_PORT=8080
```

### Can't Connect to MongoDB/Redis

**Check Services:**
```powershell
# MongoDB
mongosh --eval "db.adminCommand('ping')"

# Redis
redis-cli ping
```

**Check .env Configuration:**
```env
MONGODB_URI=mongodb://localhost:27017
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Dashboard Shows All Disconnected

**Possible Causes:**
1. MongoDB not running
2. Redis not running
3. Wrong connection strings in `.env`

**Solution:**
```powershell
# Start services
docker-compose up -d

# Or start individually
npm run dashboard
```

## Screenshots

### Main Dashboard
- Queue cards with progress bars
- Connection status badges
- Real-time metrics

### Queue Warning State
- Yellow status badge when queue > threshold
- Red progress bar
- Clear queue action available

### Connection Error State
- Red status badge
- Error message displayed
- Retry automatic on next refresh

## Security Notes

⚠️ **Production Deployment:**

1. **Add Authentication**
   - Implement login system
   - Use JWT tokens
   - Role-based access control

2. **Secure API Endpoints**
   - Rate limiting
   - API key authentication
   - HTTPS only

3. **Restrict Clear Queue Action**
   - Admin role only
   - Audit logging
   - Confirmation required

## Development

### File Structure

```
src/dashboard/
├── server.js           # Express server & API
└── public/
    └── dashboard.html  # Frontend UI
```

### Customize Dashboard

**Change Refresh Interval:**

Edit `dashboard.html`:
```javascript
// Change from 5000ms (5 sec) to 10000ms (10 sec)
refreshInterval = setInterval(fetchHealth, 10000);
```

**Add New Metrics:**

1. Add metric to `server.js` stats
2. Add HTML element in `dashboard.html`
3. Update `updateDashboard()` function

## Integration with PM2

Dashboard included in PM2 ecosystem:

```javascript
// ecosystem.config.js already configured
pm2 start ecosystem.config.js
```

Check dashboard status:
```powershell
pm2 status
```

## Support

- Health Dashboard Documentation: This file
- System Documentation: `README.md`
- API Reference: `/api/health` endpoint
- Issues: Check logs in `logs/app.log`

---

**Dashboard is ready to use! 🚀**

Access at: http://localhost:3000
