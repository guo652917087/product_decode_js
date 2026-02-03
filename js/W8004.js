/**
 * ChirpStack decodeUplink / encodeDownlink for 温控器 (Thermostat device) sensor
 *
 * - Uplink fPort: 210 (custom LPP-like protocol)
 *   payload: [reserved][type][value]...
 *   type 0x01: model (1 byte)
 *   type 0x94: RS485 addr (1 byte)
 *   type 0x95: MODBUS data: [len][modbus bytes...]
 *     NOTE: device's modbus block layout (as in examples):
 *       first 2 bytes = "运行状态数据" (special status)
 *       then registers starting from 0x0000 in order, each 2 bytes
 *       0x0000 device version (high byte hardware, low byte software)
 *       0x0001 device status (low byte bits)
 *       0x0002 current temperature (value/100)
 *       0x0003 current humidity (value/100)
 *       0x0004 set temperature (value/100)
 *       0x0005 work mode (low byte)
 *       0x0006 wind speed (low byte)
 *       0x0007 累计开机时长 (value * 10 minutes)
 *       0x0008 累计阀开时长 (value * 10 minutes)
 *       0x0009 累计高速运行时长 (value * 10 minutes)
 *       0x000A 累计中速运行时长 (value * 10 minutes)
 *       0x000B 累计低速运行时长 (value * 10 minutes)
 *
 * - Downlink fPort: 220
 *   - AT commands: input.data.at (string) -> payload = 0xFF + ascii(command) + CRLF
 *   - Modbus raw: input.data.modbusBytes (array of numbers) OR input.data.modbusHex (hex string)
 *   - Control commands: single property control (06指令) or multiple properties (07指令)
 */


/* Helper functions */

/**
 * Convert two bytes to unsigned 16-bit integer (big-endian)
 */
function toUint16(b1, b2) {
  return ((b1 & 0xFF) << 8) | (b2 & 0xFF);
}

/**
 * Convert two bytes to signed 16-bit integer (big-endian)
 */
function toInt16(b1, b2) {
  var v = toUint16(b1, b2);
  return v & 0x8000 ? v - 0x10000 : v;
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex) {
  hex = hex.replace(/\s+/g, '');
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const out = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.substr(i, 2), 16));
  }
  return out;
}

/**
 * Read null-terminated string from byte array
 */
function readStringNullTerm(bytes, startIndex) {
  let str = '';
  let i = startIndex;
  while (i < bytes.length && bytes[i] !== 0x00) {
    str += String.fromCharCode(bytes[i]);
    i++;
  }
  return { str, nextIndex: i + 1 };
}

/**
 * Calculate Modbus CRC16 (standard algorithm)
 */
function modbusCRC16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] & 0xFF;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  // Return as little-endian bytes
  return [(crc & 0xFF), ((crc >> 8) & 0xFF)];
}

/* Device model mapping */
const MODEL_MAP = {
  0x01: "AN-301",
  0x02: "AN-302",
  0x03: "AN-303",
  0x04: "AN-304",
  0x05: "AN-102D",
  0x07: "M100C",
  0x08: "M101A",
  0x09: "M102A",
  0x0a: "M300C",
  0x0b: "AN-103A",
  0x0c: "AN-101",
  0x0d: "AN-102C",
  0x0e: "AN-106",
  0x0f: "AN-202A",
  0x10: "AN-203A",
  0x11: "AN-204A",
  0x12: "EFM02",
  0x13: "kongqihezi",
  0x14: "lajitong",
  0x15: "GPS",
  0x16: "AN-305D",
  0x17: "EL300A",
  0x18: "CM101",
  0x19: "AN-217",
  0x1a: "kongqikaiguan",
  0x1b: "JTY-GD-H605",
  0x1c: "AN-219",
  0x1d: "WN_SJSYOA",
  0x1e: "xiongpai",
  0x20: "AN-220",
  0x21: "IA100A",
  0x22: "AN-214",
  0x23: "AN-215",
  0x24: "AN-305A",
  0x25: "AN-305B",
  0x26: "AN-305C",
  0x27: "AN-310",
  0x29: "FP100A",
  0x2a: "SENSOR_BOX_AGRIC",
  0x2b: "SENSOR_BOX_MODBUS",
  0x2c: "AN-207",
  0x2d: "AN-208",
  0x2e: "AN-108B",
  0x2f: "AN-122",
  0x30: "AN-201C",
  0x31: "CU300A",
  0x32: "JTY-GD-H605",
  0x33: "Ci-TC-01",
  0x34: "AN-211A",
  0x35: "AN-307",
  0x3b: "M101A-AN-113",
  0x3c: "M300C-AN-113",
  0x3d: "Q9_AN204C",
  0x3e: "AJ761",
  0x3f: "AN-103C",
  0x40: "D-BOX",
  0x41: "AN-223",
  0x42: "AN_JTY_GD_H386",
  0x43: "JC-RS801",
  0x44: "AN-306",
  0x45: "AN-308",
  0x46: "W8004",
  0x47: "DS803",
  0x48: "DS501",
  0x49: "CU600",
  0x4a: "CU601",
  0x4b: "CU606",
  0x4e: "AN-224",
  0x4f: "EX-201",
  0x50: "M200C",
  0x51: "JTY-AN-503A",
  0x55: "EX-205"
};

