# Collection Name Pluralization Examples

## 📚 Aturan Pluralisasi

### Rule 1: Collection name TANPA angka di akhir → Tambah 's'
```
harvest   → harvests
ehub      → ehubs
device    → devices
sensor    → sensors
meter     → meters
datalog   → datalogs
gateway   → gateways
inverter  → inverters
```

### Rule 2: Collection name DENGAN angka di akhir → Tetap
```
ehub1      → ehub1
ehub2      → ehub2
gateway1   → gateway1
inverter3  → inverter3
sensor5    → sensor5
device10   → device10
```

---

## 🔄 Flow Lengkap: MQTT Topic → MongoDB Collection

### Contoh 1: harvest (tanpa angka)

**Step 1: MQTT Topic**
```
data/site001/realtime/energy_db/harvest/gw001
                                  ^^^^^^^ 
                            original collection name
```

**Step 2: Parsing & Pluralisasi**
```javascript
rawCollection = "harvest"
collection = pluralizeCollectionName("harvest")
// collection = "harvests" ✓ (ditambah 's')
```

**Step 3: Stored in MongoDB**
```
Database: energy_db
Collection: harvests  ← Collection name sudah plural
```

---

### Contoh 2: ehub (tanpa angka)

**Step 1: MQTT Topic**
```
data/site001/realtime/energy_db/ehub/gw002
                                 ^^^^
                          original collection name
```

**Step 2: Parsing & Pluralisasi**
```javascript
rawCollection = "ehub"
collection = pluralizeCollectionName("ehub")
// collection = "ehubs" ✓ (ditambah 's')
```

**Step 3: Stored in MongoDB**
```
Database: energy_db
Collection: ehubs  ← Collection name sudah plural
```

---

### Contoh 3: ehub1 (dengan angka)

**Step 1: MQTT Topic**
```
data/site001/realtime/energy_db/ehub1/gw003
                                 ^^^^^
                          original collection name
```

**Step 2: Parsing & Pluralisasi**
```javascript
rawCollection = "ehub1"
collection = pluralizeCollectionName("ehub1")
// collection = "ehub1" ✓ (tetap, karena ada angka)
```

**Step 3: Stored in MongoDB**
```
Database: energy_db
Collection: ehub1  ← Collection name tetap sama
```

---

### Contoh 4: gateway1 (dengan angka)

**Step 1: MQTT Topic**
```
data/site002/history/monitoring_db/gateway1/gw004
                                    ^^^^^^^^
                             original collection name
```

**Step 2: Parsing & Pluralisasi**
```javascript
rawCollection = "gateway1"
collection = pluralizeCollectionName("gateway1")
// collection = "gateway1" ✓ (tetap, karena ada angka)
```

**Step 3: Stored in MongoDB**
```
Database: monitoring_db
Collection: gateway1  ← Collection name tetap sama
```

---

## 📊 Tabel Mapping Lengkap

| MQTT Topic Collection | Last Character | Rule Applied | MongoDB Collection |
|----------------------|----------------|--------------|-------------------|
| `harvest` | `t` (letter) | Add 's' | `harvests` |
| `ehub` | `b` (letter) | Add 's' | `ehubs` |
| `ehub1` | `1` (digit) | Keep as is | `ehub1` |
| `ehub2` | `2` (digit) | Keep as is | `ehub2` |
| `device` | `e` (letter) | Add 's' | `devices` |
| `sensor` | `r` (letter) | Add 's' | `sensors` |
| `gateway1` | `1` (digit) | Keep as is | `gateway1` |
| `meter` | `r` (letter) | Add 's' | `meters` |
| `inverter3` | `3` (digit) | Keep as is | `inverter3` |
| `datalog` | `g` (letter) | Add 's' | `datalogs` |

---

## 💡 Tips & Best Practices

### ✅ Recommended Naming Conventions

**For Multiple Similar Devices (Use Digits):**
```
ehub1, ehub2, ehub3      → Stored as: ehub1, ehub2, ehub3
gateway1, gateway2       → Stored as: gateway1, gateway2
inverter1, inverter2     → Stored as: inverter1, inverter2
```

**For Device Types (Without Digits):**
```
harvest                  → Stored as: harvests
ehub                     → Stored as: ehubs
sensor                   → Stored as: sensors
meter                    → Stored as: meters
```

### ⚠️ Avoid Confusion

**JANGAN:**
```
harvests  ← Jangan tambah 's' manual di topic
ehubs     ← Jangan tambah 's' manual di topic
```
Topic harus tetap singular, sistem akan otomatis pluralize.

**LAKUKAN:**
```
harvest   ← Topic singular, sistem pluralize jadi 'harvests'
ehub      ← Topic singular, sistem pluralize jadi 'ehubs'
ehub1     ← Topic dengan angka, tetap 'ehub1'
```

---

## 🧪 Testing

Test dengan berbagai nama collection:

```powershell
npm run test:pluralize
```

Atau test manual:
```javascript
const { pluralizeCollectionName } = require('./src/utils/message-formatter');

console.log(pluralizeCollectionName('harvest'));    // harvests
console.log(pluralizeCollectionName('ehub'));       // ehubs
console.log(pluralizeCollectionName('ehub1'));      // ehub1
console.log(pluralizeCollectionName('gateway1'));   // gateway1
console.log(pluralizeCollectionName('sensor'));     // sensors
```

---

## 🎯 Kesimpulan

- **Collection dengan ANGKA di akhir**: Tetap apa adanya (tidak dijamakkan)
- **Collection TANPA ANGKA di akhir**: Ditambah 's' (dijamakkan)
- **Otomatis**: Tidak perlu konfigurasi tambahan
- **Konsisten**: Aturan sama untuk semua topic
- **Transparan**: Original topic name tetap disimpan di document MongoDB

