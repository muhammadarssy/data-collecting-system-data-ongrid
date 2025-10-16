# Quick Start Guide

## ⚡ Cara Cepat Mulai

### 1. Pastikan Service Berjalan

Sebelum menjalankan aplikasi, pastikan:

✅ **MongoDB** running di `localhost:27017`
✅ **Redis** running di `localhost:6379`
✅ **MQTT Broker** running di `localhost:1883` (atau sesuaikan di `.env`)

### 2. Edit Konfigurasi

Buka file `.env` dan sesuaikan:

```env
# Update dengan IP/URL service Anda
MQTT_BROKER_URL=mqtt://localhost:1883
MONGODB_URI=mongodb://localhost:27017
REDIS_HOST=localhost
```

### 3. Jalankan Aplikasi

```powershell
# Start semua service
npm start
```

Aplikasi akan menjalankan:
- ✓ MQTT Subscriber (1 instance)
- ✓ History Workers (4 instances)
- ✓ Realtime Workers (2 instances)
- ✓ System Monitor (1 instance)

### 4. Test dengan Data Dummy

Buka terminal baru:

```powershell
node test/mqtt-publisher.js
```

Ini akan mengirim test data ke MQTT broker setiap:
- 10 detik untuk realtime
- 5 menit untuk history

### 5. Monitor Status

Check logs:

```powershell
# Via file
Get-Content logs\app.log -Wait -Tail 50

# Atau lihat console output
```

Check Redis queue:

```powershell
redis-cli
> LLEN queue:history
> LLEN queue:realtime
> exit
```

Check MongoDB:

```powershell
mongosh
> use energy_db
> db.realtime_data.countDocuments()
> db.history_data.countDocuments()
> exit
```

---

## 🎯 Yang Terjadi di Background

### Flow:

1. **MQTT Publisher** (test) → kirim data ke MQTT Broker
2. **MQTT Subscriber** → terima data, push ke Redis Queue
3. **Workers** → ambil dari queue, batch process, insert/update MongoDB
4. **Monitor** → cek health setiap 30 detik

### Keuntungan Arsitektur Ini:

✅ **Tidak ada spike** ke MongoDB saat reconnect
✅ **Rate limiting** otomatis via Bottleneck
✅ **Batch processing** lebih efisien
✅ **Auto retry** via Dead Letter Queue
✅ **Monitoring** real-time queue & system health

---

## 📊 Expected Results

Setelah running beberapa menit, Anda akan lihat:

### Console Output:
```
[2024-01-15 10:30:15] info: MQTT Subscriber Stats: {"messagesReceived":{"realtime":6,"history":2,"total":8},"mqttConnected":true}
[2024-01-15 10:30:15] info: History Worker #1 Stats: {"processed":200,"errors":0,"running":true}
[2024-01-15 10:30:15] info: Realtime Worker #1 Stats: {"processed":50,"errors":0,"running":true}
```

### MongoDB:
```javascript
// Realtime collection - selalu updated (upsert)
db.realtime_data.find().pretty()

// History collection - terus bertambah (insert)
db.history_data.countDocuments()
```

### Redis Queue:
```
queue:history → 0 (processed langsung)
queue:realtime → 0 (processed langsung)
queue:dead_letter → 0 (no errors)
```

---

## 🛑 Stop Aplikasi

Tekan `Ctrl+C` di terminal yang menjalankan `npm start`

Aplikasi akan:
1. Stop menerima MQTT messages
2. Selesaikan processing queue yang ada
3. Close semua connections
4. Exit gracefully

---

## 🔄 Recovery Test

Untuk test recovery setelah offline:

1. **Stop workers** (tapi biarkan MQTT subscriber jalan)
   
2. **Kirim banyak data** menggunakan publisher
   
3. **Check Redis queue** - akan terus bertambah
   ```
   redis-cli
   > LLEN queue:history  # Harusnya terus naik
   ```

4. **Start workers lagi** - akan process queue dengan rate limiting
   
5. **Monitor** - queue akan turun perlahan, MongoDB tidak overload

---

## ❓ Troubleshooting Quick

### MQTT Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:1883
```
**Solution**: Install & start MQTT broker (Mosquitto):
```powershell
# Windows: Download dari https://mosquitto.org/download/
# Atau gunakan Docker:
docker run -d -p 1883:1883 eclipse-mosquitto
```

### MongoDB Connection Failed
```
MongoServerError: connect ECONNREFUSED
```
**Solution**: Start MongoDB service
```powershell
# Windows Service
net start MongoDB

# Atau Docker
docker run -d -p 27017:27017 mongo
```

### Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis service
```powershell
# Windows: Download dari https://github.com/microsoftarchive/redis/releases
# Atau Docker
docker run -d -p 6379:6379 redis
```

---

## 🎓 Next Steps

1. ✅ Test dengan real IoT Gateway
2. ✅ Adjust batch size & worker count sesuai load
3. ✅ Setup MongoDB indexes (lihat README.md)
4. ✅ Deploy ke production VPS (lihat DEPLOYMENT.md)
5. ✅ Setup monitoring & alerts
6. ✅ Configure backup strategy

---

**Selamat! Sistem IoT Data Collection Anda sudah siap! 🚀**
