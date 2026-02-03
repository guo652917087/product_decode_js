/**
 * Decode uplink function
 * 
 * @param {object} input
 * @param {number[]} input.bytes Byte array containing the uplink payload, e.g. [255, 230, 255, 0]
 * @param {number} input.fPort Uplink fPort.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 * 
 * @returns {{data: object, errors: string[], warnings: string[]}}
 * An object containing:
 * - data: Object representing the decoded payload.
 * - errors: An array of errors (optional).
 * - warnings: An array of warnings (optional).
 */
function decodeUplink(input) {
  const bytes = input.bytes;
  const fPort = input.fPort;
  const data = {};
  const errors = [];
  const warnings = [];

  // 检查fPort是否为210（手册中指定）
  if (fPort !== 210) {
    errors.push(`Expected fPort 210, got ${fPort}`);
    return { data: {}, errors, warnings };
  }

  // 检查数据长度
  if (bytes.length < 4) {
    errors.push('Payload too short');
    return { data: {}, errors, warnings };
  }

  try {
    let index = 1;
    
    // 1. 产品型号ID (1字节类型 + 1字节数据)
    if (bytes[index] === 0x01) {
      index++; // 跳过类型字节
      const productId = bytes[index];
      data.model = productId === 0x5b ? "ZX5600-DN1" : `Unknown (0x${productId.toString(16)})`;
      index++;
    } else {
      errors.push('Invalid product ID type');
      return { data: {}, errors, warnings };
    }
    
    // 2. 数据包类型 (1字节类型 + 1字节数据)
    if (bytes[index] === 0x6d) {
      index++; // 跳过类型字节
      const packetType = bytes[index];
      data.packetType = packetType === 0x00 ? "heartbeat" : "data";
      index++;
    } else {
      errors.push('Invalid packet type');
      return { data: {}, errors, warnings };
    }
    
    // 如果是心跳包，直接返回
    if (data.packetType === "heartbeat") {
      data.message = "Heartbeat packet";
      return { data, errors, warnings };
    }
    
    // 3. 继电器状态 (1字节类型 + 1字节数据)
    if (index < bytes.length && bytes[index] === 0x22) {
      index++; // 跳过类型字节
      const relayState = bytes[index];
      data.relayState = relayState === 0x01 ? "on" : "off";
      index++;
    }
    
    // 4. 电气火灾告警属性 (1字节类型 + 2字节数据)
    if (index < bytes.length && bytes[index] === 0xc7) {
      index++; // 跳过类型字节
      if (index + 1 < bytes.length) {
        const alarmBits = (bytes[index] << 8) | bytes[index + 1];
        
        // 解析报警位
        data.alarms = {
          phaseAOverCurrent: !!(alarmBits & (1 << 0)),
          phaseBOverCurrent: !!(alarmBits & (1 << 1)),
          phaseCOverCurrent: !!(alarmBits & (1 << 2)),
          phaseAOverVoltage: !!(alarmBits & (1 << 3)),
          phaseBOverVoltage: !!(alarmBits & (1 << 4)),
          phaseCOverVoltage: !!(alarmBits & (1 << 5)),
          phaseAUnderVoltage: !!(alarmBits & (1 << 6)),
          phaseBUnderVoltage: !!(alarmBits & (1 << 7)),
          phaseCUnderVoltage: !!(alarmBits & (1 << 8)),
          shortCircuit: !!(alarmBits & (1 << 9)),
          tempSensor1Alarm: !!(alarmBits & (1 << 10)),
          tempSensor2Alarm: !!(alarmBits & (1 << 11)),
          tempSensor3Alarm: !!(alarmBits & (1 << 12)),
          tempSensor4Alarm: !!(alarmBits & (1 << 13)),
          leakageAlarm: !!(alarmBits & (1 << 14))
        };
        
        index += 2;
      }
    }
    
    // 5. 电气火灾数据 (1字节类型 + 103字节数据)
    if (index < bytes.length && bytes[index] === 0xc6) {
      index++; // 跳过类型字节
      
      // 检查数据长度
      if (bytes[index] !== 0x66) { // 固定长度102字节
        warnings.push(`Unexpected data length: 0x${bytes[index].toString(16)}, expected 0x66`);
      }
      index++; // 跳过长度字节
      
      // 解析三相电压 (16位无符号，大端，除以10)
      if (index + 6 <= bytes.length) {
        data.voltageA = ((bytes[index] << 8) | bytes[index + 1]) / 10.0;
        data.voltageB = ((bytes[index + 2] << 8) | bytes[index + 3]) / 10.0;
        data.voltageC = ((bytes[index + 4] << 8) | bytes[index + 5]) / 10.0;
        index += 6;
      }
      
      // 解析三相电流 (16位无符号，大端，除以10)
      if (index + 6 <= bytes.length) {
        data.currentA = ((bytes[index] << 8) | bytes[index + 1]) / 10.0;
        data.currentB = ((bytes[index + 2] << 8) | bytes[index + 3]) / 10.0;
        data.currentC = ((bytes[index + 4] << 8) | bytes[index + 5]) / 10.0;
        index += 6;
      }
      
      // 解析漏电电流 (16位无符号，大端，除以10)
      if (index + 2 <= bytes.length) {
        data.leakageCurrent = ((bytes[index] << 8) | bytes[index + 1]) / 10.0;
        index += 2;
      }
      
      // 解析4路温度传感器 (16位有符号，大端，除以10)
      if (index + 8 <= bytes.length) {
        data.temperature1 = parseSigned16(bytes[index], bytes[index + 1]) / 10.0;
        data.temperature2 = parseSigned16(bytes[index + 2], bytes[index + 3]) / 10.0;
        data.temperature3 = parseSigned16(bytes[index + 4], bytes[index + 5]) / 10.0;
        data.temperature4 = parseSigned16(bytes[index + 6], bytes[index + 7]) / 10.0;
        index += 8;
      }
      
      // 解析环境温湿度
      if (index + 4 <= bytes.length) {
        data.environmentTemperature = parseSigned16(bytes[index], bytes[index + 1]) / 10.0;
        data.environmentHumidity = ((bytes[index + 2] << 8) | bytes[index + 3]) / 10.0;
        index += 4;
      }
      
      // 解析有功功率 (IEEE754浮点数，大端)
      if (index + 40 <= bytes.length) {
        data.activePowerA = parseFloat32(bytes, index);
        data.activePowerB = parseFloat32(bytes, index + 4);
        data.activePowerC = parseFloat32(bytes, index + 8);
        data.activePowerTotal = parseFloat32(bytes, index + 12);
        index += 16;
        
        // 无功功率
        data.reactivePowerA = parseFloat32(bytes, index);
        data.reactivePowerB = parseFloat32(bytes, index + 4);
        data.reactivePowerC = parseFloat32(bytes, index + 8);
        data.reactivePowerTotal = parseFloat32(bytes, index + 12);
        index += 16;
        
        // 视在功率
        data.apparentPowerA = parseFloat32(bytes, index);
        data.apparentPowerB = parseFloat32(bytes, index + 4);
        data.apparentPowerC = parseFloat32(bytes, index + 8);
        data.apparentPowerTotal = parseFloat32(bytes, index + 12);
        index += 16;
      }
      
      // 解析功率因数
      if (index + 16 <= bytes.length) {
        data.powerFactorA = parseFloat32(bytes, index);
        data.powerFactorB = parseFloat32(bytes, index + 4);
        data.powerFactorC = parseFloat32(bytes, index + 8);
        data.powerFactorTotal = parseFloat32(bytes, index + 12);
        index += 16;
      }
      
      // 解析电能
      if (index + 12 <= bytes.length) {
        data.activeEnergy = parseFloat32(bytes, index);
        data.reactiveEnergy = parseFloat32(bytes, index + 4);
        data.apparentEnergy = parseFloat32(bytes, index + 8);
        index += 12;
      }
    }
    
    // 6. 电气火灾告警事件 (可选)
    if (index < bytes.length && bytes[index] === 0xc8) {
      index++; // 跳过类型字节
      // 告警事件格式与告警属性相同，这里可以类似解析
      // 但根据需求可能不需要
    }

  } catch (error) {
    errors.push(`Decoding error: ${error.message}`);
  }

  return { data, errors, warnings };
}

