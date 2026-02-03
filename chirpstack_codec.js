/**
 * ============================================================================
 * Unified ChirpStack JS Codec for All IoT Devices
 * ============================================================================
 * 
 * This codec is compatible with all devices using the custom LPP-like protocol.
 * It supports ChirpStack v4.16.0+ format.
 * 
 * PROTOCOL OVERVIEW:
 * ==================
 * 
 * UPLINK (Fport 210):
 * ------------------
 * All devices use the same uplink format with custom LPP (Low Power Payload) protocol.
 * 
 * Payload Structure:
 *   Byte 0: Reserved for protocol version (currently 0x00)
 *   Byte 1+: Type-Value pairs: [Type1][Value1][Type2][Value2]...
 * 
 * Each Type byte defines the data that follows:
 *   - Type determines the value length and format
 *   - Values can be 1-N bytes depending on type
 *   - Parsing continues until end of payload
 * 
 * Common LPP Types:
 *   0x01 - Model ID (1 byte): Device model identifier
 *   0x02 - Downlink count (4 bytes): Number of downlinks received
 *   0x03 - Tamper event (1 byte): Tamper detection event
 *   0x04 - Battery voltage (2 bytes BE): Voltage in mV
 *   0x05 - Battery event (1 byte): Battery low voltage event
 *   0x06 - Boot version (string): Null-terminated firmware boot version
 *   0x07 - Main version (string): Null-terminated main firmware version
 *   0x08 - App version (string): Null-terminated application version
 *   0x09 - Hardware version (string): Null-terminated hardware version
 *   0x0a - P2P update frequency (4 bytes): P2P update frequency
 *   0x0b - P2P config frequency (4 bytes): P2P config frequency
 *   0x0c - Radio chip (string): Null-terminated radio chip model
 *   0x0d - Reset cause (string): Null-terminated reset reason
 *   0x0e - LoRaWAN region (string): Null-terminated region info
 *   0x0f - AT response (string): Null-terminated AT command response
 *   0x10 - Temperature (2 bytes BE, signed): Temperature in °C * 100
 *   0x11 - Temperature event (1 byte): Temperature threshold event
 *   0x12 - Humidity (2 bytes BE): Humidity in %RH * 10
 *   0x13 - Humidity event (1 byte): Humidity threshold event
 *   0x14 - SOS button (1 byte): SOS/Emergency button press event
 *   0x15 - Gas concentration (2 bytes BE): Gas concentration in ppm
 *   0x18 - Magnet/Door state (1 byte): Door sensor state
 *   0x22 - Relay state (1 byte): Socket/relay state
 *   0x77 - Tamper state (1 byte): Current tamper status
 *   0x78 - Heartbeat interval (4 bytes BE): Heartbeat interval in seconds
 *   0x79 - Local time (4 bytes BE): Unix timestamp
 *   0x7d - Battery voltage state (1 byte): Battery status (0=normal, 1=low)
 *   0x80 - Timer status (4 bytes BE): Timer configuration bitfield
 *   0x94 - RS485 address (1 byte): Modbus RS485 slave address
 *   0x95 - Modbus data (variable): Modbus register data block
 *   0x96 - Lock state (1 byte): Lock/unlock state
 *   0x97 - Voltage RMS (2 bytes BE): AC voltage in V * 10
 *   0x98 - Current RMS (2 bytes BE): AC current in A * 100
 *   0x99 - Active power (2 bytes BE, signed): Power in W * 100
 *   0x9a - Energy consumption (4 bytes BE): Energy in kWh * 100
 * 
 * DOWNLINK:
 * ---------
 * 
 * 1. AT Commands (Fport 220):
 *    All devices support AT commands for configuration and control.
 *    Format: 0xFF + ASCII(AT command) + 0x0D 0x0A (CRLF)
 *    
 *    Example AT Commands:
 *      - AT+REBOOT           : Reboot device
 *      - AT+HBTPKTTIMS=3600  : Set heartbeat interval to 3600 seconds
 *    
 *    Multiple Commands:
 *      Separate commands with CRLF (0x0D 0x0A)
 *      Always place AT+REBOOT as the last command when setting parameters
 *    
 *    Example: Send "AT+REBOOT"
 *      Payload: FF 41 54 2B 52 45 42 4F 4F 54 0D 0A
 *      Fport: 220
 * 
 * 2. Control Commands (Fport 2):
 *    Used for device-specific control operations.
 *    Format varies by device type and is defined in device documentation.
 *    
 *    Common control fields (use numeric values for Modbus/BACnet compatibility):
 *      - powerState: 0=off, 1=on
 *      - lockState: 0=unlocked, 1=locked
 *      - setTemperature: Numeric value (will be scaled internally)
 *      - workMode: 0=auto, 1=cool, 2=heat, 3=vent
 *      - fanSpeed: 0=off, 1=low, 2=mid, 3=high, 4=auto
 * 
 * MODBUS TCP & BACNET BIP INTEGRATION:
 * ====================================
 * 
 * This decoder is designed for seamless integration with Modbus TCP and BACnet BIP:
 * 
 * - All control fields use NUMERIC values (not strings) for direct mapping
 * - Raw payload data is excluded to reduce bandwidth
 * - Field names match the iot_hub configuration for consistent mapping
 * 
 * Modbus TCP Mapping:
 *   - Only Holding registers (4x) are used
 *   - Registers are allocated in continuous blocks per device type
 *   - Mapping modes: single, big_endian, little_endian, string, binary
 *   - Scale factors defined in iot_hub configuration
 * 
 * BACnet BIP Mapping:
 *   - Each device occupies 100 object instance slots
 *   - Object instance = (bacnet_id * 100) + bacnet_instance_offset
 *   - Object types: AI (Analog Input), AO (Analog Output), AV (Analog Value),
 *                   BI (Binary Input), BO (Binary Output), BV (Binary Value),
 *                   CV (CharacterString Value)
 * 
 * FIELD CONSISTENCY:
 * ==================
 * 
 * Common fields are reused across all device types:
 *   - powerState: Power on/off control (replaces device-specific power fields)
 *   - lockState: Lock/unlock control (unified for all lock types)
 *   - temperature: Ambient temperature reading
 *   - humidity: Relative humidity reading
 *   - batteryVoltage: Battery voltage in volts
 *   - model: Device model string
 *   - rssi: Signal strength indicator
 *   - snr: Signal-to-noise ratio
 * 
 * This ensures consistent Modbus/BACnet addressing across all devices.
 */

/* ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================ */

/**
 * Device model mapping (0x01 type)
 * Maps model code byte to human-readable model string
 */
const MODEL_MAP = {
  0x01: "AN-301",      0x02: "AN-302",      0x03: "AN-303",      0x04: "AN-304",
  0x05: "AN-102D",     0x07: "M100C",       0x08: "M101A",       0x09: "M102A",
  0x0a: "M300C",       0x0b: "AN-103A",     0x0c: "AN-101",      0x0d: "AN-102C",
  0x0e: "AN-106",      0x0f: "AN-202A",     0x10: "AN-203A",     0x11: "AN-204A",
  0x12: "EFM02",       0x13: "kongqihezi",  0x14: "lajitong",    0x15: "GPS",
  0x16: "AN-305D",     0x17: "EL300A",      0x18: "CM101",       0x19: "AN-217",
  0x1a: "kongqikaiguan", 0x1b: "JTY-GD-H605", 0x1c: "AN-219",    0x1d: "WN_SJSYOA",
  0x1e: "xiongpai",    0x20: "AN-220",      0x21: "IA100A",      0x22: "AN-214",
  0x23: "AN-215",      0x24: "AN-305A",     0x25: "AN-305B",     0x26: "AN-305C",
  0x27: "AN-310",      0x29: "FP100A",      0x2a: "SENSOR_BOX_AGRIC",
  0x2b: "SENSOR_BOX_MODBUS", 0x2c: "AN-207", 0x2d: "AN-208",     0x2e: "AN-108B",
  0x2f: "AN-122",      0x30: "AN-201C",     0x31: "CU300A",      0x32: "JTY-GD-H605",
  0x33: "Ci-TC-01",    0x34: "AN-211A",     0x35: "AN-307",      0x3b: "M101A-AN-113",
  0x3c: "M300C-AN-113", 0x3d: "Q9_AN204C",  0x3e: "AJ761",       0x3f: "AN-103C",
  0x40: "D-BOX",       0x41: "AN-223",      0x42: "AN_JTY_GD_H386", 0x43: "JC-RS801",
  0x44: "AN-306",      0x45: "AN-308",      0x46: "W8004",       0x47: "DS803",
  0x48: "DS-501",      0x49: "CU600",       0x4a: "CU601",       0x4b: "CU606",
  0x4e: "AN-224",      0x4f: "EX-201",      0x50: "M200C",       0x51: "JTY-AN-503A",
  0x55: "EX-205"
};

