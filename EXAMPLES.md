# ChirpStack Codec Usage Examples

This document provides practical examples for using the unified ChirpStack codec.

## Table of Contents
- [Uplink Examples](#uplink-examples)
- [Downlink Examples](#downlink-examples)
- [Device-Specific Examples](#device-specific-examples)
- [Integration Examples](#integration-examples)

## Uplink Examples

### Example 1: Simple Temperature Sensor (AN-303)

**Payload (hex)**: `00 01 03 10 0A 3C 12 01 F4`

**Decoded Result**:
```json
{
  "data": {
    "model": "AN-303",
    "temperature": 26.20,
    "humidity": 50.0
  },
  "errors": [],
  "warnings": []
}
```

**Mapping to Modbus**:
- Register 406: Temperature = 2620 (°C × 100)
- Register 408: Humidity = 500 (%RH × 10)

**Mapping to BACnet** (device bacnet_id = 101):
- Object 10113 (AI): Temperature = 26.20
- Object 10115 (AI): Humidity = 50.0

---

### Example 2: Battery-Powered Door Sensor (AN-305A)

**Payload (hex)**: `00 01 24 18 01 04 0C 1C 7D 00`

**Decoded Result**:
```json
{
  "data": {
    "model": "AN-305A",
    "doorState": 1,
    "batteryVoltage": 3.100,
    "batteryVoltageState": 0
  },
  "errors": [],
  "warnings": []
}
```

**Modbus Registers**:
- 0: doorState = 1 (open)
- 403: batteryVoltage = 310 (V × 100)
- 404: batteryVoltageState = 0 (normal)

---

### Example 3: Emergency Button with SOS Event (AN-301)

**Payload (hex)**: `00 01 01 14 01 04 0B B8 77 00`

**Decoded Result**:
```json
{
  "data": {
    "model": "AN-301",
    "sosEvent": 1,
    "batteryVoltage": 3.000,
    "tamper": 0
  },
  "errors": [],
  "warnings": []
}
```

**Alert Handling**:
```javascript
if (decoded.data.sosEvent === 1) {
  // Trigger emergency alert
  sendAlert({
    type: "emergency",
    device: decoded.data.model,
    timestamp: Date.now()
  });
}
```

---

### Example 4: Smart Socket with Power Monitoring (DS-501)

**Payload (hex)**: `00 01 48 22 01 97 08 FC 98 00 46 99 00 64 9A 00 00 03 E8`

**Decoded Result**:
```json
{
  "data": {
    "model": "DS-501",
    "powerState": 1,
    "voltage": 230.0,
    "current": 0.70,
    "activePower": 1.00,
    "energy": 10.00
  },
  "errors": [],
  "warnings": []
}
```

**Energy Monitoring Dashboard**:
```javascript
const powerUsage = {
  voltage: decoded.data.voltage,      // 230V
  current: decoded.data.current,      // 0.7A
  power: decoded.data.activePower,    // 1W
  totalEnergy: decoded.data.energy    // 10 kWh
};
```

---

### Example 5: Thermostat with Full Status (W8004)

**Payload (hex)**: `00 01 46 94 01 95 0E 00 00 00 00 00 00 0A 3C 13 88 09 C4 00 01 00 02`

**Decoded Result**:
```json
{
  "data": {
    "model": "W8004",
    "rs485Addr": 1,
    "powerState": 1,
    "keyLockState": 0,
    "valveState": 1,
    "temperature": 26.20,
    "humidity": 50.0,
    "setTemperature": 25.00,
    "workMode": 1,
    "fanSpeed": 2
  },
  "errors": [],
  "warnings": []
}
```

**HVAC Dashboard**:
```javascript
const hvacStatus = {
  currentTemp: decoded.data.temperature,
  targetTemp: decoded.data.setTemperature,
  mode: ["auto", "cool", "heat", "vent"][decoded.data.workMode],
  fanSpeed: ["off", "low", "mid", "high", "auto"][decoded.data.fanSpeed],
  isOn: decoded.data.powerState === 1,
  valveOpen: decoded.data.valveState === 1
};
```

---

## Downlink Examples

### Example 1: Reboot Device

**Command**:
```json
{
  "data": {
    "at": "AT+REBOOT"
  }
}
```

**Encoded Result**:
```json
{
  "bytes": [255, 65, 84, 43, 82, 69, 66, 79, 79, 84, 13, 10],
  "fPort": 220
}
```

**Hex**: `FF 41 54 2B 52 45 42 4F 4F 54 0D 0A`

---

### Example 2: Set Heartbeat Interval

**Command**:
```json
{
  "data": {
    "at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]
  }
}
```

**Notes**: 
- Sets heartbeat to 3600 seconds (1 hour)
- Reboot command placed last to apply settings

**Encoded Result**:
```json
{
  "bytes": [255, 65, 84, ...],
  "fPort": 220
}
```

**Hex**: `FF 41 54 2B 48 42 54 50 4B 54 54 49 4D 53 3D 33 36 30 30 0D 0A 41 54 2B 52 45 42 4F 4F 54 0D 0A`

---

### Example 3: Control DS-501 Socket (Power On)

**Command**:
```json
{
  "data": {
    "model": "DS-501",
    "powerState": 1
  }
}
```

**Encoded Result**:
```json
{
  "bytes": [9, 72, 1, 1],
  "fPort": 2
}
```

**Hex**: `09 48 01 01`

---

### Example 4: Lock DS-501 Socket

**Command**:
```json
{
  "data": {
    "model": "DS-501",
    "lockState": 1
  }
}
```

**Or using command**:
```json
{
  "data": {
    "model": "DS-501",
    "command": "lock"
  }
}
```

**Encoded Result**:
```json
{
  "bytes": [9, 72, 3],
  "fPort": 2
}
```

---

### Example 5: W8004 Set Temperature

**Command**:
```json
{
  "data": {
    "setTemperature": 25.5
  }
}
```

**Encoded Result**:
```json
{
  "bytes": [6, 6, 0, 4, 9, 246],
  "fPort": 2
}
```

**Explanation**:
- Command: 0x06 (Modbus write single register)
- Function: 0x06
- Register: 0x0004 (setTemperature)
- Value: 0x09F6 (2550 = 25.5°C × 100)

---

### Example 6: W8004 Set Work Mode (Cooling)

**Command**:
```json
{
  "data": {
    "workMode": 1
  }
}
```

**Work Modes**:
- 0 = Auto
- 1 = Cool
- 2 = Heat
- 3 = Vent

**Encoded Result**:
```json
{
  "bytes": [6, 6, 0, 5, 0, 1],
  "fPort": 2
}
```

---

### Example 7: W8004 Set Fan Speed (Medium)

**Command**:
```json
{
  "data": {
    "fanSpeed": 2
  }
}
```

**Fan Speeds**:
- 0 = Off
- 1 = Low
- 2 = Medium
- 3 = High
- 4 = Auto

**Encoded Result**:
```json
{
  "bytes": [6, 6, 0, 6, 0, 2],
  "fPort": 2
}
```

---

## Device-Specific Examples

### W8004 Thermostat Complete Control

**Scenario**: Set up thermostat for cooling mode at 24°C with medium fan speed

**Step 1**: Set temperature
```json
{"data": {"setTemperature": 24.0}}
```

**Step 2**: Set cooling mode
```json
{"data": {"workMode": 1}}
```

**Step 3**: Set fan to medium
```json
{"data": {"fanSpeed": 2}}
```

**Step 4**: Power on (if needed)
```json
{"data": {"powerState": 1}}
```

---

### DS-501 Smart Socket Scheduling

**Scenario**: Turn on socket at specific time, then turn off after 2 hours

**Immediate Turn On**:
```json
{
  "data": {
    "model": "DS-501",
    "command": "immediate_on"
  }
}
```

**Scheduled Turn Off** (after 2 hours = 7200 seconds):
```json
{
  "data": {
    "model": "DS-501",
    "command": "delay_off",
    "delaySeconds": 7200
  }
}
```

---

### AN-303 Sensor Configuration

**Set Heartbeat to 1 Hour and Reboot**:
```json
{
  "data": {
    "at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]
  }
}
```

**Query Device Information**:
```json
{
  "data": {
    "at": "AT+VERSION?"
  }
}
```

Expected response in next uplink (type 0x0F):
```json
{
  "data": {
    "atResponse": "1.0.0"
  }
}
```

---

## Integration Examples

### Example 1: Modbus TCP Read

**Scenario**: Read temperature from W8004 using Modbus Poll

```
Modbus Address: 192.168.1.100:502
Slave ID: 2
Function: 03 (Read Holding Registers)
Start Address: 406
Quantity: 1
```

**Response**: `0A 3C` (2620)  
**Value**: 2620 ÷ 100 = 26.20°C

---

### Example 2: Modbus TCP Write

**Scenario**: Set W8004 temperature to 25°C using Modbus Poll

```
Modbus Address: 192.168.1.100:502
Slave ID: 2
Function: 06 (Write Single Register)
Start Address: 252
Value: 2500 (25.0°C × 100)
```

**Result**: Device receives downlink command to set temperature

---

### Example 3: BACnet Read

**Scenario**: Read temperature from W8004 using YABE (device bacnet_id = 101)

```
Device: 101
Object: Analog Input 10113
Property: Present Value
```

**Response**: 26.20°C

---

### Example 4: BACnet Write

**Scenario**: Set W8004 temperature to 25.5°C using YABE (device bacnet_id = 101)

```
Device: 101
Object: Analog Value 10109
Property: Present Value
Value: 25.5
```

**Result**: BACnet write triggers LoRaWAN downlink command

---

### Example 5: Node-RED Integration

```javascript
// In a Node-RED function node
const decoded = msg.payload;

// Temperature alert
if (decoded.data.temperature > 30) {
  msg.payload = {
    alert: "High temperature warning",
    device: decoded.data.model,
    value: decoded.data.temperature
  };
  return [msg, null];
}

// Battery alert
if (decoded.data.batteryVoltageState === 1) {
  msg.payload = {
    alert: "Low battery warning",
    device: decoded.data.model,
    voltage: decoded.data.batteryVoltage
  };
  return [null, msg];
}

return [null, null];
```

---

### Example 6: MQTT Integration

**Publish uplink to MQTT**:
```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

// On uplink from ChirpStack
client.publish('sensors/temperature', JSON.stringify({
  device: decoded.data.model,
  temperature: decoded.data.temperature,
  humidity: decoded.data.humidity,
  timestamp: Date.now()
}));
```

**Subscribe for control commands**:
```javascript
client.subscribe('control/thermostat');

client.on('message', (topic, message) => {
  const cmd = JSON.parse(message);
  
  // Send downlink to ChirpStack
  sendDownlink({
    data: {
      setTemperature: cmd.targetTemp,
      workMode: cmd.mode,
      fanSpeed: cmd.fanSpeed
    }
  });
});
```

---

## Best Practices

### 1. Always Use Numeric Values

❌ **Wrong**:
```json
{"data": {"powerState": "on"}}
```

✅ **Correct**:
```json
{"data": {"powerState": 1}}
```

### 2. AT Commands with Settings

❌ **Wrong** (reboot first):
```json
{"data": {"at": ["AT+REBOOT", "AT+HBTPKTTIMS=3600"]}}
```

✅ **Correct** (reboot last):
```json
{"data": {"at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]}}
```

### 3. Error Handling

```javascript
const result = decodeUplink(input);

if (result.errors.length > 0) {
  console.error("Decode errors:", result.errors);
  // Handle errors
}

if (result.warnings.length > 0) {
  console.warn("Decode warnings:", result.warnings);
  // Log warnings
}

// Process data
processData(result.data);
```

### 4. Field Consistency

Use standard field names:
- `powerState` (not `remotePower`, `relayState`, etc.)
- `lockState` (not `remoteLock`, `keyLock`, etc.)
- `temperature` (not `temp`, `currentTemperature`, etc.)

This ensures consistent Modbus/BACnet addressing.

---

## Troubleshooting

### Issue: Downlink Not Received

**Check**:
1. Correct fPort (220 for AT, 2 for control)
2. Device is online and in RX window
3. Correct payload format

**Solution**:
```javascript
// Verify encoded downlink
const result = encodeDownlink({data: {at: "AT+REBOOT"}});
console.log("Bytes:", result.bytes);
console.log("fPort:", result.fPort);
console.log("Errors:", result.errors);
```

### Issue: Wrong Temperature Value in Modbus

**Problem**: Temperature shows 2620 instead of 26.20

**Solution**: Apply scale factor
```
Register value: 2620
Scale: 100
Actual value: 2620 / 100 = 26.20°C
```

### Issue: BACnet Object Not Found

**Problem**: Cannot find object 10113

**Check formula**:
```
Object Instance = (bacnet_id × 100) + offset
10113 = (101 × 100) + 13
```

Verify device has bacnet_id = 101 and attribute has offset = 13

---

## Support

For additional examples or questions:
1. Review [README_CHIRPSTACK_CODEC.md](README_CHIRPSTACK_CODEC.md)
2. Check device manuals in `Product Manual/` directory
3. Examine test cases in `test_codec.js`
4. Review C implementation in `c/lpp.c`
