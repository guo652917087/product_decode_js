/**
 * ChirpStack decodeUplink / encodeDownlink for DS-501 Smart Socket Panel
 * 
 * Device: DS-501 Smart Socket Panel
 * Uplink fPort: 210 (custom LPP-like protocol)
 * Downlink fPort: 2 (control commands)
 * 
 * Protocol Details:
 * - Uplink payload format: [reserved][type][value]...
 * - Downlink control commands use fPort 2 (format: 0x09 0x48 [command] [parameters...])
 */

/* Helper functions */

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
 * Convert byte array to hex string
 */
function bytesToHex(bytes) {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert bytes to unsigned 32-bit integer (big-endian)
 */
function toUint32(b1, b2, b3, b4) {
  return ((b1 & 0xFF) << 24) | ((b2 & 0xFF) << 16) | ((b3 & 0xFF) << 8) | (b4 & 0xFF);
}

/**
 * Convert bytes to unsigned 16-bit integer (big-endian)
 */
function toUint16(b1, b2) {
  return ((b1 & 0xFF) << 8) | (b2 & 0xFF);
}

/**
 * Convert bytes to signed 16-bit integer (big-endian)
 */
function toInt16(b1, b2) {
  var v = toUint16(b1, b2);
  return v & 0x8000 ? v - 0x10000 : v;
}

/**
 * Parse timestamp from bytes (Unix timestamp, big-endian)
 */
function parseTimestamp(bytes, offset) {
  if (offset + 4 > bytes.length) return null;
  return toUint32(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

/**
 * Decode uplink message from DS-501 smart socket
 */
function decodeUplink(input) {
  const bytes = input.bytes || [];
  const fPort = input.fPort;
  const errors = [];
  const warnings = [];
  const data = {};

  // Validate fPort
  if (fPort !== 210) {
    errors.push("Unexpected fPort: " + fPort + " (expected 210 for DS-501 uplink)");
    return { data, errors, warnings };
  }
  
  if (!bytes || bytes.length < 2) {
    errors.push("Payload too short");
    return { data, errors, warnings };
  }

  // Parse LPP-like protocol
  let idx = 0;
  let timestamp = null;
  
  while (idx < bytes.length) {
    const type = bytes[idx++];
    if (type === undefined) break;

    switch (type) {
      case 0x00: // Reserved
        // Skip reserved byte
        break;
        
      case 0x01: // Product model ID
        if (idx >= bytes.length) { warnings.push("Truncated product model field"); break; }
        const modelCode = bytes[idx++];
        data.model = modelCode === 0x48 ? "DS-501" : "unknown(" + modelCode + ")";
        data.modelCode = modelCode;
        break;
        
      case 0x79: // Timestamp (4 bytes, big-endian, Unix timestamp)
        if (idx + 4 > bytes.length) { warnings.push("Truncated timestamp field"); break; }
        timestamp = parseTimestamp(bytes, idx);
        if (timestamp !== 0) {
          data.timestamp = timestamp;
          data.localTime = new Date(timestamp * 1000).toISOString();
        }
        idx += 4;
        break;
        
      case 0x96: // Socket lock status
        if (idx >= bytes.length) { warnings.push("Truncated lock status field"); break; }
        const lockStatus = bytes[idx++];
        data.lockState = lockStatus; // 0: unlocked, 1: locked
        break;
        
      case 0x22: // Socket relay status
        if (idx >= bytes.length) { warnings.push("Truncated relay status field"); break; }
        const relayStatus = bytes[idx++];
        data.relayState = relayStatus; // 0: disconnected, 1: connected
        data.powerState = relayStatus; // Alias for compatibility
        break;
        
      case 0x80: // Socket timer status (4 bytes, big-endian)
        if (idx + 4 > bytes.length) { warnings.push("Truncated timer status field"); break; }
        const timerStatus = toUint32(bytes[idx], bytes[idx + 1], bytes[idx + 2], bytes[idx + 3]);
        data.timerStatus = timerStatus;
        // Parse individual bits
        data.timerCloseEnabled = (timerStatus & 0x01) !== 0; // Bit0: timer close enabled
        data.timerOpenEnabled = (timerStatus & 0x02) !== 0;  // Bit1: timer open enabled
        data.timerLockEnabled = (timerStatus & 0x40000000) !== 0;  // Bit30: timer lock enabled
        data.timerUnlockEnabled = (timerStatus & 0x80000000) !== 0; // Bit31: timer unlock enabled
        idx += 4;
        break;
        
      case 0x9A: // Energy consumption (4 bytes, big-endian, value/100 = kWh)
        if (idx + 4 > bytes.length) { warnings.push("Truncated energy field"); break; }
        const energy = toUint32(bytes[idx], bytes[idx + 1], bytes[idx + 2], bytes[idx + 3]);
        data.energy = energy / 100.0; // kWh
        data.energyRaw = energy;
        idx += 4;
        break;
        
      case 0x99: // Active power (2 bytes, signed big-endian, value/100 = W)
        if (idx + 2 > bytes.length) { warnings.push("Truncated power field"); break; }
        const power = toInt16(bytes[idx], bytes[idx + 1]);
        data.activePower = power / 100.0; // W
        data.power = data.activePower; // Alias
        idx += 2;
        break;
        
      case 0x97: // Voltage RMS (2 bytes, unsigned big-endian, value/10 = V)
        if (idx + 2 > bytes.length) { warnings.push("Truncated voltage field"); break; }
        const voltage = toUint16(bytes[idx], bytes[idx + 1]);
        data.voltage = voltage / 10.0; // V
        idx += 2;
        break;
        
      case 0x98: // Current RMS (2 bytes, unsigned big-endian, value/100 = A)
        if (idx + 2 > bytes.length) { warnings.push("Truncated current field"); break; }
        const current = toUint16(bytes[idx], bytes[idx + 1]);
        data.current = current / 100.0; // A
        idx += 2;
        break;
        
      default:
        // Unknown type, try to skip based on common patterns
        warnings.push("Unknown type 0x" + type.toString(16));
        // Try to determine length based on type pattern
        if (type >= 0x80 && type <= 0x9F) {
          // Most measurement types are 1-4 bytes
          if (idx < bytes.length) idx++; // Skip 1 byte by default
        }
        break;
    }
  }

  return { data, errors, warnings };
}

/**
 * Encode downlink message for DS-501 smart socket
 */
function encodeDownlink(input) {
  const data = input.data || {};
  const errors = [];
  const warnings = [];
  let bytes = [];
  const fPort = 2; // DS-501 uses fPort 2 for downlink

  // Option 1: Raw command bytes
  if (Array.isArray(data.rawBytes) && data.rawBytes.length > 0) {
    bytes = data.rawBytes.map(b => b & 0xFF);
    return { bytes, fPort, errors, warnings };
  }

  // Option 2: Hex string
  if (typeof data.hex === "string" && data.hex.trim().length > 0) {
    try {
      bytes = hexToBytes(data.hex);
      return { bytes, fPort, errors, warnings };
    } catch (e) {
      errors.push("Invalid hex string: " + e.message);
      return { bytes: [], fPort, errors, warnings };
    }
  }

  // Option 3: High-level command interface
  // All DS-501 commands start with 0x09 0x48 (header + product ID)
  const header = [0x09, 0x48];
  
  if (data.command !== undefined) {
    const command = String(data.command).toLowerCase();
    
    switch (command) {
      case 'query': // Query current status
        bytes = header.concat([0x0E]);
        break;
        
      case 'immediate_off': // Immediate disconnect socket
        bytes = header.concat([0x00, 0x01]);
        break;
        
      case 'immediate_on': // Immediate connect socket
        bytes = header.concat([0x01, 0x01]);
        break;
        
      case 'unlock': // Unlock socket state
        bytes = header.concat([0x02]);
        break;
        
      case 'lock': // Lock socket state
        bytes = header.concat([0x03]);
        break;
        
      case 'delay_off': // Delayed disconnect
        if (data.delaySeconds === undefined) {
          errors.push("delay_off command requires delaySeconds parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const delayOffBytes = header.concat([0x04, 0xFF]);
        const delayOffTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.delaySeconds)));
        delayOffBytes.push((delayOffTime >> 24) & 0xFF);
        delayOffBytes.push((delayOffTime >> 16) & 0xFF);
        delayOffBytes.push((delayOffTime >> 8) & 0xFF);
        delayOffBytes.push(delayOffTime & 0xFF);
        bytes = delayOffBytes;
        break;
        
      case 'delay_on': // Delayed connect
        if (data.delaySeconds === undefined) {
          errors.push("delay_on command requires delaySeconds parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const delayOnBytes = header.concat([0x05, 0xFF]);
        const delayOnTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.delaySeconds)));
        delayOnBytes.push((delayOnTime >> 24) & 0xFF);
        delayOnBytes.push((delayOnTime >> 16) & 0xFF);
        delayOnBytes.push((delayOnTime >> 8) & 0xFF);
        delayOnBytes.push(delayOnTime & 0xFF);
        bytes = delayOnBytes;
        break;
        
      case 'schedule_off': // Scheduled disconnect
        if (data.timestamp === undefined) {
          errors.push("schedule_off command requires timestamp parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const scheduleOffBytes = header.concat([0x06, 0xFF]);
        const scheduleOffTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.timestamp)));
        scheduleOffBytes.push((scheduleOffTime >> 24) & 0xFF);
        scheduleOffBytes.push((scheduleOffTime >> 16) & 0xFF);
        scheduleOffBytes.push((scheduleOffTime >> 8) & 0xFF);
        scheduleOffBytes.push(scheduleOffTime & 0xFF);
        scheduleOffBytes.push(data.repeat === 1 ? 0x01 : 0x00); // 0: single, 1: daily
        bytes = scheduleOffBytes;
        break;
        
      case 'schedule_on': // Scheduled connect
        if (data.timestamp === undefined) {
          errors.push("schedule_on command requires timestamp parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const scheduleOnBytes = header.concat([0x07, 0xFF]);
        const scheduleOnTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.timestamp)));
        scheduleOnBytes.push((scheduleOnTime >> 24) & 0xFF);
        scheduleOnBytes.push((scheduleOnTime >> 16) & 0xFF);
        scheduleOnBytes.push((scheduleOnTime >> 8) & 0xFF);
        scheduleOnBytes.push(scheduleOnTime & 0xFF);
        scheduleOnBytes.push(data.repeat === 1 ? 0x01 : 0x00); // 0: single, 1: daily
        bytes = scheduleOnBytes;
        break;
        
      case 'delay_unlock': // Delayed unlock
        if (data.delaySeconds === undefined) {
          errors.push("delay_unlock command requires delaySeconds parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const delayUnlockBytes = header.concat([0x08]);
        const delayUnlockTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.delaySeconds)));
        delayUnlockBytes.push((delayUnlockTime >> 24) & 0xFF);
        delayUnlockBytes.push((delayUnlockTime >> 16) & 0xFF);
        delayUnlockBytes.push((delayUnlockTime >> 8) & 0xFF);
        delayUnlockBytes.push(delayUnlockTime & 0xFF);
        bytes = delayUnlockBytes;
        break;
        
      case 'delay_lock': // Delayed lock
        if (data.delaySeconds === undefined) {
          errors.push("delay_lock command requires delaySeconds parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const delayLockBytes = header.concat([0x09]);
        const delayLockTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.delaySeconds)));
        delayLockBytes.push((delayLockTime >> 24) & 0xFF);
        delayLockBytes.push((delayLockTime >> 16) & 0xFF);
        delayLockBytes.push((delayLockTime >> 8) & 0xFF);
        delayLockBytes.push(delayLockTime & 0xFF);
        bytes = delayLockBytes;
        break;
        
      case 'schedule_unlock': // Scheduled unlock
        if (data.timestamp === undefined) {
          errors.push("schedule_unlock command requires timestamp parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const scheduleUnlockBytes = header.concat([0x0A]);
        const scheduleUnlockTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.timestamp)));
        scheduleUnlockBytes.push((scheduleUnlockTime >> 24) & 0xFF);
        scheduleUnlockBytes.push((scheduleUnlockTime >> 16) & 0xFF);
        scheduleUnlockBytes.push((scheduleUnlockTime >> 8) & 0xFF);
        scheduleUnlockBytes.push(scheduleUnlockTime & 0xFF);
        scheduleUnlockBytes.push(data.repeat === 1 ? 0x01 : 0x00); // 0: single, 1: daily
        bytes = scheduleUnlockBytes;
        break;
        
      case 'schedule_lock': // Scheduled lock
        if (data.timestamp === undefined) {
          errors.push("schedule_lock command requires timestamp parameter");
          return { bytes: [], fPort, errors, warnings };
        }
        const scheduleLockBytes = header.concat([0x0B]);
        const scheduleLockTime = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(data.timestamp)));
        scheduleLockBytes.push((scheduleLockTime >> 24) & 0xFF);
        scheduleLockBytes.push((scheduleLockTime >> 16) & 0xFF);
        scheduleLockBytes.push((scheduleLockTime >> 8) & 0xFF);
        scheduleLockBytes.push(scheduleLockTime & 0xFF);
        scheduleLockBytes.push(data.repeat === 1 ? 0x01 : 0x00); // 0: single, 1: daily
        bytes = scheduleLockBytes;
        break;
        
      case 'cancel_schedule': // Cancel scheduled control
        bytes = header.concat([0x0C, 0x01]);
        break;
        
      case 'cancel_lock_schedule': // Cancel scheduled lock
        bytes = header.concat([0x0D]);
        break;
        
      case 'power_off': // Alias for immediate_off (for compatibility)
        bytes = header.concat([0x00, 0x01]);
        break;
        
      case 'power_on': // Alias for immediate_on (for compatibility)
        bytes = header.concat([0x01, 0x01]);
        break;
        
      default:
        errors.push("Unknown command: " + data.command);
        warnings.push("Available commands: query, immediate_off, immediate_on, unlock, lock, delay_off, delay_on, schedule_off, schedule_on, delay_unlock, delay_lock, schedule_unlock, schedule_lock, cancel_schedule, cancel_lock_schedule");
        return { bytes: [], fPort, errors, warnings };
    }
    
    return { bytes, fPort, errors, warnings };
  }

  // Option 4: Direct property control (for compatibility with existing systems)
  if (data.powerState !== undefined) {
    const powerState = Number(data.powerState);
    bytes = header.concat([powerState ? 0x01 : 0x00, 0x01]);
    return { bytes, fPort, errors, warnings };
  }
  
  if (data.lockState !== undefined) {
    const lockState = Number(data.lockState);
    bytes = header.concat([lockState ? 0x03 : 0x02]);
    return { bytes, fPort, errors, warnings };
  }

  // No valid command found
  warnings.push("No valid command specified. Use 'command' parameter with one of: query, immediate_off, immediate_on, unlock, lock, delay_off, delay_on, schedule_off, schedule_on, delay_unlock, delay_lock, schedule_unlock, schedule_lock, cancel_schedule, cancel_lock_schedule");
  warnings.push("Alternatively, use 'powerState' (0/1) or 'lockState' (0/1) for basic control");
  return { bytes: [], fPort, errors, warnings };
}
