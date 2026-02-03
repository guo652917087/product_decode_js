/**
 * Decode uplink function for AN305A Door Contact Sensor with Tamper Detection
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

  // 检查fPort是否为210
  if (fPort !== 210) {
    errors.push(`Expected fPort 210, got ${fPort}`);
    return { data: {}, errors, warnings };
  }

  // 检查数据长度（最小长度）
  if (bytes.length < 3) {
    errors.push('Payload too short');
    return { data: {}, errors, warnings };
  }

  try {
    let index = 0;
    
    // 1. 保留字段 (1字节，固定0x00)
    if (bytes[index] !== 0x00) {
      warnings.push(`Reserved byte expected 0x00, got 0x${bytes[index].toString(16)}`);
    }
    index++;
    
    // 解析属性部分
    while (index < bytes.length) {
      const type = bytes[index];
      index++;
      
      switch (type) {
        // 2. 产品型号ID (0x01)
        case 0x01:
          if (index < bytes.length) {
            const modelId = bytes[index];
            data.productModel = modelId === 0x25 ? "AN305A" : `Unknown (0x${modelId.toString(16)})`;
            data.model = data.productModel; // 兼容已有model属性
            index++;
          }
          break;
          
        // 3. 电池电压 (0x04) - 2字节，大端，单位mV
        case 0x04:
          if (index + 1 < bytes.length) {
            const voltageMV = (bytes[index] << 8) | bytes[index + 1];
            data.batteryVoltage = voltageMV / 1000.0; // 转换为V
            index += 2;
          }
          break;
          
        // 4. 电池电压状态 (0x7d) - 1字节
        case 0x7d:
          if (index < bytes.length) {
            const batteryStatus = bytes[index];
            data.batteryVoltageState = batteryStatus === 0x00 ? "normal" : "low";
            index++;
          }
          break;
          
        // 5. 数据包类型 (0x6d) - 1字节
        case 0x6d:
          if (index < bytes.length) {
            const packetType = bytes[index];
            data.packetType = packetType === 0x00 ? "heartbeat" : "data";
            index++;
          }
          break;
          
        // 6. 防拆状态 (0x77) - 1字节
        case 0x77:
          if (index < bytes.length) {
            const tamperStatus = bytes[index];
            data.tamperStatus = tamperStatus === 0x01;
            index++;
          }
          break;
          
        // 7. 门磁状态 (0x76) - 1字节
        case 0x76:
          if (index < bytes.length) {
            const doorStatus = bytes[index];
            data.doorState = doorStatus === 0x01;
            index++;
          }
          break;
          
        // 8. 电池低电压报警事件 (0x05) - 1字节
        case 0x05:
          if (index < bytes.length) {
            const batteryLowEvent = bytes[index];
            data.batteryLowEvent = batteryLowEvent === 0x01;
            index++;
          }
          break;
          
        // 9. 防拆事件 (0x03) - 1字节
        case 0x03:
          if (index < bytes.length) {
            const tamperEvent = bytes[index];
            data.tamperEvent = tamperEvent === 0x01;
            index++;
          }
          break;
          
        // 10. 门磁事件 (0x24) - 1字节
        case 0x24:
          if (index < bytes.length) {
            const doorEvent = bytes[index];
            data.doorEvent = doorEvent === 0x01;
            index++;
          }
          break;
          
        default:
          // 未知类型，跳过
          warnings.push(`Unknown type: 0x${type.toString(16)} at position ${index-1}`);
          // 由于不知道数据长度，我们停止解析
          index = bytes.length;
          break;
      }
    }
    
    // 如果是心跳包，标记为心跳
    if (data.packetType === "heartbeat") {
      data.message = "Heartbeat packet";
    }
    
    // 计算电池电量百分比（可选）
    if (data.batteryVoltageMV !== undefined) {
      data.batteryLevel = calculateBatteryLevel(data.batteryVoltageMV);
    }
    
  } catch (error) {
    errors.push(`Decoding error: ${error.message}`);
  }

  return { data, errors, warnings };
}

/**
 * 计算电池电量百分比（基于典型CR2032电池）
 * 典型范围：2.0V (0%) 到 3.3V (100%)
 */
function calculateBatteryLevel(voltageMV) {
  const minVoltage = 2000; // 2.0V，0%电量
  const maxVoltage = 3300; // 3.3V，100%电量
  
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
  // AN305S通常不需要下行命令，但可以预留配置功能
  const bytes = [];
  const errors = [];
  const warnings = [];
  
  // 可以添加配置命令，例如修改上报间隔、报警阈值等
  if (input.data && input.data.command === "configure") {
    bytes.push(0x01); // 配置命令标识
    
    if (input.data.reportInterval !== undefined) {
      // 设置上报间隔
      bytes.push(0x10); // 上报间隔参数
      bytes.push(input.data.reportInterval & 0xFF);
      bytes.push((input.data.reportInterval >> 8) & 0xFF);
    }
    
    if (input.data.batteryThreshold !== undefined) {
      // 设置电池低电压阈值
      bytes.push(0x11); // 电池阈值参数
      bytes.push(input.data.batteryThreshold & 0xFF);
      bytes.push((input.data.batteryThreshold >> 8) & 0xFF);
    }
    
  } else if (input.data && input.data.command === "test") {
    // 测试命令，触发设备自检
    bytes.push(0x02);
    bytes.push(0x01); // 自检命令
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