/* Modbus register address mapping for control commands */
const REGISTER_MAP = {
  setTemperature: 0x0004,      // Set temperature register
  workMode: 0x0005,            // Work mode register (0: auto, 1: cool, 2: heat, 3: vent)
  fanSpeed: 0x0006,            // Fan speed register (0: off, 1: low, 2: mid, 3: high, 4: auto)
  remotePower: 0xF000,         // Remote power control (0: off, 1: on)
  remoteLock: 0xF001,          // Remote key lock control (0: unlocked, 1: locked)
  remoteReboot: 0xF002,        // Remote reboot control (0: reboot success, 1: reboot request)
  remoteClear: 0xF003,         // Remote clear accumulated time (0: clear success, 1: clear request)
  wirelessSignal: 0xF004       // Wireless signal strength (0: offline, 1: poor, 2: good, 3: excellent)
};

/**
 * Convert user input value to Modbus register value based on field name
 * Uses numeric values only for compatibility with Modbus TCP and BACnet
 */
function getValueForRegister(fieldName, value) {
  // Ensure value is a number for compatibility
  const numValue = Number(value);
  
  switch (fieldName) {
    case 'setTemperature':
      // Temperature: multiply by 100 (e.g., 25.5°C -> 2550)
      return Math.round(numValue * 100);
      
    case 'workMode':
      // Work mode: 0-3
      return Math.max(0, Math.min(3, Math.round(numValue)));
      
    case 'fanSpeed':
      // Fan speed: 0-4
      return Math.max(0, Math.min(4, Math.round(numValue)));
      
    case 'remotePower':
      // Remote power: 0 or 1
      return numValue ? 1 : 0;
      
    case 'remoteLock':
      // Remote lock: 0 or 1
      return numValue ? 1 : 0;
      
    case 'remoteReboot':
      // Remote reboot: 0 or 1
      return numValue ? 1 : 0;
      
    case 'remoteClear':
      // Remote clear: 0 or 1
      return numValue ? 1 : 0;
      
    case 'wirelessSignal':
      // Wireless signal: 0-3
      return Math.max(0, Math.min(3, Math.round(numValue)));
      
    default:
      return numValue;
  }
}

/**
 * Parse Modbus data block from uplink payload
 */