/**
 * Read unsigned 8-bit integer
 */
function readUint8(bytes, idx) {
  return bytes[idx] & 0xFF;
}

/**
 * Read signed 16-bit integer (big-endian)
 */
function readInt16BE(bytes, idx) {
  const val = ((bytes[idx] & 0xFF) << 8) | (bytes[idx + 1] & 0xFF);
  return val & 0x8000 ? val - 0x10000 : val;
}

/**
 * Read unsigned 16-bit integer (big-endian)
 */
function readUint16BE(bytes, idx) {
  return ((bytes[idx] & 0xFF) << 8) | (bytes[idx + 1] & 0xFF);
}

/**
 * Read unsigned 32-bit integer (big-endian)
 */
function readUint32BE(bytes, idx) {
  return (
    ((bytes[idx] & 0xFF) << 24) |
    ((bytes[idx + 1] & 0xFF) << 16) |
    ((bytes[idx + 2] & 0xFF) << 8) |
    (bytes[idx + 3] & 0xFF)
  ) >>> 0;
}

/**
 * Read null-terminated ASCII string
 * Returns object with {str, nextIndex}
 */
function readStringNullTerm(bytes, idx) {
  let str = '';
  let i = idx;
  while (i < bytes.length && bytes[i] !== 0x00) {
    str += String.fromCharCode(bytes[i] & 0xFF);
    i++;
  }
  return { str: str, nextIndex: i + 1 };
}

/**
 * Convert two bytes to unsigned 16-bit (big-endian)
 */
function toUint16(b1, b2) {
  return ((b1 & 0xFF) << 8) | (b2 & 0xFF);
}

/**
 * Convert two bytes to signed 16-bit (big-endian)
 */
function toInt16(b1, b2) {
  const v = toUint16(b1, b2);
  return v & 0x8000 ? v - 0x10000 : v;
}

/**
 * Convert four bytes to unsigned 32-bit (big-endian)
 */
function toUint32(b1, b2, b3, b4) {
  return (
    ((b1 & 0xFF) << 24) |
    ((b2 & 0xFF) << 16) |
    ((b3 & 0xFF) << 8) |
    (b4 & 0xFF)
  ) >>> 0;
}

/**
 * Parse Modbus data block (type 0x95)
 * Used by W8004 thermostat and other Modbus devices
 * 
 * Modbus Block Structure:
 *   First 2 bytes: Block identifier or first register value
 *   Remaining bytes: Register values (2 bytes per register, big-endian)
 * 
 * Special Blocks:
 *   0xF000 - Remote control status block (control commands response)
 *   Other  - Normal device status block (starts from register 0x0000)
 */
function parseModbusBlock(modBytes, out) {
  if (!modBytes || modBytes.length < 2) return;
  
  const blockId = toUint16(modBytes[0], modBytes[1]);
  
  // Remote control status block (0xF000+)
  if (blockId === 0xF000) {
    let offset = 2;
    let register = 0xF000;
    
    while (offset + 1 < modBytes.length) {
      const val = toUint16(modBytes[offset], modBytes[offset + 1]);
      const valLow = val & 0xFF;
      
      switch (register) {
        case 0xF000: // Remote power state
          out.powerState = valLow;
          break;
        case 0xF001: // Remote key lock state
          out.keyLockState = valLow;
          break;
        case 0xF002: // Remote reboot state
          out.rebootState = valLow;
          break;
        case 0xF003: // Remote clear state
          out.clearState = valLow;
          break;
        case 0xF004: // Wireless signal strength
          out.signalStrength = valLow;
          break;
      }
      
      offset += 2;
      register += 1;
    }
    return;
  }
  
  // Normal status block (starts from register 0x0000)
  let offset = 2;
  let register = 0x0000;
  
  while (offset + 1 < modBytes.length) {
    const valU = toUint16(modBytes[offset], modBytes[offset + 1]);
    const valS = toInt16(modBytes[offset], modBytes[offset + 1]);
    
    switch (register) {
      case 0x0000: // Device version (hardware:software)
        out.hardwareVersion = (valU >> 8) & 0xFF;
        out.softwareVersion = valU & 0xFF;
        break;
      case 0x0001: // Device status bits
        const status = valU & 0xFF;
        out.powerState = (status & 0x01) === 0 ? 1 : 0; // Bit 0: 0=on, 1=off
        out.keyLockState = (status & 0x02) ? 1 : 0;     // Bit 1: key lock
        out.valveState = (status & 0x04) ? 0 : 1;       // Bit 2: valve (0=open, 1=close)
        break;
      case 0x0002: // Current temperature (°C * 100)
        out.temperature = valS / 100.0;
        break;
      case 0x0003: // Current humidity (%RH * 100)
        out.humidity = valU / 100.0;
        break;
      case 0x0004: // Set temperature (°C * 100)
        out.setTemperature = valS / 100.0;
        break;
      case 0x0005: // Work mode
        out.workMode = valU & 0xFF;
        break;
      case 0x0006: // Fan speed
        out.fanSpeed = valU & 0xFF;
        break;
      case 0x0007: // Cumulative on time (value * 10 minutes)
        out.cumulativeOnTime = valU * 10;
        break;
      case 0x0008: // Cumulative valve open time (value * 10 minutes)
        out.cumulativeValveOpenTime = valU * 10;
        break;
    }
    
    offset += 2;
    register += 1;
  }
}

