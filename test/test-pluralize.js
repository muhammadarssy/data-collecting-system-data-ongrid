const { pluralizeCollectionName } = require('../src/utils/message-formatter');

console.log('=================================');
console.log('Collection Name Pluralization Test');
console.log('=================================\n');

const testCases = [
  { input: 'harvest', expected: 'harvests' },
  { input: 'ehub', expected: 'ehubs' },
  { input: 'ehub1', expected: 'ehub1' },
  { input: 'ehub2', expected: 'ehub2' },
  { input: 'device', expected: 'devices' },
  { input: 'sensor', expected: 'sensors' },
  { input: 'gateway1', expected: 'gateway1' },
  { input: 'meter', expected: 'meters' },
  { input: 'inverter3', expected: 'inverter3' },
  { input: 'datalog', expected: 'datalogs' },
];

let passed = 0;
let failed = 0;

console.log('Testing pluralization rules:');
console.log('- If ends with digit → keep as is');
console.log('- If does not end with digit → add \'s\'\n');

testCases.forEach(({ input, expected }) => {
  const result = pluralizeCollectionName(input);
  const status = result === expected ? '✓' : '✗';
  
  if (result === expected) {
    passed++;
    console.log(`${status} ${input.padEnd(15)} → ${result.padEnd(15)} (Expected: ${expected})`);
  } else {
    failed++;
    console.log(`${status} ${input.padEnd(15)} → ${result.padEnd(15)} (Expected: ${expected}) ❌ FAILED`);
  }
});

console.log('\n=================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('=================================');

if (failed === 0) {
  console.log('✓ All tests passed!\n');
  process.exit(0);
} else {
  console.log('✗ Some tests failed!\n');
  process.exit(1);
}
