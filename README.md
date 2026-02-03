# product_decode_js

LoRaWAN Device Decoder for ChirpStack - Unified JavaScript codec for all IoT devices using custom LPP protocol.

## Overview

This repository contains a unified ChirpStack codec that supports multiple IoT device types through a custom LPP (Low Power Payload) protocol. The codec is designed for seamless integration with Modbus TCP and BACnet BIP protocols.

## Supported Devices

The codec supports the following device models:

### Environmental Sensors
- **AN-303**: Temperature and Humidity Sensor
- **AN-304/AN304C**: Environmental Sensor
- **AN-305A**: Door Contact Sensor
- **AN-204B**: Water Leakage Sensor

### Security & Alarm Devices
- **AN-301**: Emergency Button/SOS Device
- **JTY-AN-503A**: Fire/Smoke Detector

### Control & Monitoring
- **W8004**: Thermostat Controller with Modbus support
- **DS-501**: Smart Socket with Power Monitoring
- **CU606**: IoT Controller
- **EF5600-DN1**: Electrical Fire Monitor

### And Many More
See `chirpstack_codec.js` MODEL_MAP for complete list of 50+ supported device models.

## Repository Structure

```
.
├── chirpstack_codec.js          # Unified ChirpStack v4.16.0+ codec
├── openwrt/
│   └── iot_hub                  # Configuration for Modbus/BACnet mapping
├── js/                          # Individual device decoder examples
│   ├── W8004.js
│   ├── DS-501.js
│   ├── AN-301.js
│   └── ...
├── c/
│   └── lpp.c                    # C language reference implementation
└── Product Manual/              # Device user manuals and protocol specs
    ├── W8004通信协议.xls        # W8004 Modbus RTU protocol specification
    ├── W8004.pdf
    ├── DS-501.pdf
    └── ...
```

## Protocol Overview

### Uplink (fPort 210)

All devices use the same uplink format with custom LPP protocol:

**Payload Structure:**
```
[Reserved:1] [Type1:1] [Value1:N] [Type2:1] [Value2:N] ...
```

- **Byte 0**: Reserved for protocol version (currently 0x00)
- **Byte 1+**: Type-Value pairs where each type defines the value length

**Common LPP Types:**
- `0x01` - Model ID (1 byte)
- `0x04` - Battery voltage (2 bytes, mV)
- `0x10` - Temperature (2 bytes, °C × 100)
- `0x12` - Humidity (2 bytes, %RH × 10)
- `0x15` - Gas concentration (2 bytes, ppm)
- `0x22` - Relay/Socket state (1 byte)
- `0x94` - RS485 address (1 byte)
- `0x95` - Modbus data block (variable)
- `0x97-0x9a` - AC electrical measurements

See `chirpstack_codec.js` header for complete type reference.

### Downlink

#### 1. AT Commands (fPort 220)
All devices support AT commands for configuration:

**Format:** `0xFF + ASCII(command) + CRLF`

**Example:**
```json
{
  "at": "AT+REBOOT"
}
```
**Result:** `FF 41 54 2B 52 45 42 4F 4F 54 0D 0A` on fPort 220

**Multiple Commands:**
```json
{
  "at": ["AT+HBTPKTTIMS=3600", "AT+REBOOT"]
}
```

#### 2. Serial Passthrough (fPort 220)
Direct serial communication for Modbus RTU frames:

**Format:** `0xFE + raw bytes`

**Example:**
```json
{
  "serialPassthrough": [0x01, 0x10, 0x00, 0x04, 0x00, 0x03, 0x06, 0x09, 0xC4, 0x00, 0x01, 0x00, 0x01, 0xC6, 0x1D]
}
```
**Result:** `FE 01 10 00 04 00 03 06 09 C4 00 01 00 01 C6 1D` on fPort 220

#### 3. W8004 Modbus Control (fPort 2)

**06 Instruction (Single Register):**
Automatically used for single attribute:
```json
{
  "setTemperature": 25.5
}
```
**Result:** `06 06 00 04 09 F6` on fPort 2

