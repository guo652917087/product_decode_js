# System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IoT Devices (LoRaWAN)                             │
├───────────┬───────────┬───────────┬───────────┬──────────┬──────────────┤
│  AN-303   │  AN-301   │  AN-305A  │  W8004    │  DS-501  │   Others     │
│  Temp/Hum │ SOS Button│ Door Sens │Thermostat │  Socket  │ (50+ models) │
└─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴────┬─────┴──────┬───────┘
      │           │           │           │          │            │
      │    LoRaWAN Uplink (fPort 210 - LPP Protocol)            │
      │           │           │           │          │            │
      └───────────┴───────────┴───────────┴──────────┴────────────┘
                                │
                                │
                    ┌───────────▼────────────┐
                    │   LoRaWAN Gateway      │
                    │  (e.g., RAK, Mikrotik) │
                    └───────────┬────────────┘
                                │
                                │ UDP/MQTT/HTTP
                                │
                    ┌───────────▼────────────┐
                    │   ChirpStack Server    │
                    │  (Network Server)      │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │ chirpstack_codec │  │◄─── Unified codec
                    │  │    .js           │  │     for ALL devices
                    │  └──────────────────┘  │
                    └───────────┬────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                │    Decoded    │    Encoded     │
                │    Uplink     │    Downlink    │
                │               │                │
    ┌───────────▼──────┐  ┌────▼─────┐  ┌──────▼─────────┐
    │   Application    │  │  MQTT    │  │  LoRaWAN App   │
    │   Server API     │  │  Broker  │  │  Server        │
    └───────────┬──────┘  └────┬─────┘  └──────┬─────────┘
                │              │               │
                │              │               │
    ┌───────────▼──────────────▼───────────────▼──────────┐
    │              IoT Hub Gateway (OpenWrt)               │
    │  ┌──────────────────────────────────────────────┐   │
    │  │          Configuration (iot_hub)             │   │
    │  │  • Sensor types                              │   │
    │  │  • Attribute definitions                     │   │
    │  │  • Modbus register mappings                  │   │
    │  │  • BACnet object mappings                    │   │
    │  └──────────────────────────────────────────────┘   │
    │                                                      │
    │  ┌──────────────────┐      ┌──────────────────┐    │
    │  │  Modbus TCP      │      │  BACnet BIP      │    │
    │  │  Server          │      │  Server          │    │
    │  │  (Port 502)      │      │  (Port 47808)    │    │
    │  └────────┬─────────┘      └────────┬─────────┘    │
    └───────────┼──────────────────────────┼──────────────┘
                │                          │
    ┌───────────▼──────────┐   ┌──────────▼──────────────┐
    │  Modbus Clients      │   │  BACnet Clients         │
    ├──────────────────────┤   ├─────────────────────────┤
    │ • Modbus Poll        │   │ • YABE                  │
    │ • qModMaster         │   │ • BACnet Explorer       │
    │ • SCADA Systems      │   │ • BMS Systems           │
    │ • PLC                │   │ • Building Automation   │
    │ • Home Assistant     │   │ • Energy Management     │
    └──────────────────────┘   └─────────────────────────┘
```

## Data Flow

### Uplink Flow (Device → Server)

```
┌──────────────┐
│ IoT Device   │  1. Sensor reading (e.g., 26.2°C)
└──────┬───────┘
       │
       │  2. Encode to LPP: 00 01 03 10 0A 3C (fPort 210)
       │
       ▼
┌──────────────┐
│  LoRaWAN     │  3. LoRaWAN transmission
│  Gateway     │
└──────┬───────┘
       │
       │  4. UDP/MQTT to ChirpStack
       │
       ▼
┌──────────────┐
│ ChirpStack   │  5. chirpstack_codec.js decodeUplink()
│ + Codec      │     → {"temperature": 26.2, "model": "AN-303"}
└──────┬───────┘
       │
       │  6. JSON to Application/MQTT
       │
       ├──────────────┬─────────────────┐
       │              │                 │
       ▼              ▼                 ▼
