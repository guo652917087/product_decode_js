# Unified ChirpStack Codec Documentation

## Overview

This document describes the unified ChirpStack JavaScript codec (`chirpstack_codec.js`) that supports all IoT devices in this repository using a custom LPP (Low Power Payload) protocol.

## Features

- ✅ **Universal Uplink Decoder**: Single decoder works for all device types
- ✅ **AT Command Support**: Standard AT commands via fPort 220
- ✅ **Control Commands**: Device-specific controls via fPort 2
- ✅ **Modbus TCP Integration**: Numeric values for direct register mapping
- ✅ **BACnet BIP Integration**: Compatible object instance mappings
- ✅ **Comprehensive Comments**: Protocol documentation embedded in code
- ✅ **Field Consistency**: Reusable field names across all devices

## Protocol Details

### Uplink Protocol (fPort 210)

All devices send data using the same LPP-like protocol:

```
Byte 0: Protocol version (reserved, currently 0x00)
Byte 1+: Type-Value pairs
```

Each Type-Value pair consists of:
- 1 byte type identifier
- N bytes value (length depends on type)

Example types:
- `0x01`: Model ID (1 byte)
- `0x04`: Battery voltage (2 bytes, mV)
- `0x10`: Temperature (2 bytes, °C * 100)
- `0x12`: Humidity (2 bytes, %RH * 10)
- `0x22`: Relay state (1 byte)
- `0x95`: Modbus data block (variable)

See `chirpstack_codec.js` for complete type listing.

### Downlink Protocol

#### AT Commands (fPort 220)

Format: `0xFF` + ASCII command + `0x0D 0x0A` (CRLF)

**Single Command Example:**
```json
{
  "at": "AT+REBOOT"
}
```
Payload: `FF 41 54 2B 52 45 42 4F 4F 54 0D 0A`

**Multiple Commands Example:**
```json
{
  "at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]
}
```
Payload: `FF 41 54 2B ... 0D 0A 41 54 2B ... 0D 0A`

**Important**: Always place `AT+REBOOT` last when setting parameters that require reboot to take effect.

#### Control Commands (fPort 2)

Use numeric values for all control fields to ensure compatibility with Modbus TCP and BACnet BIP:

**Common Control Fields:**
```json
{
  "powerState": 1,        // 0=off, 1=on
  "lockState": 0,         // 0=unlocked, 1=locked
  "setTemperature": 25.5, // Numeric temperature in °C
  "workMode": 1,          // 0=auto, 1=cool, 2=heat, 3=vent
  "fanSpeed": 2           // 0=off, 1=low, 2=mid, 3=high, 4=auto
}
```

**Device-Specific Examples:**

DS-501 Smart Socket:
```json
{
  "model": "DS-501",
  "command": "immediate_on"
}
// or
{
  "powerState": 1
}
```

W8004 Thermostat:
```json
{
  "setTemperature": 25.5
}
// or
{
  "workMode": 1  // cooling mode
}
```

## Modbus TCP Integration

### Register Mapping Rules

1. **Only Holding Registers (4x)** are used
2. **Continuous register allocation** per device type for multi-register writes (function code 16)
3. **No register overlaps** between different attributes
4. **Scale factors** defined in `openwrt/iot_hub` configuration

### Mapping Modes

- `single`: Single 16-bit register
- `big_endian`: Multi-register, big-endian byte order
- `little_endian`: Multi-register, little-endian byte order
- `string`: ASCII string in registers
- `binary`: Binary data blob

### Register Allocation

| Device Type | Offset Range | Attributes |
|-------------|--------------|------------|
| Common      | 100-110      | powerState, lockState, etc. |
| Versions    | 200-300      | online, model, timestamps |
| Sensors     | 400-450      | temperature, humidity, battery |
| W8004       | 252-260      | setTemperature, workMode, fanSpeed, etc. |
| DS-501      | 261-270      | voltage, current, power, energy |

See `openwrt/iot_hub` for complete mapping details.

## BACnet BIP Integration

### Object Instance Formula

```
Object Instance = (bacnet_id × 100) + bacnet_instance_offset
```

Each device reserves 100 object slots (DEVICE_SLOT_SIZE=100).

### Object Types

- **AI** (Analog Input): Read-only analog values (temperature, voltage, etc.)
- **AO** (Analog Output): Writable analog values
- **AV** (Analog Value): Read/write analog values (setTemperature, etc.)
- **BI** (Binary Input): Read-only binary states
- **BO** (Binary Output): Writable binary states
- **BV** (Binary Value): Read/write binary states (powerState, lockState, etc.)
- **CV** (CharacterString Value): String values (versions, model, etc.)

### Writable Objects

Attributes with `readwrite=1` in `iot_hub` config support downlink control:
- powerState (BV at offset 0)
- setTemperature (AV at offset 9)
- workMode (BV at offset 10)
- fanSpeed (BV at offset 11)
- keyLockState (BV at offset 13)
- lockState (BV at offset 34)

## Field Consistency

### Unified Field Names

To ensure consistent Modbus/BACnet addressing, common fields use the same attribute names:

| Field | Usage | Type | Devices |
|-------|-------|------|---------|
| powerState | Power on/off control | bool/int | W8004, DS-501, etc. |
| lockState | Lock/unlock control | int | DS-501, etc. |
| temperature | Ambient temperature | float | W8004, AN-303, etc. |
| humidity | Relative humidity | float | W8004, AN-303, etc. |
| batteryVoltage | Battery voltage | float | AN-301, AN-303, etc. |
| model | Device model string | string | All devices |
| rssi | Signal strength | int | All devices |
| snr | Signal-to-noise ratio | int | All devices |

