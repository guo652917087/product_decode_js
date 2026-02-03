#!/usr/bin/env node
/**
 * Test suite for ChirpStack unified codec
 * Run with: node test_codec.js
 */

// Load the codec
const fs = require('fs');
const path = require('path');

const codecPath = path.join(__dirname, 'chirpstack_codec.js');
const codecCode = fs.readFileSync(codecPath, 'utf8');

// Execute codec to get functions
eval(codecCode);

// Test counter
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('✓', message);
    passed++;
  } else {
    console.log('✗', message);
    failed++;
  }
}

function testUplink(name, input, expectedFields) {
  console.log(`\nTest: ${name}`);
  try {
    const result = decodeUplink(input);
    console.log('Input:', input);
    console.log('Output:', JSON.stringify(result, null, 2));
    
    // Check no errors
    assert(result.errors.length === 0, 'No errors');
    
    // Check expected fields
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      if (typeof expectedValue === 'number') {
        const actual = result.data[field];
        const tolerance = Math.abs(expectedValue * 0.01) || 0.01;
        assert(
          Math.abs(actual - expectedValue) < tolerance,
          `${field}: ${actual} ≈ ${expectedValue}`
        );
      } else {
        assert(
          result.data[field] === expectedValue,
          `${field}: ${result.data[field]} === ${expectedValue}`
        );
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    failed++;
  }
}

function testDownlink(name, input, expectedFPort, minByteLength) {
  console.log(`\nTest: ${name}`);
  try {
    const result = encodeDownlink(input);
    console.log('Input:', input);
    console.log('Output:', JSON.stringify(result, null, 2));
    console.log('Bytes (hex):', result.bytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Check no errors
    assert(result.errors.length === 0, 'No errors');
    
    // Check fPort
    assert(result.fPort === expectedFPort, `fPort: ${result.fPort} === ${expectedFPort}`);
    
    // Check byte length
    if (minByteLength !== undefined) {
      assert(
        result.bytes.length >= minByteLength,
        `Byte length: ${result.bytes.length} >= ${minByteLength}`
      );
    }
  } catch (error) {
    console.error('Error:', error.message);
    failed++;
  }
}

console.log('=' .repeat(60));
console.log('ChirpStack Unified Codec Test Suite');
console.log('=' .repeat(60));

// ============================================================
// UPLINK TESTS
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('UPLINK DECODING TESTS');
console.log('='.repeat(60));

// Test 1: AN-303 Temperature & Humidity Sensor
testUplink('AN-303 Temperature & Humidity', {
  bytes: [0x00, 0x01, 0x03, 0x10, 0x0A, 0x3C, 0x12, 0x01, 0xF4],
  fPort: 210
}, {
  model: 'AN-303',
  temperature: 26.20,
  humidity: 50.0
});

// Test 2: Battery-powered device with low battery
testUplink('Device with Battery Info', {
  bytes: [0x00, 0x01, 0x24, 0x04, 0x0C, 0x1C, 0x7d, 0x01],
  fPort: 210
}, {
  model: 'AN-305A',
  batteryVoltage: 3.100,
  batteryVoltageState: 1
});

// Test 3: W8004 Thermostat with Modbus data
testUplink('W8004 Thermostat Status', {
  bytes: [
    0x00, 0x01, 0x46, // Model: W8004
    0x94, 0x01,        // RS485 address: 1
    0x95, 0x0C,        // Modbus data, 12 bytes
    0x00, 0x00,        // Block start
    0x00, 0x00,        // Register 0x0000: version
    0x00, 0x00,        // Register 0x0001: status (power on)
    0x0A, 0x3C,        // Register 0x0002: temperature 26.20°C
    0x13, 0x88,        // Register 0x0003: humidity 50.0% (5000)
    0x09, 0xC4,        // Register 0x0004: setTemp 25.0°C
  ],
  fPort: 210
}, {
  model: 'W8004',
  rs485Addr: 1,
  powerState: 1,
  temperature: 26.20,
  humidity: 50.0,
  setTemperature: 25.00
});

// Test 4: DS-501 Smart Socket
testUplink('DS-501 Smart Socket', {
  bytes: [
    0x00, 0x01, 0x48,           // Model: DS-501
    0x22, 0x01,                 // Relay on
    0x96, 0x00,                 // Unlocked
    0x97, 0x08, 0xFC,           // Voltage: 229.6V
    0x98, 0x00, 0x46,           // Current: 0.70A
    0x99, 0x00, 0x64,           // Power: 1.00W
    0x9a, 0x00, 0x00, 0x03, 0xE8 // Energy: 10.00kWh
  ],
  fPort: 210
}, {
  model: 'DS-501',
  powerState: 1,
  lockState: 0,
  voltage: 229.6,
  current: 0.70,
  activePower: 1.00,
  energy: 10.00
});

// Test 5: AN-301 SOS Button
testUplink('AN-301 SOS Event', {
  bytes: [
    0x00, 0x01, 0x01,  // Model: AN-301
    0x14, 0x01,        // SOS event
    0x04, 0x0B, 0xB8,  // Battery: 3.0V
    0x77, 0x00         // No tamper
  ],
  fPort: 210
}, {
  model: 'AN-301',
  sosEvent: 1,
  batteryVoltage: 3.000,
  tamper: 0
});

// Test 6: Version information
testUplink('Device with Version Strings', {
  bytes: [
    0x00, 0x01, 0x03,                    // Model
    0x07, 0x31, 0x2E, 0x30, 0x2E, 0x30, 0x00, // Main: "1.0.0"
    0x08, 0x31, 0x2E, 0x32, 0x00,        // App: "1.2"
    0x09, 0x56, 0x31, 0x00               // HW: "V1"
  ],
  fPort: 210
}, {
  model: 'AN-303',
  mainVersion: '1.0.0',
  appVersion: '1.2',
  hardwareVersion: 'V1'
});

// ============================================================
// DOWNLINK TESTS
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('DOWNLINK ENCODING TESTS');
console.log('='.repeat(60));

// Test 7: AT+REBOOT command
testDownlink('AT+REBOOT Command', {
  data: {
    at: 'AT+REBOOT'
  }
}, 220, 12);

// Test 8: AT+HBTPKTTIMS with reboot
testDownlink('Set Heartbeat Interval', {
  data: {
    at: ['AT+HBTPKTTIMS=3600', 'AT+REBOOT']
  }
}, 220, 20);

// Test 9: DS-501 Power On
testDownlink('DS-501 Power On', {
  data: {
    model: 'DS-501',
    powerState: 1
  }
}, 2, 4);

// Test 10: DS-501 Lock
testDownlink('DS-501 Lock Command', {
  data: {
    model: 'DS-501',
    command: 'lock'
  }
}, 2, 3);

// Test 11: W8004 Set Temperature
testDownlink('W8004 Set Temperature', {
  data: {
    setTemperature: 25.5
  }
}, 2, 6);

// Test 12: W8004 Set Work Mode
testDownlink('W8004 Set Work Mode', {
  data: {
    workMode: 1  // Cooling
  }
}, 2, 6);

// Test 13: W8004 Set Fan Speed
testDownlink('W8004 Set Fan Speed', {
  data: {
    fanSpeed: 2  // Medium
  }
}, 2, 6);

// Test 14: Generic Power Control
testDownlink('Generic Power Off', {
  data: {
    powerState: 0
  }
}, 2, 2);

// Test 15: Serial Passthrough (byte array)
testDownlink('Serial Passthrough with Byte Array', {
  data: {
    serialPassthrough: [0x01, 0x10, 0x00, 0x04, 0x00, 0x03, 0x06, 0x09, 0xC4, 0x00, 0x01, 0x00, 0x01, 0xC6, 0x1D]
  }
}, 220, 16);

// Test 16: Serial Passthrough (hex string)
testDownlink('Serial Passthrough with Hex String', {
  data: {
    serialPassthrough: '01 10 00 04 00 03 06 09 C4 00 01 00 01 C6 1D'
  }
}, 220, 16);

// Test 17: Modbus Raw (byte array)
testDownlink('Modbus Raw with Byte Array', {
  data: {
    modbusRaw: [0x01, 0x10, 0x00, 0x04, 0x00, 0x03, 0x06, 0x09, 0xC4, 0x00, 0x01, 0x00, 0x01, 0xC6, 0x1D]
  }
}, 2, 16);

// Test 18: Modbus Hex
testDownlink('Modbus Hex String', {
  data: {
    modbusHex: '0110000400030609C4000100 01C61D'
  }
}, 2, 16);

// Test 19: W8004 Multi-Attribute (consecutive registers)
testDownlink('W8004 Multi-Attribute Control', {
  data: {
    model: 'W8004',
    setTemperature: 25.0,
    workMode: 1,
    fanSpeed: 1
  }
}, 2, 10);

// ============================================================
// SUMMARY
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed!');
  process.exit(1);
}