/**
 * Helper function to parse 16-bit signed integer (big-endian)
 */
function parseSigned16(highByte, lowByte) {
  const value = (highByte << 8) | lowByte;
  return value > 32767 ? value - 65536 : value;
}

/**
 * Helper function to parse IEEE754 32-bit float (big-endian)
 */
function parseFloat32(bytes, offset) {
  if (offset + 4 > bytes.length) return 0;
  
  // Create a DataView to handle big-endian float
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  
  return view.getFloat32(0, false); // false for big-endian
}

/**
 * Encode downlink function.
 * 
 * @param {object} input
 * @param {object} input.data Object representing the payload that must be encoded.
 * @param {Record<string, string>} input.variables Object containing the configured device variables.
 * 
 * @returns {{bytes: number[], fPort: number, errors: string[], warnings: string[]}}
 * An object containing:
 * - bytes: Byte array containing the downlink payload.
 * - fPort: The downlink LoRaWAN fPort.
 * - errors: An array of errors (optional).
 * - warnings: An array of warnings (optional).
 */
function encodeDownlink(input) {
  // 根据手册，设备支持远程分合闸控制
  // 这里实现一个简单的分合闸控制命令
  const bytes = [];
  const errors = [];
  const warnings = [];
  
  if (input.data && input.data.command === "relayControl") {
    // 简单的继电器控制命令
    const state = input.data.state; // "on" or "off"
    
    if (state === "on") {
      bytes.push(0x01); // 开闸命令
    } else if (state === "off") {
      bytes.push(0x00); // 关闸命令
    } else {
      errors.push("Invalid relay state, use 'on' or 'off'");
    }
  } else {
    errors.push("No valid command specified");
  }
  
  return {
    fPort: 210, // 使用与上行相同的fPort
    bytes,
    errors,
    warnings
  };
}