function parseModbusBlock(modBytes, out) {
  if (!modBytes || modBytes.length === 0) return;

  const mod = modBytes;
  
  // Check block type
  if (mod.length >= 2) {
    const runStatus = toUint16(mod[0], mod[1]);
    
    // Special status block (remote control status)
    if (runStatus === 0xF000) {
      let offset = 2;
      let register = 0xF000;
      
      while (offset + 1 < mod.length) {
        const hi = mod[offset];
        const lo = mod[offset + 1];
        const valU = toUint16(hi, lo);
        const valLow = valU & 0xFF;
        
        switch (register) {
          case 0xF000:
            // Remote power control status
            out.powerState = valLow === 0 ? 0 : 1; // 0: off, 1: on
            break;
          case 0xF001:
            // Remote key lock status
            out.keyLockState = valLow; // 0: unlocked, 1: locked
            break;
          case 0xF002:
            // Remote reboot status
            out.rebootState = valLow; // 0: success, 1: request
            break;
          case 0xF003:
            // Remote clear status
            out.clearState = valLow; // 0: success, 1: request
            break;
          case 0xF004:
            // Wireless signal strength
            out.signalStrength = valLow; // 0-3
            break;
        }
        
        offset += 2;
        register += 1;
      }
      return;
    }
  }
  
  // Parse normal status block
  let offset = 2;
  let register = 0x0000;
  
  while (offset + 1 < mod.length) {
    const hi = mod[offset];
    const lo = mod[offset + 1];
    const valU = toUint16(hi, lo);
    const valS = toInt16(hi, lo);
    
    switch (register) {
      case 0x0000:
        // Device version
        out.deviceHardwareVersion = (valU >> 8) & 0xFF;
        out.deviceSoftwareVersion = valU & 0xFF;
        break;
      case 0x0001:
        // Device status bits
        const status = valU & 0xFF;
        // Use numeric values only
        out.powerState = (status & 0x01) === 0 ? 1 : 0; // 1: on, 0: off
        out.deviceKeyLockState = (status & 0x02) ? 1 : 0;    // 1: locked, 0: unlocked
        out.deviceValveState = (status & 0x04) ? 0 : 1;      // 1: open, 0: closed
        out.device26CLockState = (status & 0x08) ? 1 : 0;    // 1: locked, 0: unlocked
        break;
      case 0x0002:
        // Current temperature
        out.temperature = valS / 100.0;
        break;
      case 0x0003:
        // Current humidity
        out.humidity = valU / 100.0;
        break;
      case 0x0004:
        // Set temperature
        out.setTemperature = valS / 100.0;
        break;
      case 0x0005:
        // Work mode
        out.workMode = valU & 0xFF; // 0-3
        break;
      case 0x0006:
        // Fan speed
        out.fanSpeed = valU & 0xFF; // 0-4
        break;
      case 0x0007:
        // Cumulative power-on time (minutes)
        out.cumulativeOnTime = valU * 10;
        break;
      case 0x0008:
        // Cumulative valve-open time (minutes)
        out.cumulativeValveOpenTime = valU * 10;
        break;
      case 0x0009:
        // Cumulative high-speed run time (minutes)
        out.cumulativeHighSpeedTime = valU * 10;
        break;
      case 0x000A:
        // Cumulative medium-speed run time (minutes)
        out.cumulativeMidSpeedTime = valU * 10;
        break;
      case 0x000B:
        // Cumulative low-speed run time (minutes)
        out.cumulativeLowSpeedTime = valU * 10;
        break;
      case 0x000C:
        // RS485 address
        out.rs485Address = valU & 0xFF;
        break;
      case 0x000D:
        // Data collection interval (seconds)
        out.dataCollectionInterval = valU;
        break;
      case 0x000E:
        // Temperature compensation
        out.temperatureCompensation = valS / 100.0;
        break;
    }
    
    offset += 2;
    register += 1;
  }
}

/**
 * Decode uplink message from device
 */
function decodeUplink(input) {
  const bytes = input.bytes || [];
  const fPort = input.fPort;
  const errors = [];
  const warnings = [];
  const data = {};

  // Validate fPort
  if (fPort !== 210) {
    errors.push("Unexpected fPort: " + fPort + " (expected 210 for thermostat uplink)");
    return { data, errors, warnings };
  }
  
  if (!bytes || bytes.length < 2) {
    errors.push("Payload too short");
    return { data, errors, warnings };
  }

  // Parse LPP protocol
  let idx = 1;
  while (idx < bytes.length) {
    const type = bytes[idx++];
    if (type === undefined) break;

    switch (type) {
      case 0x01: // Device model
        if (idx >= bytes.length) { warnings.push("Truncated model field"); break; }
        const modelCode = bytes[idx++];
        data.model = MODEL_MAP[modelCode] || ("unknown(" + modelCode + ")");
        break;

      case 0x07: // Main version
        if (idx >= bytes.length) { warnings.push("Truncated main version"); break; }
        const mainResult = readStringNullTerm(bytes, idx);
        data.mainVersion = mainResult.str;
        idx = mainResult.nextIndex;
        break;

      case 0x08: // App version
        if (idx >= bytes.length) { warnings.push("Truncated app version"); break; }
        const appResult = readStringNullTerm(bytes, idx);
        data.appVersion = appResult.str;
        idx = appResult.nextIndex;
        break;

      case 0x09: // Hardware version
        if (idx >= bytes.length) { warnings.push("Truncated hardware version"); break; }
        const hwResult = readStringNullTerm(bytes, idx);
        data.hardwareVersion = hwResult.str;
        idx = hwResult.nextIndex;
        break;

      case 0x94: // RS485 address
        if (idx >= bytes.length) { warnings.push("Truncated RS485 address field"); break; }
        data.rs485Addr = bytes[idx++];
        break;

      case 0x95: // Modbus data block
        if (idx >= bytes.length) { warnings.push("Missing Modbus data length"); break; }
        const modbusLength = bytes[idx++];
        if (idx + modbusLength > bytes.length) {
          warnings.push("Modbus block length exceeds payload, trimming");
        }
        const endIndex = Math.min(idx + modbusLength, bytes.length);
        const modbusBytes = bytes.slice(idx, endIndex);
        parseModbusBlock(modbusBytes, data);
        idx = endIndex;
        break;

      default:
        // Generic handling
        if (idx < bytes.length) {
          // Store as generic type
          idx++;
        }
        break;
    }
  }

  return { data, errors, warnings };
}

