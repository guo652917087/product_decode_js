# Quick Start Guide

Get started with the unified ChirpStack codec in 5 minutes!

## Step 1: Install in ChirpStack

1. Open ChirpStack web interface at `http://your-server:8080`
2. Navigate to: **Device Profiles** → Select your profile → **Codec** tab
3. Select **JavaScript functions**
4. Copy the entire content of [`chirpstack_codec.js`](chirpstack_codec.js)
5. Paste into the codec editor
6. Click **Submit**

✅ Done! The codec now handles all devices automatically.

## Step 2: Test with a Device

### Example Device: Temperature Sensor (AN-303)

**Uplink received** (fPort 210):
```
00 01 03 10 0A 3C 12 01 F4
```

**Automatically decoded to**:
```json
{
  "model": "AN-303",
  "temperature": 26.20,
  "humidity": 50.0
}
```

### Send a Command

**Reboot the device**:
```json
{
  "data": {
    "at": "AT+REBOOT"
  }
}
```

ChirpStack will send: `FF 41 54 2B 52 45 42 4F 4F 54 0D 0A` on fPort 220

## Step 3: Control Your Devices

### Smart Socket (DS-501)

**Turn On**:
```json
{
  "data": {
    "model": "DS-501",
    "powerState": 1
  }
}
```

**Turn Off**:
```json
{
  "data": {
    "model": "DS-501",
    "powerState": 0
  }
}
```

**Lock Socket**:
```json
{
  "data": {
    "model": "DS-501",
    "lockState": 1
  }
}
```

### Thermostat (W8004)

**Set Temperature to 25°C**:
```json
{
  "data": {
    "setTemperature": 25
  }
}
```

**Set Cooling Mode**:
```json
{
  "data": {
    "workMode": 1
  }
}
```
(0=auto, 1=cool, 2=heat, 3=vent)

**Set Fan Speed**:
```json
{
  "data": {
    "fanSpeed": 2
  }
}
```
(0=off, 1=low, 2=mid, 3=high, 4=auto)

## Step 4: Integrate with Modbus TCP

### Read Values

Use any Modbus client (e.g., Modbus Poll, qModMaster):

```
IP: Your gateway IP
Port: 502
Slave ID: 2 (default)
Function: 03 (Read Holding Registers)
```

**Common Register Addresses**:
| Register | Field | Scale | Example |
|----------|-------|-------|---------|
| 100 | powerState | 1 | 1 = On |
| 203 | model | string | "W8004" |
| 252 | setTemperature | 100 | 2500 = 25.0°C |
| 253 | workMode | 1 | 1 = Cool |
| 254 | fanSpeed | 1 | 2 = Medium |
| 261 | voltage | 10 | 2300 = 230.0V |
| 406 | temperature | 100 | 2620 = 26.2°C |
| 408 | humidity | 100 | 5000 = 50.0% |

### Write Values

**Set W8004 Temperature to 25°C**:
```
Function: 06 (Write Single Register)
Address: 252
Value: 2500
```

This triggers a LoRaWAN downlink to the device!

## Step 5: Integrate with BACnet BIP

### Read Objects

Use YABE or any BACnet browser:

**Calculate Object Instance**:
```
Instance = (Device bacnet_id × 100) + offset
```

Example for device with bacnet_id=101:
| Object | Instance | Field |
|--------|----------|-------|
| AI (Analog Input) | 10113 | temperature |
| AI | 10115 | humidity |
| AV (Analog Value) | 10109 | setTemperature |
| BV (Binary Value) | 10100 | powerState |

### Write Objects

**Set Temperature via BACnet**:
```
Device: 101
Object: Analog Value 10109
Property: Present Value
Value: 25.5
Priority: 16
```

This triggers a LoRaWAN downlink!

## Common Tasks

### Change Heartbeat Interval

**Set to 1 hour (3600 seconds)**:
```json
{
  "data": {
    "at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]
  }
}
```

💡 Always include `AT+REBOOT` as the last command when changing settings.

### Monitor Power Consumption (DS-501)

**Uplink provides**:
```json
{
  "voltage": 230.0,      // V
  "current": 0.70,       // A
  "activePower": 161.0,  // W
  "energy": 10.50        // kWh
}
```

### Handle Emergency Events (AN-301)

**When SOS button pressed**:
```json
{
  "model": "AN-301",
  "sosEvent": 1,
  "batteryVoltage": 3.0,
  "tamper": 0
}
```

**Response logic**:
```javascript
if (decoded.data.sosEvent === 1) {
  // Send emergency alert
  sendAlert("Emergency button pressed!");
}
```

## Next Steps

📖 **Read More**:
- [Complete Documentation](README_CHIRPSTACK_CODEC.md) - Full protocol details
- [Usage Examples](EXAMPLES.md) - More practical examples
- [Product Manuals](Product%20Manual/) - Device-specific documentation
- [Configuration File](openwrt/iot_hub) - Modbus/BACnet mappings

🧪 **Test Your Setup**:
```bash
node test_codec.js
```

🔧 **Customize**:
- Modify register addresses in `openwrt/iot_hub`
- Add new device types to `MODEL_MAP`
- Extend downlink commands for new features

## Troubleshooting

### ❌ Device not decoding

**Check**:
1. fPort = 210 for uplink
2. First byte is 0x00 (protocol version)
3. Payload is at least 2 bytes

### ❌ Downlink not working

**Check**:
1. fPort = 220 for AT commands
2. fPort = 2 for control commands
3. Device is online and in RX window
4. Payload format is correct

### ❌ Wrong values in Modbus

**Remember**:
- Apply scale factors from `iot_hub` config
- Temperature: divide by 100
- Humidity: divide by 100  
- Voltage: divide by 10
- Current: divide by 100

### ❌ BACnet object not found

**Check formula**:
```
Instance = (bacnet_id × 100) + offset
```

Example: Device 101, temperature (offset 13) = 10113

## Support & Contributing

- 💬 Questions? Check [README_CHIRPSTACK_CODEC.md](README_CHIRPSTACK_CODEC.md)
- 🐛 Found a bug? Test with `test_codec.js` first
- 🚀 Want to contribute? Follow existing patterns in code

## Key Features

✅ **One codec for all devices** - No need to maintain separate files  
✅ **AT command support** - Easy device configuration  
✅ **Modbus TCP ready** - Direct register access  
✅ **BACnet BIP ready** - Standard building automation  
✅ **Comprehensive tests** - Validated with 57 test cases  
✅ **Well documented** - Comments in code and separate guides

Happy coding! 🎉
