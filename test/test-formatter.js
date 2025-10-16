const { removeKeyPrefixes, extractDeviceId } = require('../src/utils/message-formatter');

console.log('='.repeat(60));
console.log('Message Formatter Test');
console.log('='.repeat(60));

// Test case 1: INV_1_ prefix
const payload1 = {
  'INV_1_voltage': 220.5,
  'INV_1_current': 10.2,
  'INV_1_power': 2250,
  'INV_1_energy': 1250.5
};

console.log('\n📥 Original Payload (INV_1_):');
console.log(JSON.stringify(payload1, null, 2));

const cleaned1 = removeKeyPrefixes(payload1);
const deviceId1 = extractDeviceId(payload1);

console.log('\n📤 Cleaned Payload:');
console.log(JSON.stringify(cleaned1, null, 2));

console.log('\n🔍 Extracted Device ID:', deviceId1);

// Test case 2: CHINT_2_ prefix
const payload2 = {
  'CHINT_2_voltage_L1': 220,
  'CHINT_2_voltage_L2': 221,
  'CHINT_2_voltage_L3': 219,
  'CHINT_2_current_L1': 10,
  'CHINT_2_power_total': 6600
};

console.log('\n' + '='.repeat(60));
console.log('\n📥 Original Payload (CHINT_2_):');
console.log(JSON.stringify(payload2, null, 2));

const cleaned2 = removeKeyPrefixes(payload2);
const deviceId2 = extractDeviceId(payload2);

console.log('\n📤 Cleaned Payload:');
console.log(JSON.stringify(cleaned2, null, 2));

console.log('\n🔍 Extracted Device ID:', deviceId2);

// Test case 3: Mixed prefixes (should only remove first match)
const payload3 = {
  'INV_3_status': 'online',
  'INV_3_temperature': 45.5,
  'timestamp': 1697472000000
};

console.log('\n' + '='.repeat(60));
console.log('\n📥 Original Payload (Mixed):');
console.log(JSON.stringify(payload3, null, 2));

const cleaned3 = removeKeyPrefixes(payload3);
const deviceId3 = extractDeviceId(payload3);

console.log('\n📤 Cleaned Payload:');
console.log(JSON.stringify(cleaned3, null, 2));

console.log('\n🔍 Extracted Device ID:', deviceId3);

// Test case 4: Nested object
const payload4 = {
  'INV_4_basic': {
    'voltage': 220,
    'current': 10
  },
  'INV_4_advanced': {
    'power': 2200,
    'frequency': 50
  }
};

console.log('\n' + '='.repeat(60));
console.log('\n📥 Original Payload (Nested):');
console.log(JSON.stringify(payload4, null, 2));

const cleaned4 = removeKeyPrefixes(payload4);
const deviceId4 = extractDeviceId(payload4);

console.log('\n📤 Cleaned Payload:');
console.log(JSON.stringify(cleaned4, null, 2));

console.log('\n🔍 Extracted Device ID:', deviceId4);

// MongoDB Document Example
console.log('\n' + '='.repeat(60));
console.log('\n💾 Example MongoDB Document Format:');
console.log('='.repeat(60));

const exampleDoc = {
  _id: 'auto-generated-by-mongodb',
  topic: 'data/site001/realtime/energy_db/realtime_data/gateway001',
  message: cleaned1, // Cleaned payload
  lastUpdate: new Date(),
  processedAt: new Date(),
  receivedAt: new Date(),
  siteId: 'site001',
  deviceId: deviceId1,
  gatewayId: 'gateway001'
};

console.log(JSON.stringify(exampleDoc, null, 2));

console.log('\n' + '='.repeat(60));
console.log('✅ Test Complete!');
console.log('='.repeat(60));
