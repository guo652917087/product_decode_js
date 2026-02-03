/**
 * Decode uplink function for AN301 Emergency Button/SOS Device
 * 
 * @param {object} input
 * @param {number[]} input.bytes Byte array containing the uplink payload
 * @param {number} input.fPort Uplink fPort.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 * 
 * @returns {{data: object, errors: string[], warnings: string[]}}
 */
function decodeUplink(input) {
  const bytes = input.bytes;
  const fPort = input.fPort;
  const data = {};
  const errors = [];
  const warnings = [];

  // Check if fPort is 210
  if (fPort !== 210) {
    errors.push(`Expected fPort 210, got ${fPort}`);
    return { data: {}, errors, warnings };
  }

  // Check minimum data length
  if (bytes.length < 3) {
    errors.push('Payload too short');
    return { data: {}, errors, warnings };
  }

  try {
    let index = 0;
    
    // 1. Reserved field (1 byte, fixed 0x00)
    if (bytes[index] !== 0x00) {
      warnings.push(`Reserved byte expected 0x00, got 0x${bytes[index].toString(16)}`);
    }
    index++;
    
    // Parse attribute section
    while (index < bytes.length) {
      const type = bytes[index];
      index++;
      
      switch (type) {
        // 2. Product model ID (0x01) - 1 byte
        case 0x01:
          if (index < bytes.length) {
            const modelId = bytes[index];
            data.productModel = modelId === 0x01 ? "AN301" : `Unknown (0x${modelId.toString(16)})`;
            data.model = data.productModel; // Compatibility with existing model attribute
            index++;
          }
          break;
          
        // 3. Battery voltage (0x04) - 2 bytes, big-endian, unit mV
        case 0x04:
          if (index + 1 < bytes.length) {
            const voltageMV = (bytes[index] << 8) | bytes[index + 1];
            data.batteryVoltage = voltageMV / 1000.0; // Convert to V
            data.batteryVoltageMV = voltageMV; // Keep original mV value
            index += 2;
          }
          break;
          
        // 4. Battery voltage status (0x7D) - 1 byte
        case 0x7d:
          if (index < bytes.length) {
            const batteryStatus = bytes[index];
            data.batteryVoltageState = batteryStatus === 0x00 ? "normal" : "low";
            data.batteryVoltageStateRaw = batteryStatus;
            index++;
          }
          break;
          
        // 5. Tamper status (0x77) - 1 byte
        case 0x77:
          if (index < bytes.length) {
            const tamperStatus = bytes[index];
            data.tamperStatus = tamperStatus === 0x01;
            data.tamperStatusRaw = tamperStatus;
            index++;
          }
          break;
          
        // 6. Battery voltage event (0x05) - 1 byte
        case 0x05:
          if (index < bytes.length) {
            const batteryEvent = bytes[index];
            data.batteryLowEvent = batteryEvent === 0x01;
            data.batteryLowEventRaw = batteryEvent;
            index++;
          }
          break;
          
        // 7. Tamper event (0x03) - 1 byte
        case 0x03:
          if (index < bytes.length) {
            const tamperEvent = bytes[index];
            data.tamperEvent = tamperEvent === 0x01;
            data.tamperEventRaw = tamperEvent;
            index++;
          }
          break;
          
        // 8. SOS event (0x14) - 1 byte
        case 0x14:
          if (index < bytes.length) {
            const sosEvent = bytes[index];
            data.sosEvent = sosEvent === 0x01;
            data.sosEventRaw = sosEvent;
            data.sosAlert = sosEvent === 0x01; // Compatibility with sosAlert attribute
            index++;
          }
          break;
          
        default:
          // Unknown type, skip
          warnings.push(`Unknown type: 0x${type.toString(16)} at position ${index-1}`);
          // Stop parsing since we don't know data length
          index = bytes.length;
          break;
      }
    }
    
    // Get current timestamp (for event time recording)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    data.timestamp = currentTimestamp;
    
    // Check if any emergency event occurred
    if (data.sosEvent) {
      data.emergencyAlert = true;
      data.sosEventTime = currentTimestamp;
      data.alertType = "sos";
    } else if (data.tamperEvent) {
      data.tamperEventTime = currentTimestamp;
      data.alertType = "tamper";
    } else if (data.batteryLowEvent) {
      data.batteryLowEventTime = currentTimestamp;
      data.alertType = "battery_low";
    } else {
      data.alertType = "normal";
    }
    
    // Calculate battery level percentage (based on typical battery)
    if (data.batteryVoltageMV !== undefined) {
      data.batteryLevel = calculateBatteryLevel(data.batteryVoltageMV);
    }
    
  } catch (error) {
    errors.push(`Decoding error: ${error.message}`);
  }

  return { data, errors, warnings };
}

/**
 * Calculate battery level percentage (based on typical CR123A/CR2 battery)
 * Typical range: 2.0V (0%) to 3.3V (100%)
 */
function calculateBatteryLevel(voltageMV) {
  const minVoltage = 2000; // 2.0V, 0% battery
  const maxVoltage = 3300; // 3.3V, 100% battery
  
  if (voltageMV <= minVoltage) {
    return 0;
  } else if (voltageMV >= maxVoltage) {
    return 100;
  } else {
    return Math.round(((voltageMV - minVoltage) / (maxVoltage - minVoltage)) * 100);
  }
}

/**
 * Encode downlink function.
 * 
 * @param {object} input
 * @param {object} input.data Object representing the payload that must be encoded.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 * 
 * @returns {{bytes: number[], fPort: number, errors: string[], warnings: string[]}}
 */
function encodeDownlink(input) {
  // AN301 typically doesn't need downlink commands, but we can reserve configuration or acknowledgment functions
  const bytes = [];
  const errors = [];
  const warnings = [];
  
  if (input.data && input.data.command === "acknowledge") {
    // Acknowledge received SOS alert
    bytes.push(0x01); // Acknowledge command
    bytes.push(0x14); // SOS event type
    bytes.push(0x00); // Acknowledge status: 0x00=acknowledged
    
    if (input.data.alertId) {
      // Can include specific alert ID
      // This is just an example, actual protocol needs definition
    }
  } else if (input.data && input.data.command === "test") {
    // Test command, trigger device self-test
    bytes.push(0x02);
    bytes.push(0x01); // Self-test command
  } else if (input.data && input.data.command === "configure") {
    // Configuration command
    bytes.push(0x03); // Configuration command identifier
    
    if (input.data.heartbeatInterval !== undefined) {
      // Set heartbeat interval
      bytes.push(0x10); // Heartbeat interval parameter
      bytes.push(input.data.heartbeatInterval & 0xFF);
      bytes.push((input.data.heartbeatInterval >> 8) & 0xFF);
    }
    
    if (input.data.batteryThreshold !== undefined) {
      // Set battery low voltage threshold
      bytes.push(0x11); // Battery threshold parameter
      bytes.push(input.data.batteryThreshold & 0xFF);
      bytes.push((input.data.batteryThreshold >> 8) & 0xFF);
    }
  } else {
    errors.push("No valid command specified");
  }
  
  return {
    fPort: 210, // Use same fPort as uplink
    bytes,
    errors,
    warnings
  };
}
