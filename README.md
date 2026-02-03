# product_decode_js

LoRaWAN IoT device decoder/encoder collection for ChirpStack and other platforms.

## 🚀 Quick Start

**For ChirpStack v4.16.0+**, use the unified codec:
- **Codec file**: [`chirpstack_codec.js`](chirpstack_codec.js)
- **Documentation**: [README_CHIRPSTACK_CODEC.md](README_CHIRPSTACK_CODEC.md)

This single codec supports **all device types** with:
- ✅ Universal uplink decoder (fPort 210)
- ✅ AT command downlink (fPort 220)  
- ✅ Device control commands (fPort 2)
- ✅ Modbus TCP integration
- ✅ BACnet BIP integration

## 📁 Repository Structure

```
.
├── chirpstack_codec.js          # Unified codec for all devices (recommended)
├── README_CHIRPSTACK_CODEC.md   # Comprehensive codec documentation
├── js/                          # Individual device codecs (legacy)
│   ├── AN-301.js
│   ├── AN-303.js
│   ├── W8004.js
│   ├── DS-501.js
│   └── ...
├── Product Manual/              # Device documentation (Chinese)
├── c/                           # C reference implementation
│   └── lpp.c
├── openwrt/                     # Configuration files
│   └── iot_hub                  # Device attributes and mappings
└── test_codec.js                # Test suite
```

## 📖 Documentation

- [Product Manuals](Product%20Manual/) - Communication protocols and specifications (Chinese)
- [ChirpStack Codec Guide](README_CHIRPSTACK_CODEC.md) - Complete codec documentation
- [Quick Start Guide](QUICK_START.md) - 5-minute setup
- [Usage Examples](EXAMPLES.md) - 15+ practical examples
- [Advanced Downlink](ADVANCED_DOWNLINK.md) - Multi-attribute control, Modbus 06/07, serial passthrough
- [System Architecture](ARCHITECTURE.md) - Data flow and integration diagrams
- [Configuration File](openwrt/iot_hub) - Device attributes and Modbus/BACnet mappings

## 🔧 Usage

### ChirpStack Integration

1. Open ChirpStack web interface
2. Navigate to **Device Profiles** → Select profile → **Codec** tab
3. Choose **JavaScript functions**
4. Copy content of `chirpstack_codec.js`
5. Paste into codec editor
6. Save

See [README_CHIRPSTACK_CODEC.md](README_CHIRPSTACK_CODEC.md) for detailed examples.

### Testing

Run the test suite:
```bash
node test_codec.js
```

## 🌐 Supported Devices

All devices use the same LPP protocol and are supported by the unified codec:

| Model | Type | Description |
|-------|------|-------------|
| AN-301 | Emergency Button | SOS/panic button with tamper detection |
| AN-303 | Temperature & Humidity | Environmental sensor |
| AN-305A | Door Contact | Magnetic door/window sensor |
| AN-204B | Water Leakage | Flood detection sensor |
| W8004 | Thermostat | HVAC controller with Modbus |
| DS-501 | Smart Socket | Power monitoring and control |
| EF5600-DN1 | Electrical Fire Monitor | Safety monitoring device |
| ... | ... | See MODEL_MAP in codec for complete list |

## 🔌 Integration

### Modbus TCP

The codec outputs numeric values compatible with Modbus TCP:
- Holding registers (4x) mapping
- Continuous register allocation
- Configurable scale factors
- Support for: single, big_endian, little_endian, string, binary

Example register mapping:
```
100-110  : Common (powerState, lockState, etc.)
200-300  : Device info (online, model, timestamps)
400-450  : Sensors (temperature, humidity, battery)
252-260  : W8004 specific (setTemperature, workMode, etc.)
261-270  : DS-501 specific (voltage, current, power, energy)
```

### BACnet BIP

BACnet object mapping formula:
```
Object Instance = (bacnet_id × 100) + bacnet_instance_offset
```

Supported object types: AI, AO, AV, BI, BO, BV, CV

## 📝 Protocol Details

### Uplink (fPort 210)

```
Byte 0   : Protocol version (0x00)
Byte 1+  : [Type1][Value1][Type2][Value2]...
```

Common types:
- `0x01` - Model ID
- `0x04` - Battery voltage (mV)
- `0x10` - Temperature (°C × 100)
- `0x12` - Humidity (%RH × 10)
- `0x22` - Power state
- `0x95` - Modbus data

### Downlink

**AT Commands (fPort 220)**:
```
0xFF + ASCII("AT+REBOOT") + 0x0D 0x0A
```

**Control (fPort 2)**:
```json
{"powerState": 1}    // Turn on
{"lockState": 0}     // Unlock
{"setTemperature": 25.5}  // Set temp
```

## 🛠 Development

### Adding New Device Types

1. Add model code to `MODEL_MAP` in codec
2. Define sensor type in `openwrt/iot_hub`
3. Add attributes with Modbus/BACnet mappings
4. Test with `test_codec.js`

### Contributing

This repository contains production firmware decoder implementations. Please ensure:
- All changes maintain backward compatibility
- Numeric values used for Modbus/BACnet integration
- Comprehensive testing before deployment
- Documentation updates

## 📄 License

See individual files for license information.

## 📧 Contact

For questions or issues, please check:
- Product manuals in `Product Manual/` directory
- C reference implementation in `c/lpp.c`
- Configuration examples in `openwrt/iot_hub`
