/**
 * Decode uplink function for AN204B Water Leakage Sensor (Enhanced with battery level calculation)
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

  // 检查数据长度
  if (bytes.length < 3) {
    errors.push('Payload too short');
    return { data: {}, errors, warnings };
  }

  try {
    let index = 0;
    
    // 1. 保留字段
    if (bytes[index] !== 0x00) {
      warnings.push(`Reserved byte expected 0x00, got 0x${bytes[index].toString(16)}`);
    }
    index++;
    
    // 解析属性部分
    while (index < bytes.length) {
      const type = bytes[index];
      index++;
      
      switch (type) {
        case 0x01: // 终端产品型号
          if (index < bytes.length) {
            const modelId = bytes[index];
            data.productModel = modelId === 0x11 ? "AN204B" : `Unknown (0x${modelId.toString(16)})`;
            index++;
          }
          break;
          
        case 0x04: // 电池电压
          if (index + 1 < bytes.length) {
            const voltageMV = (bytes[index] << 8) | bytes[index + 1];
            data.batteryVoltage = voltageMV / 1000.0;
            data.batteryVoltageMV = voltageMV;
            
            // 计算电池电量百分比（假设3.0V为0%，3.6V为100%）
            const batteryPercentage = calculateBatteryLevel(voltageMV);
            data.batteryLevel = batteryPercentage;
            
            index += 2;
          }
          break;
          
        case 0x85: // 水浸状态
          if (index < bytes.length) {
            const waterStatus = bytes[index];
            data.waterStatus = waterStatus === 0x01;
            data.waterStatusRaw = waterStatus;
            index++;
          }
          break;
          
        case 0x6d: // 数据包类型
          if (index < bytes.length) {
            const packetType = bytes[index];
            data.packetType = packetType === 0x00 ? "heartbeat" : "data";
            data.packetTypeRaw = packetType;
            index++;
          }
          break;
          
        case 0x73: // 水浸时长
          if (index + 1 < bytes.length) {
            const duration = (bytes[index] << 8) | bytes[index + 1];
            data.waterDuration = duration;
            index += 2;
          }
          break;
          
        case 0x05: // 电池电压低事件
          if (index < bytes.length) {
            const batteryLowEvent = bytes[index];
            data.batteryLowEvent = batteryLowEvent === 0x01;
            data.batteryLowEventRaw = batteryLowEvent;
            index++;
          }
          break;
          
        case 0x21: // 水浸事件
          if (index < bytes.length) {
            const waterEvent = bytes[index];
            data.waterEvent = waterEvent === 0x01;
            data.waterEventRaw = waterEvent;
            index++;
          }
          break;
          
        default:
          warnings.push(`Unknown type: 0x${type.toString(16)} at position ${index-1}`);
          // 停止解析未知类型
          index = bytes.length;
          break;
      }
    }
    
    // 如果是心跳包，标记为心跳
    if (data.packetType === "heartbeat") {
      data.message = "Heartbeat packet";
    }
    
  } catch (error) {
    errors.push(`Decoding error: ${error.message}`);
  }

  return { data, errors, warnings };
}

/**
 * 计算电池电量百分比
 * 假设电池电压范围：3.0V (0%) 到 3.6V (100%)
 * 实际应根据电池规格调整
 */
function calculateBatteryLevel(voltageMV) {
  const minVoltage = 3000; // 3.0V，0%电量
  const maxVoltage = 3600; // 3.6V，100%电量
  
  if (voltageMV <= minVoltage) {
    return 0;
  } else if (voltageMV >= maxVoltage) {
    return 100;
  } else {
    return Math.round(((voltageMV - minVoltage) / (maxVoltage - minVoltage)) * 100);
  }
}