/**
 * Encode downlink message to device
 */
function encodeDownlink(input) {
  const data = input.data || {};
  const errors = [];
  const warnings = [];
  let bytes = [];
  let fPort = 2;

  // Option 1: AT command
  if (typeof data.at === "string") {
    const cmd = data.at;
    const cmdBuf = [];
    for (let i = 0; i < cmd.length; i++) cmdBuf.push(cmd.charCodeAt(i) & 0xFF);
    bytes = [0xFF].concat(cmdBuf).concat([0x0D, 0x0A]);
    fPort = 220;
    return { bytes, fPort, errors, warnings };
  }

  // Option 2: Raw Modbus bytes
  if (Array.isArray(data.modbusBytes) && data.modbusBytes.length > 0) {
    bytes = data.modbusBytes.map(b => b & 0xFF);
    return { bytes, fPort, errors, warnings };
  }

  // Option 3: Hex string of Modbus data
  if (typeof data.modbusHex === "string" && data.modbusHex.trim().length > 0) {
    try {
      bytes = hexToBytes(data.modbusHex);
      return { bytes, fPort, errors, warnings };
    } catch (e) {
      errors.push("Invalid modbusHex: " + e.message);
      return { bytes: [], fPort, errors, warnings };
    }
  }

  // Option 4: Control commands
  const slaveAddr = data.slaveAddr || 0x01;
  const controlCommands = [];
  
  // Collect control commands
  for (const [fieldName, registerAddr] of Object.entries(REGISTER_MAP)) {
    if (data[fieldName] !== undefined) {
      const registerValue = getValueForRegister(fieldName, data[fieldName]);
      controlCommands.push({
        field: fieldName,
        address: registerAddr,
        value: registerValue
      });
    }
  }
  
  controlCommands.sort((a, b) => a.address - b.address);
  
  if (controlCommands.length === 0) {
    warnings.push("No control fields detected. Available fields: " + Object.keys(REGISTER_MAP).join(", "));
    return { bytes: [], fPort, errors, warnings };
  }
  
  // Check if registers are consecutive
  const areRegistersConsecutive = () => {
    for (let i = 1; i < controlCommands.length; i++) {
      if (controlCommands[i].address !== controlCommands[i-1].address + 1) {
        return false;
      }
    }
    return true;
  };
  
  // Smart instruction selection
  if (controlCommands.length === 1) {
    // Single register write (06 instruction)
    const cmd = controlCommands[0];
    const hiReg = (cmd.address >> 8) & 0xFF;
    const loReg = cmd.address & 0xFF;
    const hiVal = (cmd.value >> 8) & 0xFF;
    const loVal = cmd.value & 0xFF;
    
    bytes = [0x06, 0x06, hiReg, loReg, hiVal, loVal];
  } 
  else if (controlCommands.length >= 2 && areRegistersConsecutive()) {
    // Multi-register write (07 instruction)
    const startAddr = controlCommands[0].address;
    const regCount = controlCommands.length;
    const byteCount = regCount * 2;
    
    const modbusFrame = [
      slaveAddr & 0xFF,
      0x10,
      (startAddr >> 8) & 0xFF,
      startAddr & 0xFF,
      (regCount >> 8) & 0xFF,
      regCount & 0xFF,
      byteCount & 0xFF
    ];
    
    controlCommands.forEach(cmd => {
      modbusFrame.push((cmd.value >> 8) & 0xFF);
      modbusFrame.push(cmd.value & 0xFF);
    });
    
    const crc = modbusCRC16(modbusFrame);
    modbusFrame.push(crc[0], crc[1]);
    
    bytes = [0x07].concat(modbusFrame);
  }
  else {
    // Non-consecutive registers
    const cmd = controlCommands[0];
    const hiReg = (cmd.address >> 8) & 0xFF;
    const loReg = cmd.address & 0xFF;
    const hiVal = (cmd.value >> 8) & 0xFF;
    const loVal = cmd.value & 0xFF;
    
    bytes = [0x06, 0x06, hiReg, loReg, hiVal, loVal];
    
    warnings.push("Non-consecutive registers detected, only first command will be sent");
  }

  return { bytes, fPort, errors, warnings };
}