### ❌ Deprecated Fields

Do **not** use these device-specific field names in new code:
- ~~remotePower~~ → Use `powerState` instead
- ~~remoteLock~~ → Use `keyLockState` or `lockState` instead

## Usage Examples

### ChirpStack v4 Integration

1. **Navigate to Device Profile** in ChirpStack web UI
2. **Select "Codec" tab**
3. **Choose "JavaScript functions"**
4. **Copy entire content** of `chirpstack_codec.js`
5. **Paste into codec editor**
6. **Save device profile**

### Testing Uplink Decoding

**Input (fPort 210):**
```
00 01 03 10 0A 3C 12 01 F4
```

**Decoded Output:**
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

### Testing Downlink Encoding

**Reboot Command:**
```json
{
  "data": {
    "at": "AT+REBOOT"
  }
}
```

**Output:**
```json
{
  "bytes": [255, 65, 84, 43, 82, 69, 66, 79, 79, 84, 13, 10],
  "fPort": 220,
  "errors": [],
  "warnings": []
}
```

**Power Control:**
```json
{
  "data": {
    "powerState": 1
  }
}
```

**Output (DS-501):**
```json
{
  "bytes": [9, 72, 1, 1],
  "fPort": 2,
  "errors": [],
  "warnings": []
}
```

## Configuration Files

### Device Type Definitions

Located in `openwrt/iot_hub`:

```uci
config sensor_type 'W8004_thermostat'
    option description 'Thermostat Controller'
    option version '20260101'
    list attributes 'temperature'
    list attributes 'humidity'
    list attributes 'setTemperature'
    list attributes 'workMode'
    list attributes 'fanSpeed'
    list attributes 'powerState'
    # ... etc
```

### Attribute Mappings

Each attribute defines:
- JSON key name
- Data type (bool, int, float, string, timestamp, binary)
- Modbus mapping (table, offset, count, mode, scale)
- BACnet mapping (object type, instance offset, unit)
- Read/write permission

Example:
```uci
config attribute 'setTemperature'
    option json_key 'setTemperature'
    option data_type 'float'
    option unit 'celsius'
    option readwrite '1'           # Writable
    option modbus_enable '1'
    option modbus_table 'holding'
    option modbus_offset '252'
    option modbus_register_count '1'
    option modbus_mapping_mode 'single'
    option modbus_scale '100'      # Store as temp*100
    option bacnet_enable '1'
    option bacnet_object_type 'AV' # Analog Value
    option bacnet_instance_offset '9'
    option bacnet_unit '62'        # Degrees Celsius
```

## Troubleshooting

### Uplink Decoding Issues

**Problem**: Warnings about unknown types
- **Cause**: Device using newer protocol version
- **Solution**: Update codec with new type definitions

**Problem**: Truncated field warnings
- **Cause**: Payload shorter than expected
- **Solution**: Check device firmware version, may be sending abbreviated payload

### Downlink Issues

**Problem**: Device not responding to AT commands
- **Cause**: Missing CRLF termination
- **Solution**: Codec automatically adds CRLF, check fPort is 220

**Problem**: Control commands not working
- **Cause**: Wrong fPort or incorrect command format
- **Solution**: Verify device model and use correct command structure

### Modbus Integration Issues

**Problem**: Register conflicts
- **Cause**: Multiple attributes mapped to same offset
- **Solution**: Check `iot_hub` config, ensure unique offsets

**Problem**: Incorrect values in Modbus poll
- **Cause**: Wrong scale factor
- **Solution**: Verify `modbus_scale` in attribute config

### BACnet Integration Issues

**Problem**: Object instance collision
- **Cause**: Multiple devices with same bacnet_id
- **Solution**: Assign unique bacnet_id per device (formula: id * 100 + offset)

**Problem**: Cannot write to object
- **Cause**: Attribute not writable or wrong object type
- **Solution**: Check `readwrite='1'` and use AV/BV/CV for writable objects

## Development

### Adding New Device Types

1. **Update MODEL_MAP** in codec with new model code
2. **Add sensor_type** section in `iot_hub`
3. **Define attributes** used by device
4. **Add device-specific** downlink encoding if needed
5. **Test** with real device or simulator

### Adding New Protocol Types

1. **Add case** in decodeUplink switch statement
2. **Document type** in header comments
3. **Update** this README with new type info
4. **Test** with sample payloads

### Adding New Downlink Commands

1. **Add command logic** in encodeDownlink
2. **Use numeric values** for Modbus/BACnet compatibility
3. **Add validation** for parameter ranges
4. **Document** command format and examples

## Support

For issues, questions, or contributions:
- Check existing device JS files in `/js` directory for examples
- Review product manuals in `/Product Manual` directory
- Examine C reference implementation in `/c/lpp.c`
- See UCI config format in `/openwrt/iot_hub`

## Version History

- **v1.0.0** (2026-02-03): Initial unified codec release
  - Universal uplink decoder for all devices
  - AT command support (fPort 220)
  - Control command support (fPort 2)
  - Modbus TCP integration
  - BACnet BIP integration
  - Comprehensive documentation
