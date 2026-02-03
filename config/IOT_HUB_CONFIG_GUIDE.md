# IoT Hub Configuration Guide

## Overview

This guide explains the `iot_hub` configuration file structure for BACnet BIP and Modbus TCP protocol mapping.

## Configuration Structure

The `iot_hub` file uses OpenWrt UCI (Unified Configuration Interface) format with three main sections:

1. **Global Configuration** - System-wide settings
2. **Sensor Type Definitions** - Device type configurations
3. **Attribute Library** - Shared attribute definitions with protocol mappings

## Protocol Mapping Rules

### Modbus TCP Mapping

**Key Principles:**
- Only **holding registers (4x)** are used for mapping
- All attributes use shared global register addresses
- Register addresses are NOT continuous per product (by design for flexibility)
- Supports function code 16 (0x10) for writing multiple consecutive registers

**Supported Data Types:**
- `single` - Single 16-bit register (0-65535)
- `big_endian` - Multi-register big-endian (e.g., 32-bit values)
- `little_endian` - Multi-register little-endian
- `string` - String values across multiple registers
- `binary` - Binary data

**Register Allocation Strategy:**
- Attributes have fixed global register addresses
- Each sensor type selects which attributes it uses
- Control attributes (readwrite=1) should be accessible via continuous ranges where possible
- No duplicate registers within the same sensor type

**Control-Enabled Products (readwrite=1):**

| Product | Control Attributes | Register Base |
|---------|-------------------|---------------|
| W8004 Thermostat | powerState, setTemperature, workMode, fanSpeed, keyLockState, signalStrength | 100, 252-258 |
| DS-501 Smart Socket | powerState, lockState | 100, 266 |
| DS103 3-Channel Switch | powerState, lockState, switch1-3 | 100, 266, 509-511 |
| EF5600-DN1 Fire Monitor | powerState | 100 |
| AN307 Alarm | alarmStatus | 512 |

### BACnet BIP Mapping

**Key Principles:**
- Each device occupies `DEVICE_SLOT_SIZE = 100` instance numbers
- Instance offsets must be in range **0-99** for each device
- Device BACnet ID formula: `bacnet_id * 100 + bacnet_instance_offset`
- Control attributes (readwrite=1) support write operations

**BACnet Object Types:**
- `AI` - Analog Input (read-only sensor values)
- `BI` - Binary Input (read-only binary states)
- `AV` - Analog Value (read/write analog values)
- `BV` - Binary Value (read/write binary states)
- `CV` - Character String Value

**Example:**
- Device with bacnet_id=101
- Attribute with bacnet_instance_offset=13
- Final BACnet instance = 101 * 100 + 13 = 10113

**Instance Offset Allocation:**
All attributes now use offsets 0-99:
- Control attributes typically use lower offsets (0-20)
- Sensor readings use mid-range offsets (20-70)
- Alarm/status attributes use higher offsets (70-99)

## Attribute Configuration

Each attribute definition includes:

```
config attribute 'attributeName'
    option json_key 'jsonFieldName'        # JSON field name in ChirpStack
    option data_type 'type'                 # bool, int, float, string
    option readwrite '0|1'                  # 0=read-only, 1=read-write
    option modbus_enable '1'                # Enable Modbus mapping
    option modbus_table 'holding'           # Modbus table type
    option modbus_offset 'address'          # Modbus register address
    option modbus_register_count '1'        # Number of registers
    option modbus_mapping_mode 'single'     # Data mapping mode
    option modbus_scale '1'                 # Scale factor
    option bacnet_enable '1'                # Enable BACnet mapping
    option bacnet_object_type 'AI|BI|AV|BV' # BACnet object type
    option bacnet_instance_offset 'offset'  # Instance offset (0-99)
    option bacnet_unit 'unit_code'          # BACnet engineering unit
```

## Control Attributes (readwrite=1)

The following attributes support downlink control:

| Attribute | Type | Modbus | BACnet | Description |
|-----------|------|--------|--------|-------------|
| powerState | bool | 100 | 0 | Power on/off control |
| setTemperature | float | 252 | 9 | Temperature setpoint (°C × 100) |
| workMode | int | 253 | 10 | HVAC mode (0-3) |
| fanSpeed | int | 254 | 11 | Fan speed (0-4) |
| keyLockState | int | 256 | 13 | Key lock state (0/1) |
| signalStrength | int | 258 | 15 | Signal strength control |
| lockState | int | 266 | 34 | Device lock state |
| switch1State | bool | 509 | 87 | Switch 1 control |
| switch2State | bool | 510 | 88 | Switch 2 control |
| switch3State | bool | 511 | 89 | Switch 3 control |
| alarmStatus | bool | 512 | 90 | Alarm control |

## ChirpStack Codec Integration

The `chirpstack_codec.js` file handles encoding/decoding:

**Uplink (Fport 210):**
- Type-Value pairs protocol
- Device-specific type codes
- Automatic JSON field mapping

**Downlink (Fport 2/220):**
- Fport 2: Device control commands
- Fport 220: AT commands and configuration
- All control values use **numeric types** (not strings)
- String commands ('power_on', 'alarm_off') are API convenience only
- Actual transmission uses numeric bytes (0x00, 0x01, etc.)

**Numeric Value Enforcement:**
```javascript
const state = Number(data.powerState) ? 1 : 0;
const temp = Math.round(Number(data.setTemperature) * 100);
```

## Sensor Type Configuration

Each sensor type lists its attributes:

```
config sensor_type 'W8004_thermostat'
    option description 'Thermostat Controller'
    option version '20260101'
    list attributes 'temperature'
    list attributes 'setTemperature'
    list attributes 'powerState'
    ...
```

## Best Practices

1. **BACnet Instance Offsets:**
   - Always use 0-99 range
   - Control attributes at lower offsets
   - Group related attributes together
   - Avoid gaps where possible

2. **Modbus Registers:**
   - Use holding registers only
   - Keep control registers in accessible ranges
   - Document any register dependencies
   - Avoid register overlaps within same device

3. **Control Attributes:**
   - Mark with readwrite='1'
   - Use appropriate BACnet object type (BV/AV)
   - Ensure modbus_enable='1'
   - Test write operations

4. **Data Types:**
   - Use integers for discrete values (modes, states)
   - Use floats for continuous values (temperature, pressure)
   - Apply appropriate scaling factors
   - Document units clearly

## Troubleshooting

**BACnet Issues:**
- Ensure instance offsets < 100
- Check for duplicate offsets in same device
- Verify bacnet_id configuration

**Modbus Issues:**
- Verify holding register addresses
- Check register count for multi-register values
- Confirm mapping mode matches data type
- Test function code 16 for multiple writes

**Control Issues:**
- Verify readwrite='1' setting
- Check both Modbus and BACnet enable flags
- Ensure proper data type conversion
- Test with actual control commands

## Version History

- **20260101** - Initial unified configuration
  - Added BACnet instance offset validation
  - Fixed offsets to 0-99 range
  - Documented control attributes
  - Verified Modbus register allocations