┌──────────┐   ┌──────────┐    ┌───────────┐
│ IoT Hub  │   │   MQTT   │    │  REST API │
│ Gateway  │   │  Broker  │    │  Webhook  │
└─────┬────┘   └──────────┘    └───────────┘
      │
      │  7. Map to Modbus/BACnet
      │
      ├─────────────────┬──────────────────┐
      ▼                 ▼                  │
┌──────────┐      ┌──────────┐            │
│ Modbus   │      │ BACnet   │            │
│ Reg 406  │      │AI 10113  │            │
│ = 2620   │      │= 26.2°C  │            │
└──────────┘      └──────────┘            │
```

### Downlink Flow (Server → Device)

```
┌──────────────┐
│ Modbus Poll  │  1. Write Register 252 = 2500 (25.0°C)
└──────┬───────┘
       │
       │  2. Modbus write detected
       │
       ▼
┌──────────────┐
│  IoT Hub     │  3. Convert to JSON
│  Gateway     │     {"setTemperature": 25.0}
└──────┬───────┘
       │
       │  4. Trigger downlink via API
       │
       ▼
┌──────────────┐
│ ChirpStack   │  5. chirpstack_codec.js encodeDownlink()
│ + Codec      │     → bytes: [06 06 00 04 09 C4], fPort: 2
└──────┬───────┘
       │
       │  6. LoRaWAN downlink queued
       │
       ▼
┌──────────────┐
│  LoRaWAN     │  7. Send when device opens RX window
│  Gateway     │
└──────┬───────┘
       │
       │  8. LoRaWAN transmission
       │
       ▼
┌──────────────┐
│ IoT Device   │  9. Decode and apply: Set temp to 25.0°C
└──────────────┘
```

## Component Details

### ChirpStack Codec (chirpstack_codec.js)

```
┌─────────────────────────────────────────────┐
│        chirpstack_codec.js                  │
├─────────────────────────────────────────────┤
│                                             │
│  decodeUplink(input)                        │
│    ├─ Parse LPP protocol (fPort 210)       │
│    ├─ Type-Value pairs                     │
│    │   ├─ 0x01: Model                      │
│    │   ├─ 0x04: Battery                    │
│    │   ├─ 0x10: Temperature                │
│    │   ├─ 0x12: Humidity                   │
│    │   ├─ 0x22: Power state                │
│    │   ├─ 0x95: Modbus data                │
│    │   └─ ... (40+ types)                  │
│    └─ Return: {data, errors, warnings}     │
│                                             │
│  encodeDownlink(input)                      │
│    ├─ AT Commands (fPort 220)              │
│    │   └─ Format: 0xFF + ASCII + CRLF     │
│    ├─ Device Control (fPort 2)             │
│    │   ├─ DS-501: 0x09 0x48 + command     │
│    │   ├─ W8004: Modbus frame             │
│    │   └─ Generic: Simple control         │
│    └─ Return: {bytes, fPort, errors}       │
│                                             │
└─────────────────────────────────────────────┘
```

### IoT Hub Configuration (iot_hub)

```
┌──────────────────────────────────────────────┐
│           openwrt/iot_hub                    │
├──────────────────────────────────────────────┤
│                                              │
│  Sensor Types                                │
│    ├─ W8004_thermostat                      │
│    ├─ DS_501_smart_socket                   │
│    ├─ AN_303_temperature_humidity           │
│    └─ ... (10+ types)                       │
│                                              │
│  Attributes (51 total)                       │
│    ├─ powerState                            │
│    │   ├─ json_key: "powerState"           │
│    │   ├─ data_type: bool                  │
│    │   ├─ readwrite: 1 (writable)          │
│    │   ├─ Modbus: offset=100, single       │
│    │   └─ BACnet: BV, offset=0             │
│    │                                        │
│    ├─ temperature                           │
│    │   ├─ data_type: float                 │
│    │   ├─ readwrite: 0 (read-only)         │
│    │   ├─ Modbus: offset=406, scale=100    │
│    │   └─ BACnet: AI, offset=13            │
│    │                                        │
│    └─ ... (49 more)                         │
│                                              │
└──────────────────────────────────────────────┘
```

## Register/Object Mapping

### Modbus TCP Registers (Holding, 4x)

```
0-99      : Device-specific (doorState, presence, etc.)
100-110   : Common control (powerState, lockState)
200-300   : Device metadata (online, model, timestamps)
252-260   : W8004 thermostat controls (continuous)
261-270   : DS-501 socket measurements (continuous)
400-450   : Sensor readings (temp, humidity, battery)
1000-1200 : String data (versions, 32 regs each)
```

### BACnet Objects

```
Formula: Instance = (Device ID × 100) + Offset

