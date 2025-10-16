const mqtt = require('mqtt');

// Configuration
const config = {
  broker: 'mqtt://localhost:1883',
  topics: {
    realtime: 'data/site001/realtime/energy_db/realtime_data/gateway001',
    history: 'data/site001/history/energy_db/history_data/gateway001'
  }
};

// Connect to MQTT
const client = mqtt.connect(config.broker);

let messageCount = 0;

client.on('connect', () => {
  console.log('✓ Connected to MQTT Broker');
  console.log('Starting to send test messages...\n');

  // Send realtime data every 10 seconds
  setInterval(() => {
    sendRealtimeData();
  }, 10000);

  // Send history data every 5 minutes
  setInterval(() => {
    sendHistoryData('5min');
  }, 300000);

  // Send history data every 1 hour
  setInterval(() => {
    sendHistoryData('1hour');
  }, 3600000);

  // Send initial batch
  sendRealtimeData();
  sendHistoryData('5min');
});

function sendRealtimeData() {
  const devicePrefixes = ['INV_1_', 'INV_2_', 'CHINT_1_', 'CHINT_2_'];
  const randomPrefix = devicePrefixes[Math.floor(Math.random() * devicePrefixes.length)];
  
  const payload = {
    [`${randomPrefix}voltage`]: 220 + (Math.random() * 10 - 5),
    [`${randomPrefix}current`]: 10 + (Math.random() * 2 - 1),
    [`${randomPrefix}power`]: 2200 + (Math.random() * 200 - 100),
    [`${randomPrefix}frequency`]: 50 + (Math.random() * 0.5 - 0.25),
    [`${randomPrefix}powerFactor`]: 0.95 + (Math.random() * 0.1 - 0.05),
    [`${randomPrefix}temperature`]: 35 + (Math.random() * 10),
    timestamp: new Date().toISOString()
  };

  client.publish(config.topics.realtime, JSON.stringify(payload), { qos: 1 });
  messageCount++;
  
  console.log(`[${new Date().toISOString()}] REALTIME #${messageCount} [${randomPrefix.slice(0, -1)}]`);
  console.log(`  → Voltage: ${payload[`${randomPrefix}voltage`].toFixed(2)}V`);
  console.log(`  → Power: ${payload[`${randomPrefix}power`].toFixed(2)}W\n`);
}

function sendHistoryData(interval) {
  const devicePrefixes = ['INV_1_', 'INV_2_', 'INV_3_', 'INV_4_'];
  const randomPrefix = devicePrefixes[Math.floor(Math.random() * devicePrefixes.length)];
  
  const payload = {
    [`${randomPrefix}voltage_avg`]: 220 + (Math.random() * 5 - 2.5),
    [`${randomPrefix}voltage_min`]: 215 + (Math.random() * 3),
    [`${randomPrefix}voltage_max`]: 225 + (Math.random() * 3),
    [`${randomPrefix}current_avg`]: 10 + (Math.random() * 1 - 0.5),
    [`${randomPrefix}power_avg`]: 2200 + (Math.random() * 100 - 50),
    [`${randomPrefix}energy`]: 1250 + (Math.random() * 50),
    [`${randomPrefix}energyConsumed`]: 12.5 + (Math.random() * 2),
    interval: interval,
    timestamp: new Date().toISOString()
  };

  client.publish(config.topics.history, JSON.stringify(payload), { qos: 1 });
  messageCount++;
  
  console.log(`[${new Date().toISOString()}] HISTORY (${interval}) #${messageCount} [${randomPrefix.slice(0, -1)}]`);
  console.log(`  → Energy: ${payload[`${randomPrefix}energy`].toFixed(2)}kWh`);
  console.log(`  → Consumed: ${payload[`${randomPrefix}energyConsumed`].toFixed(2)}kWh\n`);
}

client.on('error', (error) => {
  console.error('✗ MQTT Error:', error.message);
});

client.on('offline', () => {
  console.warn('⚠ MQTT Client Offline');
});

client.on('reconnect', () => {
  console.log('↻ Reconnecting to MQTT...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  console.log(`Total messages sent: ${messageCount}`);
  client.end();
  process.exit(0);
});

console.log('='.repeat(60));
console.log('MQTT Test Data Publisher');
console.log('='.repeat(60));
console.log('Broker:', config.broker);
console.log('Topics:');
console.log('  - Realtime:', config.topics.realtime);
console.log('  - History:', config.topics.history);
console.log('='.repeat(60));
console.log('\nPress Ctrl+C to stop\n');