/* ============================================================================
 * UPLINK DECODER
 * ============================================================================ */

/**
 * Decode uplink message from any device
 * 
 * @param {object} input
 * @param {number[]} input.bytes - Byte array containing the uplink payload
 * @param {number} input.fPort - Uplink fPort (expected: 210)
 * @param {Record<string, string>} input.variables - Configured device variables
 * 
 * @returns {{data: object, errors: string[], warnings: string[]}}
 */
function decodeUplink(input) {
  const bytes = input.bytes || [];
  const fPort = input.fPort;
  const errors = [];
  const warnings = [];
  const data = {};

  // Validate fPort
  if (fPort !== 210) {
    warnings.push("Expected fPort 210, got " + fPort + " - decoder may not work correctly");
    if (fPort !== 210 && fPort !== 2 && fPort !== 220) {
      errors.push("Unsupported fPort: " + fPort);
      return { data, errors, warnings };
    }
  }

  // Validate minimum payload length
  if (!bytes || bytes.length < 2) {
    errors.push("Payload too short (minimum 2 bytes required)");
    return { data, errors, warnings };
  }

  // Parse LPP protocol
  // First byte is reserved for protocol version
  let idx = 1;

  while (idx < bytes.length) {
    const type = bytes[idx];
    idx++;

    if (type === undefined) break;

    try {
      switch (type) {
        case 0x01: // Model ID (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated model field"); break; }
          const modelCode = bytes[idx++];
          data.model = MODEL_MAP[modelCode] || ("unknown_0x" + modelCode.toString(16));
          break;

        case 0x02: // Downlink count (4 bytes BE)
          if (idx + 4 > bytes.length) { warnings.push("Truncated downlink count"); break; }
          data.downlinkCount = readUint32BE(bytes, idx);
          idx += 4;
          break;

        case 0x03: // Tamper event (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated tamper event"); break; }
          data.tamperEvent = bytes[idx++];
          break;

        case 0x04: // Battery voltage (2 bytes BE, mV)
          if (idx + 2 > bytes.length) { warnings.push("Truncated battery voltage"); break; }
          const battVoltage = readUint16BE(bytes, idx);
          data.batteryVoltage = Number((battVoltage / 1000).toFixed(3));
          idx += 2;
          break;

        case 0x05: // Battery voltage event (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated battery event"); break; }
          data.batteryVoltageEvent = bytes[idx++];
          break;

        case 0x06: // Boot version (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.bootVersion = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x07: // Main version (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.mainVersion = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x08: // App version (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.appVersion = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x09: // Hardware version (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.hardwareVersion = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x0a: // P2P update frequency (4 bytes BE)
          if (idx + 4 > bytes.length) { warnings.push("Truncated P2P update frequency"); break; }
          data.p2pUpdateFrequency = readUint32BE(bytes, idx);
          idx += 4;
          break;

        case 0x0b: // P2P config frequency (4 bytes BE)
          if (idx + 4 > bytes.length) { warnings.push("Truncated P2P config frequency"); break; }
          data.p2pConfigFrequency = readUint32BE(bytes, idx);
          idx += 4;
          break;

        case 0x0c: // Radio chip (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.radioChip = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x0d: // Reset cause (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.resetCause = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x0e: // LoRaWAN region (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.lorawanRegion = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x0f: // AT response (null-terminated string)
          {
            const result = readStringNullTerm(bytes, idx);
            data.atResponse = result.str;
            idx = result.nextIndex;
          }
          break;

        case 0x10: // Temperature (2 bytes BE, signed, °C * 100)
          if (idx + 2 > bytes.length) { warnings.push("Truncated temperature"); break; }
          const temp = readInt16BE(bytes, idx);
          data.temperature = Number((temp / 100).toFixed(2));
          idx += 2;
          break;

        case 0x11: // Temperature event (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated temperature event"); break; }
          data.temperatureEvent = bytes[idx++];
          break;

        case 0x12: // Humidity (2 bytes BE, %RH * 10)
          if (idx + 2 > bytes.length) { warnings.push("Truncated humidity"); break; }
          const hum = readUint16BE(bytes, idx);
          data.humidity = Number((hum / 10).toFixed(1));
          idx += 2;
          break;

        case 0x13: // Humidity event (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated humidity event"); break; }
          data.humidityEvent = bytes[idx++];
          break;

        case 0x14: // SOS button event (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated SOS event"); break; }
          data.sosEvent = bytes[idx++];
          break;

        case 0x15: // Gas concentration (2 bytes BE, ppm)
          if (idx + 2 > bytes.length) { warnings.push("Truncated gas concentration"); break; }
          data.gasConcentration = readUint16BE(bytes, idx);
          idx += 2;
          break;

        case 0x18: // Magnet/Door state (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated door state"); break; }
          data.doorState = bytes[idx++];
          break;

        case 0x22: // Relay/Socket state (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated relay state"); break; }
          data.powerState = bytes[idx++]; // Use powerState for consistency
          break;

        case 0x77: // Tamper state (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated tamper state"); break; }
          data.tamper = bytes[idx++];
          break;

        case 0x78: // Heartbeat interval (4 bytes BE, seconds)
          if (idx + 4 > bytes.length) { warnings.push("Truncated heartbeat interval"); break; }
          data.heartbeatInterval = readUint32BE(bytes, idx);
          idx += 4;
          break;

        case 0x79: // Local time (4 bytes BE, Unix timestamp)
          if (idx + 4 > bytes.length) { warnings.push("Truncated timestamp"); break; }
          const timestamp = readUint32BE(bytes, idx);
          if (timestamp !== 0) {
            data.timestamp = timestamp;
            data.localTime = new Date(timestamp * 1000).toISOString();
          }
          idx += 4;
          break;

        case 0x7d: // Battery voltage state (1 byte, 0=normal, 1=low)
          if (idx >= bytes.length) { warnings.push("Truncated battery voltage state"); break; }
          data.batteryVoltageState = bytes[idx++];
          break;

        case 0x80: // Timer status (4 bytes BE, bitfield)
          if (idx + 4 > bytes.length) { warnings.push("Truncated timer status"); break; }
          const timerStatus = readUint32BE(bytes, idx);
          data.timerStatus = timerStatus;
          data.timerCloseEnabled = (timerStatus & 0x01) !== 0;
          data.timerOpenEnabled = (timerStatus & 0x02) !== 0;
          data.timerLockEnabled = (timerStatus & 0x40000000) !== 0;
          data.timerUnlockEnabled = (timerStatus & 0x80000000) !== 0;
          idx += 4;
          break;

        case 0x94: // RS485 address (1 byte)
          if (idx >= bytes.length) { warnings.push("Truncated RS485 address"); break; }
          data.rs485Addr = bytes[idx++];
          break;

        case 0x95: // Modbus data block (variable length)
          if (idx >= bytes.length) { warnings.push("Missing Modbus data length"); break; }
          const modbusLen = bytes[idx++];
          if (idx + modbusLen > bytes.length) {
            warnings.push("Modbus block exceeds payload, trimming");
          }
          const endIdx = Math.min(idx + modbusLen, bytes.length);
          const modbusBytes = bytes.slice(idx, endIdx);
          parseModbusBlock(modbusBytes, data);
          idx = endIdx;
          break;

        case 0x96: // Lock state (1 byte, 0=unlocked, 1=locked)
          if (idx >= bytes.length) { warnings.push("Truncated lock state"); break; }
          data.lockState = bytes[idx++];
          break;

        case 0x97: // Voltage RMS (2 bytes BE, V * 10)
          if (idx + 2 > bytes.length) { warnings.push("Truncated voltage"); break; }
          const voltage = readUint16BE(bytes, idx);
          data.voltage = Number((voltage / 10).toFixed(1));
          idx += 2;
          break;

        case 0x98: // Current RMS (2 bytes BE, A * 100)
          if (idx + 2 > bytes.length) { warnings.push("Truncated current"); break; }
          const current = readUint16BE(bytes, idx);
          data.current = Number((current / 100).toFixed(2));
          idx += 2;
          break;

        case 0x99: // Active power (2 bytes BE, signed, W * 100)
          if (idx + 2 > bytes.length) { warnings.push("Truncated power"); break; }
          const power = readInt16BE(bytes, idx);
          data.activePower = Number((power / 100).toFixed(2));
          idx += 2;
          break;

        case 0x9a: // Energy consumption (4 bytes BE, kWh * 100)
          if (idx + 4 > bytes.length) { warnings.push("Truncated energy"); break; }
          const energy = readUint32BE(bytes, idx);
          data.energy = Number((energy / 100).toFixed(2));
          idx += 4;
          break;

        default:
          // Unknown type - log warning and stop parsing to avoid misalignment
          warnings.push("Unknown type 0x" + type.toString(16) + " at position " + (idx - 1) + ", stopping parse");
          idx = bytes.length;
          break;
      }
    } catch (error) {
      errors.push("Parse error at type 0x" + type.toString(16) + ": " + error.message);
      break;
    }
  }

  return { data, errors, warnings };
}