Example for Device 101:
├─ AI 10100 : online status
├─ AI 10113 : temperature (offset 13)
├─ AI 10115 : humidity (offset 15)
├─ AV 10109 : setTemperature (offset 9, writable)
├─ BV 10100 : powerState (offset 0, writable)
└─ CV 10106 : model string (offset 6)
```

## Security & Best Practices

```
┌────────────────────────────────────┐
│     Security Considerations        │
├────────────────────────────────────┤
│ ✓ Use HTTPS for ChirpStack API     │
│ ✓ Enable authentication            │
│ ✓ Use TLS for Modbus TCP           │
│ ✓ Limit BACnet network access      │
│ ✓ Monitor downlink commands        │
│ ✓ Rate limit control operations    │
│ ✓ Log all configuration changes    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│       Best Practices               │
├────────────────────────────────────┤
│ ✓ Always use numeric values        │
│ ✓ Test downlinks before production │
│ ✓ Reboot after setting changes     │
│ ✓ Monitor battery levels           │
│ ✓ Use continuous register blocks   │
│ ✓ Document custom modifications    │
│ ✓ Keep codec and config in sync    │
└────────────────────────────────────┘
```

## Deployment Scenarios

### Scenario 1: Building Automation

```
Devices (AN-303, W8004) 
    → ChirpStack + Codec
    → IoT Hub Gateway
    → BACnet BIP
    → Building Management System (BMS)
    → HVAC Control, Monitoring
```

### Scenario 2: Industrial Monitoring

```
Devices (DS-501, sensors)
    → ChirpStack + Codec
    → IoT Hub Gateway
    → Modbus TCP
    → SCADA / PLC
    → Process Control, Energy Management
```

### Scenario 3: Smart Home

```
Devices (multiple types)
    → ChirpStack + Codec
    → MQTT Broker
    → Home Assistant / OpenHAB
    → Dashboard, Automation, Alerts
```

### Scenario 4: Hybrid Integration

```
Devices (all types)
    → ChirpStack + Codec
    → IoT Hub Gateway
    ├─→ Modbus TCP → SCADA
    ├─→ BACnet BIP → BMS
    ├─→ MQTT → Dashboard
    └─→ REST API → Custom App
```

## Performance Characteristics

```
┌──────────────────────────────────────────┐
│         Performance Metrics              │
├──────────────────────────────────────────┤
│ Codec Execution Time: < 10ms             │
│ Supported Devices: 50+ models           │
│ Max Payload Size: 256 bytes              │
│ Protocol Types: 40+ LPP types            │
│ Modbus Registers: 1200+ available       │
│ BACnet Objects: 100 per device          │
│ Test Coverage: 57 automated tests       │
│ Documentation: 4000+ lines               │
└──────────────────────────────────────────┘
```

## Future Extensibility

```
Easy to add:
  ├─ New device models → Update MODEL_MAP
  ├─ New LPP types → Add case in decoder
  ├─ New attributes → Update iot_hub config
  ├─ Custom commands → Extend encodeDownlink
  └─ Integration → Use standard JSON output

Maintained compatibility:
  ├─ Backward compatible with existing devices
  ├─ JSON output format stable
  ├─ Register mappings versioned
  └─ Protocol version byte reserved
```