**07 Instruction (Multiple Registers):**
Automatically used for multiple consecutive registers:
```json
{
  "setTemperature": 25.5,
  "workMode": 1,
  "fanSpeed": 2
}
```
**Result:** `07 01 10 00 04 00 03 06 09 F6 00 01 00 02 [CRC]` on fPort 2

**W8004 Register Map:**
- `0x0004` - setTemperature (value × 100)
- `0x0005` - workMode (0=auto, 1=cool, 2=heat, 3=vent)
- `0x0006` - fanSpeed (0=off, 1=low, 2=mid, 3=high, 4=auto)
- `0xF000` - powerState (0=off, 1=on)
- `0xF001` - keyLockState (0=unlocked, 1=locked)

#### 4. DS-501 Control (fPort 2)
```json
{
  "model": "DS-501",
  "powerState": 1
}
```

## Modbus TCP Integration

The `iot_hub` configuration file defines Modbus TCP mappings for all attributes.

**Mapping Rules:**
- Only Holding registers (4x) are used
- Registers allocated in continuous blocks per device type
- Supports function code 16 (Write Multiple Registers)
- Mapping modes: `single`, `big_endian`, `little_endian`, `string`, `binary`

**Example Mappings:**
- `powerState` → Holding 100 (scale 1)
- `temperature` → Holding 406 (scale 100)
- `setTemperature` → Holding 252 (scale 100, read/write)
- `mainVersion` → Holding 1032 (32 registers, string)

## BACnet BIP Integration

**Object Instance Calculation:**
```
Object Instance = (bacnet_id × 100) + bacnet_instance_offset
```

Each device occupies 100 object instance slots (DEVICE_SLOT_SIZE = 100).

**Example:**
- Device with `bacnet_id=101` and attribute `temperature` (offset 13)
- Object Instance = 101 × 100 + 13 = 10113

**Object Types:**
- AI (Analog Input) - Read-only sensors
- AO (Analog Output) - Writable outputs
- AV (Analog Value) - Writable values
- BI (Binary Input) - Read-only binary
- BO (Binary Output) - Writable binary
- BV (Binary Value) - Writable binary value
- CV (CharacterString Value) - String data

## Field Consistency

To ensure consistent Modbus/BACnet addressing, common fields are reused across all device types:

- **powerState**: Power on/off control (replaces device-specific power fields)
- **lockState**: Lock/unlock control (unified for all lock types)
- **temperature**: Ambient temperature reading
- **humidity**: Relative humidity reading
- **batteryVoltage**: Battery voltage in volts
- **model**: Device model string
- **rssi**: Signal strength indicator
- **snr**: Signal-to-noise ratio

⚠️ **Important**: Always use `powerState` (not `remotePower` or device-specific names) to ensure consistent addressing.

## Usage

### ChirpStack Configuration

1. In ChirpStack, go to **Device Profiles**
2. Create or edit a device profile
3. In the **Codec** section:
   - Select **JavaScript functions**
   - Copy the content of `chirpstack_codec.js` into the codec field
4. Assign this profile to your devices

### Testing

Run the test suite to verify codec functionality:

```bash
node test_codec.js
```

Tests include:
- Uplink decoding (temperature, humidity, Modbus data)
- AT command encoding
- Serial passthrough
- W8004 06/07 instructions
- DS-501 control commands
- Multi-device support

## Documentation

- **Product Manuals**: See `Product Manual/` directory for device-specific protocols
- **W8004 Protocol**: `Product Manual/W8004通信协议.xls` - Modbus RTU register specification
- **Codec Comments**: Extensive inline documentation in `chirpstack_codec.js`
- **Config Reference**: `openwrt/iot_hub` - Complete attribute and mapping definitions

## Contributing

When adding new device types:

1. Add device model to MODEL_MAP in `chirpstack_codec.js`
2. Add sensor type configuration to `openwrt/iot_hub`
3. Define required attributes with Modbus/BACnet mappings
4. Ensure register offsets don't conflict with existing attributes
5. Use numeric values for control fields (not strings)
6. Add tests to verify functionality

## License

See repository license file.

## Version

Current version: 2026-01-01

Compatible with ChirpStack v4.16.0+