/* ============================================================================
 * DOWNLINK ENCODER
 * ============================================================================ */

/**
 * Encode downlink message to device
 * 
 * Supports three modes:
 * 1. AT Commands (input.data.at) -> fPort 220
 * 2. Device Control (input.data.{powerState, lockState, etc.}) -> fPort 2
 * 3. Raw Bytes (input.data.rawBytes) -> fPort 2
 * 
 * @param {object} input
 * @param {object} input.data - Payload data to encode
 * @param {Record<string, string>} input.variables - Configured device variables
 * 
 * @returns {{bytes: number[], fPort: number, errors: string[], warnings: string[]}}
 */
function encodeDownlink(input) {
  const data = input.data || {};
  const errors = [];
  const warnings = [];
  let bytes = [];
  let fPort = 2; // Default to control commands

  // ============================================================
  // MODE 1: AT Commands (fPort 220)
  // ============================================================
  // Format: 0xFF + ASCII(command) + CRLF
  // Multiple commands separated by CRLF
  // ============================================================
  if (data.at !== undefined && data.at !== null) {
    const atCommands = Array.isArray(data.at) ? data.at : [data.at];
    const cmdStrings = [];
    
    for (let cmd of atCommands) {
      const cmdStr = String(cmd).replace(/\r?\n/g, ''); // Remove any existing newlines
      if (cmdStr.length > 0) {
        cmdStrings.push(cmdStr);
      }
    }
    
    if (cmdStrings.length === 0) {
      errors.push("Empty AT command provided");
      return { bytes: [], fPort: 220, errors, warnings };
    }
    
    // Build payload: 0xFF + commands + CRLF
    bytes = [0xFF];
    const joinedCmds = cmdStrings.join("\r\n") + "\r\n";
    for (let i = 0; i < joinedCmds.length; i++) {
      bytes.push(joinedCmds.charCodeAt(i) & 0xFF);
    }
    
    return { bytes, fPort: 220, errors, warnings };
  }

  // ============================================================
  // MODE 2: Raw Bytes (fPort 2)
  // ============================================================
  if (Array.isArray(data.rawBytes) && data.rawBytes.length > 0) {
    bytes = data.rawBytes.map(b => b & 0xFF);
    return { bytes, fPort: 2, errors, warnings };
  }

  // ============================================================
  // MODE 3: Device Control Commands (fPort 2)
  // ============================================================
  // Supported fields (use numeric values only):
  //   - powerState: 0=off, 1=on
  //   - lockState: 0=unlocked, 1=locked
  //   - setTemperature: numeric value (°C)
  //   - workMode: 0=auto, 1=cool, 2=heat, 3=vent
  //   - fanSpeed: 0=off, 1=low, 2=mid, 3=high, 4=auto
  //   - keyLockState: 0=unlocked, 1=locked
  // ============================================================

  // DS-501 Smart Socket Commands
  if (data.model === "DS-501" || data.model === "DS501") {
    const header = [0x09, 0x48]; // DS-501 command header
    
    if (data.command !== undefined) {
      const command = String(data.command).toLowerCase();
      
      switch (command) {
        case 'query':
          bytes = header.concat([0x0E]);
          break;
        case 'immediate_off':
        case 'power_off':
          bytes = header.concat([0x00, 0x01]);
          break;
        case 'immediate_on':
        case 'power_on':
          bytes = header.concat([0x01, 0x01]);
          break;
        case 'unlock':
          bytes = header.concat([0x02]);
          break;
        case 'lock':
          bytes = header.concat([0x03]);
          break;
        default:
          errors.push("Unknown DS-501 command: " + data.command);
      }
    } else if (data.powerState !== undefined) {
      const state = Number(data.powerState);
      bytes = header.concat([state ? 0x01 : 0x00, 0x01]);
    } else if (data.lockState !== undefined) {
      const state = Number(data.lockState);
      bytes = header.concat([state ? 0x03 : 0x02]);
    }
    
    if (bytes.length > 0) {
      return { bytes, fPort: 2, errors, warnings };
    }
  }

  // W8004 Thermostat Commands (Modbus-based)
  if (data.model === "W8004" || data.setTemperature !== undefined || data.workMode !== undefined || data.fanSpeed !== undefined) {
    // W8004 uses Modbus commands over LoRaWAN
    // Format: 0x06/0x07 + Modbus frame
    
    // Single register write (0x06 command)
    if (data.setTemperature !== undefined) {
      const tempValue = Math.round(Number(data.setTemperature) * 100);
      const hiReg = 0x00, loReg = 0x04; // Register 0x0004
      const hiVal = (tempValue >> 8) & 0xFF;
      const loVal = tempValue & 0xFF;
      bytes = [0x06, 0x06, hiReg, loReg, hiVal, loVal];
      return { bytes, fPort: 2, errors, warnings };
    }
    
    if (data.workMode !== undefined) {
      const mode = Math.max(0, Math.min(3, Math.round(Number(data.workMode))));
      const hiReg = 0x00, loReg = 0x05; // Register 0x0005
      bytes = [0x06, 0x06, hiReg, loReg, 0x00, mode];
      return { bytes, fPort: 2, errors, warnings };
    }
    
    if (data.fanSpeed !== undefined) {
      const speed = Math.max(0, Math.min(4, Math.round(Number(data.fanSpeed))));
      const hiReg = 0x00, loReg = 0x06; // Register 0x0006
      bytes = [0x06, 0x06, hiReg, loReg, 0x00, speed];
      return { bytes, fPort: 2, errors, warnings };
    }
    
    if (data.powerState !== undefined) {
      const state = Number(data.powerState) ? 1 : 0;
      const hiReg = 0xF0, loReg = 0x00; // Register 0xF000
      bytes = [0x06, 0x06, hiReg, loReg, 0x00, state];
      return { bytes, fPort: 2, errors, warnings };
    }
    
    if (data.keyLockState !== undefined) {
      const state = Number(data.keyLockState) ? 1 : 0;
      const hiReg = 0xF0, loReg = 0x01; // Register 0xF001
      bytes = [0x06, 0x06, hiReg, loReg, 0x00, state];
      return { bytes, fPort: 2, errors, warnings };
    }
  }

  // Generic control command for other devices
  if (data.powerState !== undefined) {
    const state = Number(data.powerState) ? 1 : 0;
    bytes = [0x01, state]; // Simple power control
    return { bytes, fPort: 2, errors, warnings };
  }

  if (data.lockState !== undefined) {
    const state = Number(data.lockState) ? 1 : 0;
    bytes = [0x02, state]; // Simple lock control
    return { bytes, fPort: 2, errors, warnings };
  }

  // No valid command found
  warnings.push("No valid downlink command specified");
  warnings.push("Available options:");
  warnings.push("  - AT commands: {at: 'AT+REBOOT'} or {at: ['AT+HBTPKTTIMS=3600', 'AT+REBOOT']}");
  warnings.push("  - Device control: {powerState: 0/1}, {lockState: 0/1}, {setTemperature: 25.5}, etc.");
  warnings.push("  - Raw bytes: {rawBytes: [0x01, 0x02, 0x03]}");
  
  return { bytes: [], fPort: 2, errors, warnings };
}
