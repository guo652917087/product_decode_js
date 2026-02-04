/**
 * ============================================================================
 * Unified ChirpStack JS Codec for All IoT Devices
 * ============================================================================
 *
 * PROTOCOL OVERVIEW:
 * ==================
 *
 * UPLINK (Fport 210):
 * ------------------
 * All devices use a custom LPP-like protocol with Type-Value pairs.
 *
 * Payload Structure:
 *   Byte 0: Reserved (0x00 for current protocol version)
 *   Byte 1+: Type-Value pairs: [Type1][Value1][Type2][Value2]...
 *
 * Each Type defines the data format and length:
 *   - Type determines value length (1-N bytes)
 *   - Parsing continues until end of payload
 *
 * DEVICE SUPPORT LIST WITH PROTOCOL NOTES:
 * =========================================
 *
 * AN-204: Water Leakage Sensor
 *   - Type 0x85: Water leakage status (0x00=no water, 0x01=water detected)
 *   - Type 0x73: Water leakage duration in minutes (2 bytes, big-endian)
 *   - Type 0x21: Water leakage event (0x00=no water, 0x01=water detected)
 *   - Type 0x05: Battery low voltage event (0x00=normal, 0x01=low)
 *
 * AN-301: Emergency Button/SOS Device
 *   - Type 0x14: SOS button press event (0x01=danger)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low)
 *
 * AN-303: Temperature & Humidity Sensor
 *   - Type 0x10: Temperature (2 bytes signed, big-endian, ×100, unit: °C)
 *   - Type 0x12: Humidity (2 bytes unsigned, big-endian, ×10, unit: %RH)
 *   - Type 0x11: Temperature event (0x00=normal, 0x01=abnormal, 0x02=high, 0x03=low)
 *   - Type 0x13: Humidity event (0x00=normal, 0x01=abnormal, 0x02=high, 0x03=low)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *
 * AN-304: Infrared Detector
 *   - Type 0x17: Infrared event (0x00=normal, 0x01=alarm)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low)
 *
 * AN-305: Door Contact Sensor
 *   - Type 0x76: Door state (0x00=closed, 0x01=open)
 *   - Type 0x18: Door state (alternate) (0x00=closed, 0x01=open)
 *   - Type 0x24: Door event (0x00=closed event, 0x01=open event)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *
 * CU606: Air Quality Sensor
 *   - Type 0x52: PM2.5 concentration (2 bytes unsigned, big-endian, unit: μg/m³)
 *   - Type 0x9F: Formaldehyde concentration (2 bytes unsigned, big-endian, unit: μg/m³)
 *   - Type 0x49: CO2 concentration (2 bytes unsigned, big-endian, unit: ppm)
 *   - Type 0xA0: TVOC concentration (2 bytes unsigned, big-endian, unit: μg/m³)
 *   - Type 0x10: Temperature (2 bytes signed, big-endian, ×100, unit: °C)
 *   - Type 0x12: Humidity (2 bytes unsigned, big-endian, ×10, unit: %RH)
 *
 * DS-501: Smart Socket Panel
 *   - Type 0x22: Relay state (0x00=off, 0x01=on)
 *   - Type 0x96: Lock state (0x00=unlocked, 0x01=locked)
 *   - Type 0x79: Local timestamp (4 bytes unsigned, big-endian, Unix time)
 *   - Type 0x80: Timer status (4 bytes bitfield, big-endian)
 *   - Type 0x97: Voltage RMS (2 bytes unsigned, big-endian, ÷10, unit: V)
 *   - Type 0x98: Current RMS (2 bytes unsigned, big-endian, ÷100, unit: A)
 *   - Type 0x99: Active power (2 bytes signed, big-endian, ÷100, unit: W)
 *   - Type 0x9A: Energy consumption (4 bytes unsigned, big-endian, ÷100, unit: kWh)
 *
 * EF5600-DN1: Electrical Fire Monitor
 *   - Type 0xC6: Electrical fire data (103 bytes, variable structure)
 *   - Type 0xC7: Electrical fire alarm attribute (2 bytes bitfield)
 *   - Type 0xC8: Electrical fire alarm event (2 bytes bitfield)
 *   - Type 0x22: Relay state (0x00=off, 0x01=on)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *
 * W8004: Thermostat Controller
 *   - Type 0x94: RS485 address (1 byte)
 *   - Type 0x95: Modbus data block (variable length, Modbus registers)
 *
 * JTY-AN-503A: Smoke Detector
 *   - Type 0x84: Smoke alarm status (0x00=normal, 0x01=alarm)
 *   - Type 0x31: Smoke alarm event (0x00=normal, 0x01=alarm)
 *   - Type 0x10: Temperature (2 bytes signed, big-endian, ×100, unit: °C)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x82: Sensor self-check event (0x00=normal, 0x01=self-check occurred)
 *
 * SC001: Safety Helmet with Multiple Sensors
 *   - Type 0x01: Device model identifier (0x60 = SC001)
 *   - Type 0x93: Battery percentage (1 byte, 0-100%)
 *   - Type 0x57: Atmospheric pressure (4 bytes unsigned, big-endian, unit: Pa)
 *   - Type 0xD8: Altitude (4 bytes unsigned, big-endian, ÷10, unit: m)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0xAA: Temperature (2 bytes signed, big-endian, ÷10, unit: °C)
 *   - Type 0xA9: Temperature alarm status (0=normal, 1=too low, 2=too high, 3=cannot collect)
 *   - Type 0xCB: Fall detection alarm status (0=no alarm, 1=fall alarm)
 *   - Type 0xCC: Fall detection alarm event (0=no alarm, 1=fall alarm event)
 *   - Type 0xCD: Helmet removal alarm status (0=no alarm, 1=removal alarm)
 *   - Type 0xCE: Helmet removal alarm event (0=no alarm, 1=removal alarm event)
 *   - Type 0xCF: Proximity to electricity alarm status (0=no alarm, 1=electricity alarm)
 *   - Type 0xD0: Proximity to electricity alarm event (0=no alarm, 1=electricity alarm event)
 *   - Type 0xD1: Impact alarm status (0=no alarm, 1=impact alarm)
 *   - Type 0xD2: Impact alarm event (0=no alarm, 1=impact alarm event)
 *   - Type 0xD3: Silence alarm status (0=no alarm, 1=silence alarm)
 *   - Type 0xD4: Silence alarm event (0=no alarm, 1=silence alarm event)
 *   - Type 0xD5: Height access alarm status (0=no alarm, 1=height access alarm)
 *   - Type 0xD6: Height access alarm event (0=no alarm, 1=height access alarm event)
 *   - Type 0x3E: Latitude (4 bytes signed, big-endian, ÷10000000, unit: degrees)
 *   - Type 0x43: Longitude (4 bytes signed, big-endian, ÷10000000, unit: degrees)
 *   - Type 0xC3: Position accuracy factor (1 byte, ÷10, 255=invalid)
 *   - Type 0xD9: Beacon data (variable length, for beacon scanning)
 *   - Type 0xBA: Simple beacon data (8 bytes fixed, for beacon reception)
 *   - Type 0xB8: Battery low percentage alarm event (0=normal, 1=low battery)
 *   - Type 0x11: Temperature event (0=normal, 1=abnormal, 2=too high, 3=too low)
 *   - Type 0x14: SOS event (0=no danger, 1=danger)
 *
 * AN-122: Beacon Tracker with GPS
 *   - Type 0x01: Device model identifier (0x57 = AN-122)
 *   - Type 0x93: Battery percentage (1 byte, 0-100%)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0xBA: Simple beacon data (8 bytes fixed, up to 3 beacons)
 *   - Type 0x3E: Latitude (4 bytes signed, big-endian, ÷10000000, unit: degrees)
 *   - Type 0x43: Longitude (4 bytes signed, big-endian, ÷10000000, unit: degrees)
 *   - Type 0xC3: Position accuracy factor (1 byte, ÷10, 255=invalid)
 *   - Type 0x6B: Tilt angle (2 bytes, unit: degrees)
 *   - Type 0xB8: Battery low percentage alarm event (0=normal, 1=low battery)
 *   - Type 0x03: Tamper event (0=not tampered, 1=tampered)
 *   - Type 0xA8: Acceleration alarm event (0=normal, 1=acceleration alarm)
 *   - Type 0xC2: Tilt alarm event (0=normal, 1=tilt alarm)
 *
 * AN-113: Tilt/Angle Sensor
 *   - Type 0x01: Device model identifier (0x3c = AN-113)
 *   - Type 0x04: Battery voltage (2 bytes unsigned, big-endian, unit: mV)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low voltage)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0x6B: Tilt angle (2 bytes, unit: degrees)
 *   - Type 0x05: Battery low voltage alarm event (0x00=normal, 0x01=low voltage)
 *   - Type 0x03: Tamper event (0x00=not tampered, 0x01=tampered)
 *   - Type 0xA8: Acceleration alarm event (0=normal, 1=acceleration alarm)
 *   - Type 0xC2: Tilt alarm event (0x00=normal, 0x01=alarm)
 *
 * EX205: Radar Liquid Level Meter
 *   - Type 0x01: Device model identifier (0x55 = EX205 normal, 0x54 = EX205 abnormal)
 *   - Type 0x04: Battery voltage (2 bytes unsigned, big-endian, unit: mV)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low voltage)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0xB9: Distance (4 bytes unsigned, big-endian, ÷10, unit: cm)
 *   - Type 0x80: Liquid level (2 bytes unsigned, big-endian, ÷10, unit: cm)
 *   - Type 0x9B: Liquid level status (0x00=normal, 0x01=too low, 0x02=too high)
 *   - Type 0x05: Battery low voltage event (0x00=normal, 0x01=low voltage)
 *   - Type 0x81: Liquid level event (0x00=normal, 0x01=level too high/low alarm)
 *   - Type 0x1B: Sensor status (0x00=normal, 0x01=abnormal) - only in abnormal packet
 *
 * AN-307: Sound & Light Alarm
 *   - Type 0x01: Device model identifier (0x2A = AN-307)
 *   - Type 0x3A: Alarm status (0x00=normal, 0x01=alarm)
 *
 * DS-103: 3-Channel Switch Controller
 *   - Type 0x01: Device model identifier (0x5C = DS-103)
 *   - Type 0x79: Timestamp (4 bytes unsigned, big-endian, Unix time, 0=no time)
 *   - Type 0x96: Switch lock state (0=unlocked, 1=locked)
 *   - Type 0x22: Switch state (0=disconnected, 1=connected) - repeated for 3 switches
 *   - Type 0xB0: Switch timer status (4 bytes bitfield, big-endian)
 *
 * AN-308: Light Illuminance Sensor
 *   - Type 0x01: Device model identifier (0x45 = AN-308)
 *   - Type 0x04: Battery voltage (2 bytes unsigned, big-endian, unit: mV)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low voltage)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0x48: Illuminance (4 bytes unsigned, big-endian, unit: Lux)
 *   - Type 0x05: Battery low voltage alarm event (0x00=normal, 0x01=low voltage)
 *   - Type 0x03: Tamper event (0x00=not tampered, 0x01=tampered)
 *
 * AN-306: Radar Human Presence Sensor
 *   - Type 0x01: Device model identifier (0x44 = AN-306)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0x77: Tamper state (0x00=not tampered, 0x01=tampered)
 *   - Type 0xBD: Radar human presence status (0x00=no person, 0x01=person present)
 *   - Type 0x03: Tamper event (0x00=not tampered, 0x01=tampered)
 *   - Type 0xBE: Radar human presence event (0x00=no person event, 0x01=person event)
 *
 * EX301: Vibration Sensor
 *   - Type 0x01: Device model identifier (0x56 = EX301)
 *   - Type 0x04: Battery voltage (2 bytes unsigned, big-endian, unit: mV)
 *   - Type 0x7D: Battery voltage state (0x00=normal, 0x01=low voltage)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0xAA: Temperature (2 bytes signed, big-endian, ÷10, unit: °C)
 *   - Type 0xA9: Temperature alarm status (0=normal, 1=too low, 2=too high, 3=cannot collect)
 *   - Type 0xBF: Vibration sensor data (30 bytes fixed structure)
 *   - Type 0xC0: Vibration sensor alarm status (2 bytes bitfield, big-endian)
 *   - Type 0x05: Battery low voltage alarm event (0x00=normal, 0x01=low voltage)
 *   - Type 0xC1: Vibration sensor alarm event (2 bytes bitfield, big-endian)
 *
 * CM100: Beacon Receiver/Gateway
 *   - Type 0x01: Device model identifier (0x1e = CM100)
 *   - Type 0x93: Battery percentage (1 byte, 0-100%)
 *   - Type 0x6D: Packet type (0x00=heartbeat, 0x01=data report)
 *   - Type 0xD9: Beacon data (variable length, for beacon scanning)
 *   - Type 0xB8: Battery low percentage alarm event (0=normal, 1=low battery)
 *   - Type 0x14: SOS event (0x00=no danger, 0x01=danger)
 *
 * DOWNLINK MODES:
 * ---------------
 * 1. AT Commands (Fport 220): 0xFF + ASCII(AT command) + CRLF
 *    All devices support AT commands for configuration
 *    Format: 0xFF + AT command string + 0x0D 0x0A (CRLF)
 *    Multiple commands: Separate with CRLF, always put AT+REBOOT last
 *
 * 2. Serial Passthrough (Fport 220): 0xFE + passthrough data
 *    Used for direct serial communication (e.g., Modbus RTU)
 *    Format: 0xFE + passthrough bytes
 *
 * 3. Modbus Control (Fport 2): 0x07 + full Modbus frame or 0x06 + single register write
 *    Used for Modbus-based devices like W8004 thermostat
 *
 * 4. Device Control (Fport 2): Device-specific control commands
 *
 * FIELD UNIFICATION:
 * ------------------
 * Common fields are reused across devices:
 *   - powerState: Power on/off (0=off, 1=on)
 *   - lockState: Lock/unlock state (0=unlocked, 1=locked)
 *   - temperature: Temperature in °C
 *   - humidity: Relative humidity in %RH
 *   - batteryVoltage: Battery voltage in volts
 *   - batteryLevel: Battery percentage (0-100%)
 *   - model: Device model string
 *   - rssi: Received signal strength indicator
 *   - snr: Signal-to-noise ratio
 *   - tamper: Tamper detection status (0=normal, 1=tampered)
 *   - presence: Human presence detection (0=no person, 1=person present)
 *   - distance: Distance measurement in meters
 *   - liquidLevel: Liquid level in meters
 *   - illuminance: Light illuminance in Lux
 *   - tiltAngle: Tilt angle in degrees
 */

/* ============================================================================
 * DEVICE MODEL MAPPING
 * Maps model code byte (Type 0x01 value) to human-readable model string
 * ============================================================================ */
const MODEL_MAP = {
    // AN Series
    0x01: "AN-301", // Emergency button
    0x03: "AN-303", // Temperature & humidity
    0x04: "AN-304", // Infrared detector
    0x11: "AN-204", // Water leakage sensor
    0x24: "AN-305", // Door contact sensor
    0x25: "AN-305", // Door sensor variant
    0x3c: "AN-113", // Tilt/Angle Sensor
    0x44: "AN-306", // Radar Human Presence Sensor
    0x45: "AN-308", // Light Illuminance Sensor
    0x57: "AN-122", // Beacon Tracker with GPS
    0x2a: "AN-307", // Sound & Light Alarm
    0x51: "JTY-AN-503A", // Smoke detector

    // CU Series (Air quality)
    0x4b: "CU606", // Air quality sensor

    // DS Series (Smart devices)
    0x48: "DS-501", // Smart socket panel
    0x5c: "DS-103", // 3-Channel Switch Controller

    // W Series (Thermostats)
    0x46: "W8004", // Thermostat controller

    // EF Series (Electrical)
    0x5b: "EF5600-DN1", // Electrical fire monitor

    // EX Series
    0x54: "EX205", // Radar Liquid Level Meter (sensor abnormal)
    0x55: "EX205", // Radar Liquid Level Meter (normal)
    0x56: "EX301", // Vibration Sensor

    // SC Series
    0x60: "SC001", // Safety Helmet with multiple sensors

    // M/CM Series
    0x1e: "CM100", // Beacon Receiver/Gateway

    // Legacy mappings
    0x0a: "M300C",
    0x07: "M100C",
    0x08: "M101A",
    0x09: "M102A"
};

/* ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================ */

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
    return {
        str: str,
        nextIndex: i + 1
    };
}

/**
 * Read unsigned 8-bit integer from byte array
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Current index
 * @returns {number} Unsigned 8-bit integer
 */
function readUint8(bytes, idx) {
    return bytes[idx] & 0xFF;
}

/**
 * Read unsigned 16-bit integer (big-endian) from byte array
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Current index
 * @returns {number} Unsigned 16-bit integer
 */
function readUint16BE(bytes, idx) {
    return ((bytes[idx] & 0xFF) << 8) | (bytes[idx + 1] & 0xFF);
}

/**
 * Read signed 16-bit integer (big-endian) from byte array
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Current index
 * @returns {number} Signed 16-bit integer
 */
function readInt16BE(bytes, idx) {
    const val = readUint16BE(bytes, idx);
    return val & 0x8000 ? val - 0x10000 : val;
}

/**
 * Read unsigned 32-bit integer (big-endian) from byte array
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Current index
 * @returns {number} Unsigned 32-bit integer
 */
function readUint32BE(bytes, idx) {
    return ((bytes[idx] & 0xFF) << 24) |
    ((bytes[idx + 1] & 0xFF) << 16) |
    ((bytes[idx + 2] & 0xFF) << 8) |
    (bytes[idx + 3] & 0xFF);
}

/**
 * Read signed 32-bit integer (big-endian) from byte array
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Current index
 * @returns {number} Signed 32-bit integer
 */
function readInt32BE(bytes, idx) {
    const val = readUint32BE(bytes, idx);
    return val & 0x80000000 ? val - 0x100000000 : val;
}

/**
 * Read IEEE 754 float (32-bit) from byte array (big-endian)
 * @param {number[]} bytes - Byte array
 * @param {number} idx - Starting index
 * @returns {number} Float value
 */
function readFloatBE(bytes, idx) {
    // Create a buffer and DataView to read IEEE 754 float
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);

    // Copy bytes (big-endian)
    view.setUint8(0, bytes[idx]);
    view.setUint8(1, bytes[idx + 1]);
    view.setUint8(2, bytes[idx + 2]);
    view.setUint8(3, bytes[idx + 3]);

    // Read as float (big-endian)
    return view.getFloat32(0, false); // false = big-endian
}

/**
 * Convert hex string to byte array
 * @param {string} hex - Hex string (can include spaces and 0x prefixes)
 * @returns {number[]} Byte array
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        return [];
    hex = hex.replace(/\s+/g, '').replace(/0x/gi, '');
    if (hex.length % 2 !== 0)
        hex = '0' + hex;
    const out = [];
    for (let i = 0; i < hex.length; i += 2) {
        out.push(parseInt(hex.substr(i, 2), 16));
    }
    return out;
}

/**
 * Calculate Modbus CRC16 for RTU frames
 * @param {number[]} data - Byte array without CRC
 * @returns {number[]} Two CRC bytes [low, high] (little-endian)
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
    return [(crc & 0xFF), ((crc >> 8) & 0xFF)];
}

/**
 * Parse Modbus data block (Type 0x95) for W8004 thermostat
 * @param {number[]} modBytes - Modbus data bytes
 * @param {object} out - Output object to populate
 */
function parseModbusBlock(modBytes, out) {
    if (!modBytes || modBytes.length < 2)
        return;

    const blockId = (modBytes[0] << 8) | modBytes[1];

    // Remote control status block (0xF000+)
    if (blockId === 0xF000) {
        let offset = 2;
        let register = 0xF000;
        while (offset + 1 < modBytes.length) {
            const val = (modBytes[offset] << 8) | modBytes[offset + 1];
            const valLow = val & 0xFF;

            switch (register) {
            case 0xF000: // Remote power state
                out.powerState = valLow === 1 ? 1 : 0;
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

    // Normal status block (starting from register 0x0000)
    let offset = 2;
    let register = 0x0000;
    while (offset + 1 < modBytes.length) {
        const valU = (modBytes[offset] << 8) | modBytes[offset + 1];
        const valS = valU & 0x8000 ? valU - 0x10000 : valU;

        switch (register) {
        case 0x0000: // Device version
            out.hardwareVersion = (valU >> 8) & 0xFF;
            out.softwareVersion = valU & 0xFF;
            break;
        case 0x0001: // Device status
            const status = valU & 0xFF;
            out.powerState = (status & 0x01) === 0 ? 1 : 0; // Bit0: 0=on, 1=off
            out.keyLockState = (status & 0x02) ? 1 : 0; // Bit1: key lock
            out.valveState = (status & 0x04) ? 0 : 1; // Bit2: 0=open, 1=close
            break;
        case 0x0002: // Current temperature (°C × 100)
            out.temperature = valS / 100.0;
            break;
        case 0x0003: // Current humidity (%RH × 100)
            out.humidity = valU / 100.0;
            break;
        case 0x0004: // Set temperature (°C × 100)
            out.setTemperature = valS / 100.0;
            break;
        case 0x0005: // Work mode
            out.workMode = valU & 0xFF;
            break;
        case 0x0006: // Fan speed
            out.fanSpeed = valU & 0xFF;
            break;
        case 0x0007: // Cumulative on time (value × 10 minutes)
            out.cumulativeOnTime = valU * 10;
            break;
        case 0x0008: // Cumulative valve open time (value × 10 minutes)
            out.cumulativeValveOpenTime = valU * 10;
            break;
        }

        offset += 2;
        register += 1;
    }
}

/**
 * Parse EF5600-DN1 electrical fire data (Type 0xC6)
 * @param {number[]} elecBytes - Electrical data bytes
 * @param {object} out - Output object to populate
 */
function parseElectricalFireData(elecBytes, out) {
     if (!elecBytes || elecBytes.length < 102) {
        throw new Error(`Electrical fire data too short: got ${elecBytes ? elecBytes.length : 0} bytes, expected 102 bytes`);
    }

    let idx = 0;

    // Parse voltages (÷10)
    out.voltageA = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.voltageB = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.voltageC = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;

    // Parse currents (÷10)
    out.currentA = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.currentB = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.currentC = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;

    // Parse leakage current (÷10, unit: mA)
    out.leakageCurrent = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;

    // Parse temperature sensors (÷10)
    out.tempSensor1 = readInt16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.tempSensor2 = readInt16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.tempSensor3 = readInt16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.tempSensor4 = readInt16BE(elecBytes, idx) / 10.0;
    idx += 2;

    // Parse environment temperature and humidity (÷10)
    out.envTemperature = readInt16BE(elecBytes, idx) / 10.0;
    idx += 2;
    out.envHumidity = readUint16BE(elecBytes, idx) / 10.0;
    idx += 2;

    // Parse active powers (IEEE 754 float)
    out.activePowerA = readFloatBE(elecBytes, idx);
    idx += 4;
    out.activePowerB = readFloatBE(elecBytes, idx);
    idx += 4;
    out.activePowerC = readFloatBE(elecBytes, idx);
    idx += 4;
    out.activePowerTotal = readFloatBE(elecBytes, idx);
    idx += 4;

    // Parse reactive powers
    out.reactivePowerA = readFloatBE(elecBytes, idx);
    idx += 4;
    out.reactivePowerB = readFloatBE(elecBytes, idx);
    idx += 4;
    out.reactivePowerC = readFloatBE(elecBytes, idx);
    idx += 4;
    out.reactivePowerTotal = readFloatBE(elecBytes, idx);
    idx += 4;

    // Parse apparent powers
    out.apparentPowerA = readFloatBE(elecBytes, idx);
    idx += 4;
    out.apparentPowerB = readFloatBE(elecBytes, idx);
    idx += 4;
    out.apparentPowerC = readFloatBE(elecBytes, idx);
    idx += 4;
    out.apparentPowerTotal = readFloatBE(elecBytes, idx);
    idx += 4;

    // Parse power factors
    out.powerFactorA = readFloatBE(elecBytes, idx);
    idx += 4;
    out.powerFactorB = readFloatBE(elecBytes, idx);
    idx += 4;
    out.powerFactorC = readFloatBE(elecBytes, idx);
    idx += 4;
    out.powerFactorTotal = readFloatBE(elecBytes, idx);
    idx += 4;

    // Parse energy values
    out.activeEnergy = readFloatBE(elecBytes, idx);
    idx += 4;
    out.reactiveEnergy = readFloatBE(elecBytes, idx);
    idx += 4;
    out.apparentEnergy = readFloatBE(elecBytes, idx);
    idx += 4;

    // Calculate derived values
    out.voltageAvg = (out.voltageA + out.voltageB + out.voltageC) / 3;
    out.currentAvg = (out.currentA + out.currentB + out.currentC) / 3;
    out.tempAvg = (out.tempSensor1 + out.tempSensor2 + out.tempSensor3 + out.tempSensor4) / 4;
}

/**
 * Parse electrical fire alarm bitfield (Types 0xC7 and 0xC8)
 * @param {number} alarmBits - 16-bit alarm bitfield
 * @returns {object} Parsed alarm status object
 */
function parseElectricalAlarm(alarmBits) {
    return {
        // Phase overcurrent alarms
        alarmOvercurrentA: (alarmBits & 0x0001) !== 0,
        alarmOvercurrentB: (alarmBits & 0x0002) !== 0,
        alarmOvercurrentC: (alarmBits & 0x0004) !== 0,

        // Phase overvoltage alarms
        alarmOvervoltageA: (alarmBits & 0x0008) !== 0,
        alarmOvervoltageB: (alarmBits & 0x0010) !== 0,
        alarmOvervoltageC: (alarmBits & 0x0020) !== 0,

        // Phase undervoltage alarms
        alarmUndervoltageA: (alarmBits & 0x0040) !== 0,
        alarmUndervoltageB: (alarmBits & 0x0080) !== 0,
        alarmUndervoltageC: (alarmBits & 0x0100) !== 0,

        // Short circuit alarm
        alarmShortCircuit: (alarmBits & 0x0200) !== 0,

        // Temperature sensor alarms
        alarmTempSensor1: (alarmBits & 0x0400) !== 0,
        alarmTempSensor2: (alarmBits & 0x0800) !== 0,
        alarmTempSensor3: (alarmBits & 0x1000) !== 0,
        alarmTempSensor4: (alarmBits & 0x2000) !== 0,

        // Leakage current alarm
        alarmLeakage: (alarmBits & 0x4000) !== 0,

        // Any alarm active (for quick status check)
        anyAlarm: alarmBits !== 0
    };
}

/**
 * Parse beacon data for CM100 and SC001 devices
 * Beacon data structure (variable length):
 *   Byte 0: Data length (N)
 *   Bytes 1-4: Timestamp (32-bit unsigned, big-endian, Unix time)
 *   Byte 5: Number of beacons (M)
 *   For each beacon (10 bytes each):
 *     Byte 0: Flags (bit0: timestamp valid, bit1: repeat send)
 *     Bytes 1-4: Beacon ID (32-bit unsigned, big-endian)
 *     Bytes 5-6: Time offset in seconds (16-bit unsigned, big-endian)
 *     Byte 7: RSSI (signed 8-bit)
 *     Byte 8: Beacon battery level (0-100%, 255=invalid)
 *     Byte 9: Number of beacons scanned
 * @param {number[]} beaconBytes - Beacon data bytes
 * @param {object} out - Output object to populate
 */
function parseBeaconData(beaconBytes, out) {
    if (!beaconBytes || beaconBytes.length < 6) {
        throw new Error("Beacon data too short");
        return;
    }

    let idx = 0;
    const dataLength = beaconBytes[idx++];

    // Check if length byte matches actual data
    if (beaconBytes.length < dataLength + 1) {
        throw new Error("Beacon data length mismatch");
        return;
    }

    // Parse timestamp
    out.beaconTimestamp = readUint32BE(beaconBytes, idx);
    idx += 4;

    // Parse beacon count
    out.beaconCount = beaconBytes[idx++];

    // Initialize beacon array
    out.beacons = [];

    // Parse each beacon (10 bytes each)
    for (let i = 0; i < out.beaconCount; i++) {
        if (idx + 10 > beaconBytes.length)
            break;

        const beacon = {
            flags: beaconBytes[idx++],
            id: readUint32BE(beaconBytes, idx)
        };
        idx += 4;

        beacon.timeOffset = readUint16BE(beaconBytes, idx);
        idx += 2;

        // Calculate absolute time
        beacon.absoluteTime = out.beaconTimestamp - beacon.timeOffset;

        // RSSI (signed 8-bit)
        beacon.rssi = beaconBytes[idx] & 0x80 ? beaconBytes[idx] - 0x100 : beaconBytes[idx];
        idx++;

        // Battery level (0-100, 255=invalid)
        beacon.batteryLevel = beaconBytes[idx++];
        beacon.batteryValid = beacon.batteryLevel !== 255;

        // Number of scanned beacons
        beacon.scannedCount = beaconBytes[idx++];

        out.beacons.push(beacon);
    }
}

/**
 * Parse simple beacon data for AN-122 device
 * Simple beacon data structure (8 bytes fixed):
 *   Byte 0: Length (fixed 0x07)
 *   Bytes 1-4: Beacon ID (32-bit unsigned, big-endian)
 *   Byte 5: 1m reference RSSI (signed 8-bit)
 *   Byte 6: Received RSSI (signed 8-bit)
 *   Byte 7: Beacon battery level (0-100%, 255=invalid)
 * @param {number[]} beaconBytes - Simple beacon data bytes
 * @param {object} out - Output object to populate
 * @param {number} beaconIndex - Index of this beacon (0, 1, 2)
 */
function parseSimpleBeaconData(beaconBytes, out, beaconIndex) {
    if (!beaconBytes || beaconBytes.length < 8) {
        throw new Error(`Beacon ${beaconIndex} data too short`);
        return;
    }

    let idx = 0;
    const dataLength = beaconBytes[idx++];

    if (dataLength !== 0x07) {
        throw new Error(`Unexpected beacon data length: 0x${dataLength.toString(16)}`);
        return;
    }

    const beacon = {
        id: readUint32BE(beaconBytes, idx)
    };
    idx += 4;

    // 1m reference RSSI
    beacon.refRssi = beaconBytes[idx] & 0x80 ? beaconBytes[idx] - 0x100 : beaconBytes[idx];
    idx++;

    // Received RSSI
    beacon.rssi = beaconBytes[idx] & 0x80 ? beaconBytes[idx] - 0x100 : beaconBytes[idx];
    idx++;

    // Battery level
    beacon.batteryLevel = beaconBytes[idx];
    beacon.batteryValid = beacon.batteryLevel !== 255;

    // Store in output with index
    out[`beacon${beaconIndex}`] = beacon;
}

/**
 * Parse vibration sensor data for EX301 device
 * Vibration data structure (30 bytes fixed):
 *   Byte 0: Length (fixed 0x1E = 30 bytes)
 *   Bytes 1-2: X-axis frequency (Hz, unsigned 16-bit, big-endian)
 *   Bytes 3-4: Y-axis frequency (Hz, unsigned 16-bit, big-endian)
 *   Bytes 5-6: Z-axis frequency (Hz, unsigned 16-bit, big-endian)
 *   Bytes 7-8: X-axis acceleration (mg, unsigned 16-bit, big-endian)
 *   Bytes 9-10: Y-axis acceleration (mg, unsigned 16-bit, big-endian)
 *   Bytes 11-12: Z-axis acceleration (mg, unsigned 16-bit, big-endian)
 *   Bytes 13-15: X-axis velocity (mm/s ÷10, unsigned 24-bit, big-endian)
 *   Bytes 16-18: Y-axis velocity (mm/s ÷10, unsigned 24-bit, big-endian)
 *   Bytes 19-21: Z-axis velocity (mm/s ÷10, unsigned 24-bit, big-endian)
 *   Bytes 22-24: X-axis displacement (μm ÷10, unsigned 24-bit, big-endian)
 *   Bytes 25-27: Y-axis displacement (μm ÷10, unsigned 24-bit, big-endian)
 *   Bytes 28-30: Z-axis displacement (μm ÷10, unsigned 24-bit, big-endian)
 * @param {number[]} vibBytes - Vibration data bytes
 * @param {object} out - Output object to populate
 */
function parseVibrationData(vibBytes, out) {
    if (!vibBytes || vibBytes.length < 31) {
        throw new Error("Vibration data too short");
        return;
    }

    let idx = 0;
    const dataLength = vibBytes[idx++];

    if (dataLength !== 0x1E) {
        throw new Error(`Unexpected vibration data length: 0x${dataLength.toString(16)}`);
        return;
    }

    // Parse frequencies (Hz)
    out.vibFreqX = readUint16BE(vibBytes, idx);
    idx += 2;
    out.vibFreqY = readUint16BE(vibBytes, idx);
    idx += 2;
    out.vibFreqZ = readUint16BE(vibBytes, idx);
    idx += 2;

    // Parse accelerations (mg)
    out.vibAccelX = readUint16BE(vibBytes, idx);
    idx += 2;
    out.vibAccelY = readUint16BE(vibBytes, idx);
    idx += 2;
    out.vibAccelZ = readUint16BE(vibBytes, idx);
    idx += 2;

    // Parse velocities (mm/s ÷10)
    out.vibVelX = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;
    out.vibVelY = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;
    out.vibVelZ = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;

    // Parse displacements (μm ÷10)
    out.vibDispX = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;
    out.vibDispY = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;
    out.vibDispZ = ((vibBytes[idx] << 16) | (vibBytes[idx + 1] << 8) | vibBytes[idx + 2]) / 10.0;
    idx += 3;
}

/**
 * Parse vibration alarm bitfield for EX301 device
 * Vibration alarm bitfield (16 bits, big-endian):
 *   Bit0: X-axis acceleration alarm
 *   Bit1: Y-axis acceleration alarm
 *   Bit2: Z-axis acceleration alarm
 *   Bit3: X-axis velocity alarm
 *   Bit4: Y-axis velocity alarm
 *   Bit5: Z-axis velocity alarm
 *   Bit6: X-axis displacement alarm
 *   Bit7: Y-axis displacement alarm
 *   Bit8: Z-axis displacement alarm
 *   Bit15: Sensor abnormal (cannot collect data)
 * @param {number} alarmBits - 16-bit alarm bitfield
 * @returns {object} Parsed vibration alarm status object
 */
function parseVibrationAlarm(alarmBits) {
    return {
        alarmAccelX: (alarmBits & 0x0001) !== 0,
        alarmAccelY: (alarmBits & 0x0002) !== 0,
        alarmAccelZ: (alarmBits & 0x0004) !== 0,
        alarmVelX: (alarmBits & 0x0008) !== 0,
        alarmVelY: (alarmBits & 0x0010) !== 0,
        alarmVelZ: (alarmBits & 0x0020) !== 0,
        alarmDispX: (alarmBits & 0x0040) !== 0,
        alarmDispY: (alarmBits & 0x0080) !== 0,
        alarmDispZ: (alarmBits & 0x0100) !== 0,
        sensorAbnormal: (alarmBits & 0x8000) !== 0,
        anyAlarm: alarmBits !== 0
    };
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
        warnings.push(`Expected fPort 210, got ${fPort} - decoder may not work correctly`);
        if (fPort !== 2 && fPort !== 220) {
            errors.push(`Unsupported fPort: ${fPort}`);
            return {
                data,
                errors,
                warnings
            };
        }
    }

    // Validate minimum payload length
    if (bytes.length < 2) {
        errors.push("Payload too short (minimum 2 bytes required)");
        return {
            data,
            errors,
            warnings
        };
    }

    // First byte is reserved for protocol version (currently 0x00)
    let idx = 1;

    // Parse all Type-Value pairs
    while (idx < bytes.length) {
        const type = bytes[idx];
        idx++;

        if (type === undefined)
            break;

        try {
            switch (type) {
                // ========== DEVICE MODEL (All devices) ==========
                // Type 0x01: Device model identifier (1 byte) - All devices
            case 0x01:
                if (idx >= bytes.length) {
                    warnings.push("Truncated model field");
                    break;
                }
                const modelCode = bytes[idx++];
                data.model = MODEL_MAP[modelCode] || (`unknown_0x${modelCode.toString(16)}`);
                break;

            case 0x02: // Downlink count (4 bytes BE)
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated downlink count");
                    break;
                }
                data.downlinkCount = readUint32BE(bytes, idx);
                idx += 4;
                break;

                // ========== TAMPER DETECTION (AN-301, AN-303, AN-304, AN-305, AN-113, AN-122, AN-306, AN-308, JTY-AN-503A) ==========
                // Type 0x03: Tamper event (1 byte)
            case 0x03:
                if (idx >= bytes.length) {
                    warnings.push("Truncated tamper event");
                    break;
                }
                data.tamperEvent = bytes[idx++];
                break;

                // ========== BATTERY INFORMATION (Most battery-powered devices) ==========
                // Type 0x04: Battery voltage in millivolts (2 bytes, big-endian) - AN-113, AN-308, EX205, EX301, EF5600-DN1, CU606
            case 0x04:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated battery voltage");
                    break;
                }
                const battVoltage = readUint16BE(bytes, idx);
                data.batteryVoltage = Number((battVoltage / 1000).toFixed(3)); // Convert mV to V
                idx += 2;
                break;

                // Type 0x05: Battery voltage event (1 byte) - AN-204, AN-301, AN-303, AN-304, AN-305, AN-113, AN-308, EX205, EX301, JTY-AN-503A
            case 0x05:
                if (idx >= bytes.length) {
                    warnings.push("Truncated battery event");
                    break;
                }
                const battEvent = bytes[idx++];
                data.batteryVoltageEvent = battEvent;
                data.batteryLowEvent = battEvent === 0x01 ? 1 : 0;
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
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated P2P update frequency");
                    break;
                }
                data.p2pUpdateFrequency = readUint32BE(bytes, idx);
                idx += 4;
                break;

            case 0x0b: // P2P config frequency (4 bytes BE)
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated P2P config frequency");
                    break;
                }
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

                // ========== TEMPERATURE & HUMIDITY (AN-303, CU606, JTY-AN-503A, EF5600-DN1, SC001, EX301) ==========
                // Type 0x10: Temperature in Celsius (2 bytes signed, big-endian, ×100)
            case 0x10:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated temperature");
                    break;
                }
                const temp = readInt16BE(bytes, idx);
                data.temperature = Number((temp / 100).toFixed(2));
                idx += 2;
                break;

                // Type 0x11: Temperature event (1 byte) - AN-303, SC001
            case 0x11:
                if (idx >= bytes.length) {
                    warnings.push("Truncated temperature event");
                    break;
                }
                const tempEvent = bytes[idx++];
                data.temperatureEvent = tempEvent;
                data.temperatureState = tempEvent === 0 ? 0 : 1;
                break;

                // Type 0x12: Humidity in %RH (2 bytes unsigned, big-endian, ×10)
            case 0x12:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated humidity");
                    break;
                }
                const hum = readUint16BE(bytes, idx);
                data.humidity = Number((hum / 10).toFixed(1));
                idx += 2;
                break;

                // Type 0x13: Humidity event (1 byte) - AN-303
            case 0x13:
                if (idx >= bytes.length) {
                    warnings.push("Truncated humidity event");
                    break;
                }
                const humEvent = bytes[idx++];
                data.humidityEvent = humEvent;
                data.humidityState = humEvent === 0 ? 0 : 1;
                break;

                // ========== SOS EMERGENCY (AN-301, SC001, CM100) ==========
                // Type 0x14: SOS event (1 byte)
            case 0x14:
                if (idx >= bytes.length) {
                    warnings.push("Truncated SOS event");
                    break;
                }
                data.sosEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

            case 0x15: // Gas concentration (2 bytes BE, ppm)
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated gas concentration");
                    break;
                }
                data.gasConcentration = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // ========== SECURITY & SAFETY DEVICES ==========
                // Type 0x17: Infrared event (1 byte) - AN-304
            case 0x17:
                if (idx >= bytes.length) {
                    warnings.push("Truncated infrared event");
                    break;
                }
                data.infraredEvent = bytes[idx++];
                break;

                // Type 0x18: Door state (1 byte) - AN-305
            case 0x18:
                if (idx >= bytes.length) {
                    warnings.push("Truncated door state");
                    break;
                }
                data.doorState = bytes[idx++];
                break;

                // Type 0x1B: Sensor status (1 byte) - EX205 abnormal packet
            case 0x1B:
                if (idx >= bytes.length) {
                    warnings.push("Truncated sensor status");
                    break;
                }
                data.sensorStatus = bytes[idx++];
                data.sensorAbnormal = data.sensorStatus === 0x01 ? 1 : 0;
                break;

                // Type 0x21: Water leakage event (1 byte) - AN-204
            case 0x21:
                if (idx >= bytes.length) {
                    warnings.push("Truncated water event");
                    break;
                }
                data.waterEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0x22: Relay/Switch state (1 byte) - DS-501, DS-103, EF5600-DN1
            case 0x22:
                if (idx >= bytes.length) {
                    warnings.push("Truncated relay/switch state");
                    break;
                }
                // For DS-103, store in array for multiple switches
                if (data.model === "DS-103") {
                    if (!data.switchStates)
                        data.switchStates = [];
                    data.switchStates.push(bytes[idx++]);
                } else {
                    // For other devices, treat as power state
                    data.powerState = bytes[idx++];
                }
                break;

                // Type 0x24: Door event (1 byte) - AN-305
            case 0x24:
                if (idx >= bytes.length) {
                    warnings.push("Truncated door event");
                    break;
                }
                data.doorEvent = bytes[idx++];
                break;

                // Type 0x31: Smoke alarm event (1 byte) - JTY-AN-503A
            case 0x31:
                if (idx >= bytes.length) {
                    warnings.push("Truncated smoke event");
                    break;
                }
                data.smokeEvent = bytes[idx++];
                break;

                // ========== POSITIONING & LOCATION (AN-122, SC001) ==========
                // Type 0x3E: Latitude (4 bytes signed, big-endian, ÷10000000)
            case 0x3E:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated latitude");
                    break;
                }
                const lat = readInt32BE(bytes, idx);
                data.latitude = Number((lat / 10000000).toFixed(7));
                idx += 4;
                break;

                // Type 0x3A: Alarm status (1 byte) - AN-307
            case 0x3A:
                if (idx >= bytes.length) {
                    warnings.push("Truncated alarm status");
                    break;
                }
                data.alarmStatus = bytes[idx++];
                break;

                // Type 0x43: Longitude (4 bytes signed, big-endian, ÷10000000)
            case 0x43:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated longitude");
                    break;
                }
                const lon = readInt32BE(bytes, idx);
                data.longitude = Number((lon / 10000000).toFixed(7));
                idx += 4;
                break;

                // ========== AIR QUALITY SENSOR (CU606) ==========
                // Type 0x49: CO2 concentration (2 bytes unsigned, big-endian, unit: ppm)
            case 0x49:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated CO2");
                    break;
                }
                data.co2 = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // Type 0x48: Illuminance (4 bytes unsigned, big-endian, unit: Lux) - AN-308
            case 0x48:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated illuminance");
                    break;
                }
                data.illuminance = readUint32BE(bytes, idx);
                idx += 4;
                break;

                // Type 0x52: PM2.5 concentration (2 bytes unsigned, big-endian, unit: μg/m³) - CU606
            case 0x52:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated PM2.5");
                    break;
                }
                data.pm25 = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // ========== SAFETY HELMET SENSORS (SC001) ==========
                // Type 0x57: Atmospheric pressure (4 bytes unsigned, big-endian, unit: Pa)
            case 0x57:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated atmospheric pressure");
                    break;
                }
                data.atmosphericPressure = readUint32BE(bytes, idx);
                idx += 4;
                break;

                // ========== TILT/ANGLE SENSOR (AN-113, AN-122) ==========
                // Type 0x6B: Tilt angle (2 bytes, degrees)
            case 0x6B:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated tilt angle");
                    break;
                }
                data.tiltAngle = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // ========== PACKET TYPE (Most devices) ==========
                // Type 0x6D: Packet type (1 byte) - heartbeat(0x00) or data report(0x01)
            case 0x6D:
                if (idx >= bytes.length) {
                    warnings.push("Truncated packet type");
                    break;
                }
                data.packetType = bytes[idx++];
                data.isHeartbeat = data.packetType === 0x00 ? 1 : 0;
                break;

                // ========== WATER LEAKAGE SENSOR (AN-204) ==========
                // Type 0x73: Water leakage duration in minutes (2 bytes, big-endian)
            case 0x73:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated water duration");
                    break;
                }
                data.waterDuration = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // ========== DOOR STATE (AN-305) ==========
                // Type 0x76: Door state (alternate) (1 byte)
            case 0x76:
                if (idx >= bytes.length) {
                    warnings.push("Truncated door state");
                    break;
                }
                data.doorState = bytes[idx++];
                break;

                // ========== TAMPER STATE (AN-301, AN-303, AN-304, AN-305, AN-113, AN-122, AN-306, AN-308, JTY-AN-503A) ==========
                // Type 0x77: Tamper state (1 byte)
            case 0x77:
                if (idx >= bytes.length) {
                    warnings.push("Truncated tamper state");
                    break;
                }
                data.tamperStatus = bytes[idx++];
                data.tamper = data.tamperStatus;
                break;

                // ========== BATTERY VOLTAGE STATE (AN-301, AN-303, AN-304, AN-113, AN-308, EX205, EX301, CU606, JTY-AN-503A) ==========
                // Type 0x7D: Battery voltage state (1 byte)
            case 0x7D:
                if (idx >= bytes.length) {
                    warnings.push("Truncated battery voltage state");
                    break;
                }
                data.batteryVoltageState = bytes[idx++];
                break;

                // ========== SMART SOCKET (DS-501, DS-103) ==========
                // Type 0x79: Local timestamp (4 bytes, big-endian, Unix time)
            case 0x79:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated timestamp");
                    break;
                }
                const timestamp = readUint32BE(bytes, idx);
                data.timestamp = timestamp;
                if (timestamp !== 0) {
                    data.localTime = new Date(timestamp * 1000).toISOString();
                }
                idx += 4;
                break;

                // Type 0x80: Timer status (4 bytes bitfield, big-endian) - DS-501, DS-103
            case 0x80:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated timer status");
                    break;
                }
                const timerStatus = readUint32BE(bytes, idx);
                data.timerStatus = timerStatus;
                // Parse common timer flags
                data.timerCloseEnabled = (timerStatus & 0x01) !== 0;
                data.timerOpenEnabled = (timerStatus & 0x02) !== 0;
                data.timerLockEnabled = (timerStatus & 0x40000000) !== 0;
                data.timerUnlockEnabled = (timerStatus & 0x80000000) !== 0;
                idx += 4;
                break;

                // Type 0x81: Liquid level event (1 byte) - EX205
            case 0x81:
                if (idx >= bytes.length) {
                    warnings.push("Truncated liquid level event");
                    break;
                }
                data.liquidLevelEvent = bytes[idx++];
                break;

                // Type 0x82: Sensor self-check event (1 byte) - JTY-AN-503A
            case 0x82:
                if (idx >= bytes.length) {
                    warnings.push("Truncated self-check event");
                    break;
                }
                data.selfCheckEvent = bytes[idx++];
                break;

                // Type 0x84: Smoke alarm status (1 byte) - JTY-AN-503A
            case 0x84:
                if (idx >= bytes.length) {
                    warnings.push("Truncated smoke status");
                    break;
                }
                data.smokeStatus = bytes[idx++];
                break;

                // Type 0x85: Water leakage status (1 byte) - AN-204
            case 0x85:
                if (idx >= bytes.length) {
                    warnings.push("Truncated water status");
                    break;
                }
                data.waterStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // ========== RADAR LIQUID LEVEL METER (EX205) ==========
                // Type 0x80: Liquid level (2 bytes unsigned, big-endian, ÷10, unit: cm)
            case 0x80:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated liquid level");
                    break;
                }
                const level = readUint16BE(bytes, idx);
                data.liquidLevel = Number((level / 10).toFixed(1));
                idx += 2;
                break;

                // ========== BATTERY PERCENTAGE (SC001, AN-122, CM100) ==========
                // Type 0x93: Battery percentage (1 byte, 0-100%)
            case 0x93:
                if (idx >= bytes.length) {
                    warnings.push("Truncated battery percentage");
                    break;
                }
                data.batteryLevel = bytes[idx++];
                break;

                // ========== THERMOSTAT (W8004) ==========
                // Type 0x94: RS485 address (1 byte)
            case 0x94:
                if (idx >= bytes.length) {
                    warnings.push("Truncated RS485 address");
                    break;
                }
                data.rs485Addr = bytes[idx++];
                break;

                // Type 0x95: Modbus data block (variable length)
            case 0x95:
                if (idx >= bytes.length) {
                    warnings.push("Missing Modbus data length");
                    break;
                }
                const modbusLen = bytes[idx++];
                if (idx + modbusLen > bytes.length) {
                    warnings.push("Modbus block exceeds payload, trimming");
                }
                const endIdx = Math.min(idx + modbusLen, bytes.length);
                const modbusBytes = bytes.slice(idx, endIdx);
                parseModbusBlock(modbusBytes, data);
                idx = endIdx;
                break;

                // ========== SMART SOCKET LOCK STATE (DS-501, DS-103) ==========
                // Type 0x96: Lock state (1 byte)
            case 0x96:
                if (idx >= bytes.length) {
                    warnings.push("Truncated lock state");
                    break;
                }
                data.lockState = bytes[idx++];
                break;

                // ========== SMART SOCKET POWER METERING (DS-501) ==========
                // Type 0x97: Voltage RMS (2 bytes unsigned, big-endian, ÷10, unit: V)
            case 0x97:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated voltage");
                    break;
                }
                data.voltage = readUint16BE(bytes, idx) / 10.0;
                idx += 2;
                break;

                // Type 0x98: Current RMS (2 bytes unsigned, big-endian, ÷100, unit: A)
            case 0x98:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated current");
                    break;
                }
                data.current = readUint16BE(bytes, idx) / 100.0;
                idx += 2;
                break;

                // Type 0x99: Active power (2 bytes signed, big-endian, ÷100, unit: W)
            case 0x99:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated power");
                    break;
                }
                data.activePower = readInt16BE(bytes, idx) / 100.0;
                idx += 2;
                break;

                // Type 0x9A: Energy consumption (4 bytes unsigned, big-endian, ÷100, unit: kWh)
            case 0x9A:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated energy");
                    break;
                }
                data.energy = readUint32BE(bytes, idx) / 100.0;
                idx += 4;
                break;

                // Type 0x9B: Liquid level status (1 byte) - EX205
            case 0x9B:
                if (idx >= bytes.length) {
                    warnings.push("Truncated liquid level status");
                    break;
                }
                data.liquidLevelStatus = bytes[idx++];
                break;

                // Type 0x9F: Formaldehyde concentration (2 bytes unsigned, big-endian, unit: μg/m³) - CU606
            case 0x9F:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated formaldehyde");
                    break;
                }
                data.formaldehyde = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // Type 0xA0: TVOC concentration (2 bytes unsigned, big-endian, unit: μg/m³) - CU606
            case 0xA0:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated TVOC");
                    break;
                }
                data.tvoc = readUint16BE(bytes, idx);
                idx += 2;
                break;

                // ========== ACCELERATION ALARM (AN-113, AN-122) ==========
                // Type 0xA8: Acceleration alarm event (1 byte)
            case 0xA8:
                if (idx >= bytes.length) {
                    warnings.push("Truncated acceleration alarm");
                    break;
                }
                data.accelerationAlarm = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xA9: Temperature alarm status (1 byte) - SC001, EX301
            case 0xA9:
                if (idx >= bytes.length) {
                    warnings.push("Truncated temperature alarm status");
                    break;
                }
                data.temperatureAlarmStatus = bytes[idx++];
                break;

                // ========== TEMPERATURE (SC001, EX301) ==========
                // Type 0xAA: Temperature (2 bytes signed, big-endian, ÷10, unit: °C)
            case 0xAA:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated temperature (0xAA)");
                    break;
                }
                const tempAA = readInt16BE(bytes, idx);
                data.temperature = Number((tempAA / 10).toFixed(1));
                idx += 2;
                break;

                // ========== RADAR HUMAN PRESENCE SENSOR (AN-306) ==========
                // Type 0xBD: Human presence status (1 byte)
            case 0xBD:
                if (idx >= bytes.length) {
                    warnings.push("Truncated human presence status");
                    break;
                }
                data.presenceStatus = bytes[idx++];
                data.presence = data.presenceStatus === 0x01 ? 1 : 0;
                break;

                // Type 0xBE: Human presence event (1 byte)
            case 0xBE:
                if (idx >= bytes.length) {
                    warnings.push("Truncated human presence event");
                    break;
                }
                data.presenceEvent = bytes[idx++];
                break;

                // ========== RADAR LIQUID LEVEL METER DISTANCE (EX205) ==========
                // Type 0xB9: Distance (4 bytes unsigned, big-endian, ÷10, unit: cm)
            case 0xB9:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated distance");
                    break;
                }
                const distance = readUint32BE(bytes, idx);
                data.distance = Number((distance / 10).toFixed(1));
                idx += 4;
                break;

                // ========== SWITCH TIMER STATUS (DS-103) ==========
                // Type 0xB0: Switch timer status (4 bytes bitfield, big-endian)
            case 0xB0:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated switch timer status");
                    break;
                }
                const switchTimerStatus = readUint32BE(bytes, idx);
                data.switchTimerStatus = switchTimerStatus;
                // Parse DS-103 specific timer flags
                data.timerCloseEnabled1 = (switchTimerStatus & 0x01) !== 0;
                data.timerOpenEnabled1 = (switchTimerStatus & 0x02) !== 0;
                data.timerCloseEnabled2 = (switchTimerStatus & 0x04) !== 0;
                data.timerOpenEnabled2 = (switchTimerStatus & 0x08) !== 0;
                data.timerCloseEnabled3 = (switchTimerStatus & 0x10) !== 0;
                data.timerOpenEnabled3 = (switchTimerStatus & 0x20) !== 0;
                data.timerLockEnabled = (switchTimerStatus & 0x40000000) !== 0;
                data.timerUnlockEnabled = (switchTimerStatus & 0x80000000) !== 0;
                idx += 4;
                break;

                // ========== BATTERY LOW PERCENTAGE ALARM (SC001, AN-122, CM100) ==========
                // Type 0xB8: Battery low percentage alarm event (1 byte)
            case 0xB8:
                if (idx >= bytes.length) {
                    warnings.push("Truncated battery low alarm");
                    break;
                }
                data.batteryLowAlarm = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // ========== BEACON DATA (SC001, AN-122, CM100) ==========
                // Type 0xBA: Simple beacon data (8 bytes fixed)
            case 0xBA:
                if (idx >= bytes.length) {
                    warnings.push("Missing simple beacon data length");
                    break;
                }
                const simpleBeaconLen = bytes[idx++];
                // Find which beacon index this is (0, 1, or 2)
                let beaconIndex = 0;
                if (data.beacon0)
                    beaconIndex = 1;
                if (data.beacon1)
                    beaconIndex = 2;
                if (idx + simpleBeaconLen > bytes.length) {
                    warnings.push("Simple beacon data block exceeds payload, trimming");
                }
                const simpleBeaconEndIdx = Math.min(idx + simpleBeaconLen, bytes.length);
                const simpleBeaconBytes = bytes.slice(idx, simpleBeaconEndIdx);
                parseSimpleBeaconData(simpleBeaconBytes, data, beaconIndex);
                idx = simpleBeaconEndIdx;
                break;

                // ========== VIBRATION SENSOR (EX301) ==========
                // Type 0xBF: Vibration sensor data (variable length, 30 bytes fixed)
            case 0xBF:
                if (idx >= bytes.length) {
                    warnings.push("Missing vibration data length");
                    break;
                }
                const vibDataLen = bytes[idx++];
                if (idx + vibDataLen > bytes.length) {
                    warnings.push("Vibration data block exceeds payload, trimming");
                }
                const vibEndIdx = Math.min(idx + vibDataLen, bytes.length);
                const vibBytes = bytes.slice(idx, vibEndIdx);
                parseVibrationData(vibBytes, data);
                idx = vibEndIdx;
                break;

                // ========== TILT ALARM (AN-113, AN-122) ==========
                // Type 0xC2: Tilt alarm event (1 byte)
            case 0xC2:
                if (idx >= bytes.length) {
                    warnings.push("Truncated tilt alarm");
                    break;
                }
                data.tiltAlarm = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // ========== POSITION ACCURACY (AN-122, SC001) ==========
                // Type 0xC3: Position accuracy factor (1 byte, ÷10, 255=invalid)
            case 0xC3:
                if (idx >= bytes.length) {
                    warnings.push("Truncated position accuracy");
                    break;
                }
                const accuracy = bytes[idx++];
                data.positionAccuracy = accuracy === 255 ? null : Number((accuracy / 10).toFixed(1));
                break;

                // ========== ELECTRICAL FIRE MONITOR (EF5600-DN1) ==========
                // Type 0xC6: Electrical fire data (variable length, 103 bytes)
            case 0xC6:
                if (idx >= bytes.length) {
                    warnings.push("Missing electrical data length");
                    break;
                }
                const elecDataLen = bytes[idx++];
                if (idx + elecDataLen > bytes.length) {
                    warnings.push("Electrical data block exceeds payload, trimming");
                }
                const elecEndIdx = Math.min(idx + elecDataLen, bytes.length);
                const elecBytes = bytes.slice(idx, elecEndIdx);
                parseElectricalFireData(elecBytes, data);
                idx = elecEndIdx;
                break;

                // Type 0xC7: Electrical fire alarm attribute (2 bytes)
            case 0xC7:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated electrical alarm attribute");
                    break;
                }
                const alarmAttribute = readUint16BE(bytes, idx);
                const alarmAttrParsed = parseElectricalAlarm(alarmAttribute);
                Object.assign(data, alarmAttrParsed);
                data.electricalAlarm = alarmAttribute !== 0 ? 1 : 0;
                data.electricalAlarmAttribute = alarmAttribute;
                idx += 2;
                break;

                // Type 0xC8: Electrical fire alarm event (2 bytes)
            case 0xC8:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated electrical alarm event");
                    break;
                }
                const alarmEvent = readUint16BE(bytes, idx);
                const alarmEventParsed = parseElectricalAlarm(alarmEvent);
                data.electricalAlarmEvent = alarmEvent;
                data.alarmEventActive = alarmEvent !== 0 ? 1 : 0;
                Object.keys(alarmEventParsed).forEach(key => {
                    if (key !== 'anyAlarm') {
                        data[key + 'Event'] = alarmEventParsed[key];
                    }
                });
                idx += 2;
                break;

                // Type 0xC0: Vibration sensor alarm status (2 bytes, big-endian)
            case 0xC0:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated vibration alarm status");
                    break;
                }
                const vibAlarmStatus = readUint16BE(bytes, idx);
                const vibAlarmParsed = parseVibrationAlarm(vibAlarmStatus);
                Object.assign(data, vibAlarmParsed);
                data.vibrationAlarmStatus = vibAlarmStatus;
                idx += 2;
                break;

                // Type 0xC1: Vibration sensor alarm event (2 bytes, big-endian)
            case 0xC1:
                if (idx + 2 > bytes.length) {
                    warnings.push("Truncated vibration alarm event");
                    break;
                }
                const vibAlarmEvent = readUint16BE(bytes, idx);
                data.vibrationAlarmEvent = vibAlarmEvent;
                data.alarmEventActive = vibAlarmEvent !== 0 ? 1 : 0;
                idx += 2;
                break;

                // ========== SAFETY HELMET ALARMS (SC001) ==========
                // Type 0xCB: Fall detection alarm status (1 byte)
            case 0xCB:
                if (idx >= bytes.length) {
                    warnings.push("Truncated fall detection alarm");
                    break;
                }
                data.fallAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xCC: Fall detection alarm event (1 byte)
            case 0xCC:
                if (idx >= bytes.length) {
                    warnings.push("Truncated fall detection event");
                    break;
                }
                data.fallAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xCD: Helmet removal alarm status (1 byte)
            case 0xCD:
                if (idx >= bytes.length) {
                    warnings.push("Truncated helmet removal alarm");
                    break;
                }
                data.helmetRemovalAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xCE: Helmet removal alarm event (1 byte)
            case 0xCE:
                if (idx >= bytes.length) {
                    warnings.push("Truncated helmet removal event");
                    break;
                }
                data.helmetRemovalAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xCF: Proximity to electricity alarm status (1 byte)
            case 0xCF:
                if (idx >= bytes.length) {
                    warnings.push("Truncated proximity to electricity alarm");
                    break;
                }
                data.electricityProximityAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD0: Proximity to electricity alarm event (1 byte)
            case 0xD0:
                if (idx >= bytes.length) {
                    warnings.push("Truncated proximity to electricity event");
                    break;
                }
                data.electricityProximityAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD1: Impact alarm status (1 byte)
            case 0xD1:
                if (idx >= bytes.length) {
                    warnings.push("Truncated impact alarm");
                    break;
                }
                data.impactAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD2: Impact alarm event (1 byte)
            case 0xD2:
                if (idx >= bytes.length) {
                    warnings.push("Truncated impact event");
                    break;
                }
                data.impactAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD3: Silence alarm status (1 byte)
            case 0xD3:
                if (idx >= bytes.length) {
                    warnings.push("Truncated silence alarm");
                    break;
                }
                data.silenceAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD4: Silence alarm event (1 byte)
            case 0xD4:
                if (idx >= bytes.length) {
                    warnings.push("Truncated silence event");
                    break;
                }
                data.silenceAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD5: Height access alarm status (1 byte)
            case 0xD5:
                if (idx >= bytes.length) {
                    warnings.push("Truncated height access alarm");
                    break;
                }
                data.heightAccessAlarmStatus = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // Type 0xD6: Height access alarm event (1 byte)
            case 0xD6:
                if (idx >= bytes.length) {
                    warnings.push("Truncated height access event");
                    break;
                }
                data.heightAccessAlarmEvent = bytes[idx++] === 0x01 ? 1 : 0;
                break;

                // ========== ALTITUDE (SC001) ==========
                // Type 0xD8: Altitude (4 bytes unsigned, big-endian, ÷10, unit: m)
            case 0xD8:
                if (idx + 4 > bytes.length) {
                    warnings.push("Truncated altitude");
                    break;
                }
                const altitude = readUint32BE(bytes, idx);
                data.altitude = Number((altitude / 10).toFixed(1));
                idx += 4;
                break;

                // ========== BEACON DATA (CM100, SC001) ==========
                // Type 0xD9: Beacon data (variable length)
            case 0xD9:
                if (idx >= bytes.length) {
                    warnings.push("Missing beacon data length");
                    break;
                }
                const beaconDataLen = bytes[idx++];
                if (idx + beaconDataLen > bytes.length) {
                    warnings.push("Beacon data block exceeds payload, trimming");
                }
                const beaconEndIdx = Math.min(idx + beaconDataLen, bytes.length);
                const beaconBytes = bytes.slice(idx, beaconEndIdx);
                parseBeaconData(beaconBytes, data);
                idx = beaconEndIdx;
                break;

            default:
                // Unknown type - skip based on common type lengths
                warnings.push(`Unknown type 0x${type.toString(16)} at position ${idx-1}, skipping`);
                if (idx < bytes.length)
                    idx++;
                break;
            }
        } catch (error) {
            errors.push(`Parse error at type 0x${type.toString(16)}: ${error.message}`);
            break;
        }
    }

    postProcessData(data);

    return {
        data,
        errors,
        warnings
    };
}

/**
 * Post-process decoded data for specific device types
 * @param {object} data - Decoded data object
 */
function postProcessData(data) {
    // For DS-103: Convert switch states array to named properties
    if (data.model === "DS-103" && data.switchStates && data.switchStates.length >= 3) {
        data.switch1State = data.switchStates[0];
        data.switch2State = data.switchStates[1];
        data.switch3State = data.switchStates[2];
        // Set powerState based on any switch being on
        data.powerState = (data.switch1State === 1 || data.switch2State === 1 || data.switch3State === 1) ? 1 : 0;
    }

    // For EX205: Calculate liquid level percentage if distance and level are available
    if (data.model === "EX205" && data.distance !== undefined && data.liquidLevel !== undefined) {
        if (data.distance > 0) {
            data.liquidLevelPercent = Number(((data.liquidLevel / data.distance) * 100).toFixed(1));
        }
    }

    // For SC001: Set fall detection alarm if any safety alarm is active
    if (data.model === "SC001") {
        const safetyAlarms = [
            data.fallAlarmStatus,
            data.helmetRemovalAlarmStatus,
            data.electricityProximityAlarmStatus,
            data.impactAlarmStatus,
            data.silenceAlarmStatus,
            data.heightAccessAlarmStatus
        ];
        data.safetyAlarmActive = safetyAlarms.some(alarm => alarm === 1) ? 1 : 0;
    }
}

/* ============================================================================
 * DOWNLINK ENCODER - DEVICE-SPECIFIC FUNCTIONS
 * ============================================================================ */

/**
 * DS-501 Smart Socket downlink encoder
 * @param {object} data - Control data
 * @returns {number[]} Encoded bytes or empty array if no command
 */
function encodeDS501(data) {
    const header = [0x09, 0x48]; // DS-501 command header

    if (data.command) {
        const cmd = String(data.command).toLowerCase();
        switch (cmd) {
        case 'query':
            return header.concat([0x0E]);
        case 'power_off':
            return header.concat([0x00, 0x01]);
        case 'power_on':
            return header.concat([0x01, 0x01]);
        case 'unlock':
            return header.concat([0x02]);
        case 'lock':
            return header.concat([0x03]);
        default:
            return []; // Invalid command
        }
    }

    if (data.powerState !== undefined) {
        const state = Number(data.powerState);
        return header.concat([state ? 0x01 : 0x00, 0x01]);
    }

    if (data.lockState !== undefined) {
        const state = Number(data.lockState);
        return header.concat([state ? 0x03 : 0x02]);
    }

    return [];
}

/**
 * DS-103 3-Channel Switch Controller downlink encoder
 * DS-103 supports multiple control commands with format: 0x09 0x5C [command] [parameters]
 * Commands:
 *   0x00: Disconnect switch (parameter: 0x01=left, 0x02=middle, 0x03=right, 0xFF=all)
 *   0x01: Connect switch (parameter: 0x01=left, 0x02=middle, 0x03=right, 0xFF=all)
 *   0x02: Unlock switch state
 *   0x03: Lock switch state
 *   0x04: Delayed disconnect switch (parameter1: switch, parameter2-5: delay time in seconds, 32-bit)
 *   0x05: Delayed connect switch (parameter1: switch, parameter2-5: delay time in seconds, 32-bit)
 *   0x06: Scheduled disconnect switch (parameter1: switch, parameter2-5: Unix timestamp, parameter6: repeat)
 *   0x07: Scheduled connect switch (parameter1: switch, parameter2-5: Unix timestamp, parameter6: repeat)
 *   0x08: Delayed unlock (parameter1-4: delay time in seconds, 32-bit)
 *   0x09: Delayed lock (parameter1-4: delay time in seconds, 32-bit)
 *   0x0A: Scheduled unlock (parameter1-4: Unix timestamp, parameter5: repeat)
 *   0x0B: Scheduled lock (parameter1-4: Unix timestamp, parameter5: repeat)
 *   0x0C: Cancel delay/scheduled connect/disconnect (parameter: switch)
 *   0x0D: Cancel delay/scheduled lock
 *   0x0E: Query switch status
 * @param {object} data - Control data
 * @returns {number[]} Encoded bytes or empty array if no command
 */
function encodeDS103(data) {
    const header = [0x09, 0x5C]; // DS-103 command header

    if (data.command) {
        const cmd = String(data.command).toLowerCase();
        const switchParam = data.switch || 0x01; // Default to left switch

        switch (cmd) {
        case 'query':
            return header.concat([0x0E]);
        case 'switch_off':
        case 'disconnect':
            return header.concat([0x00, switchParam]);
        case 'switch_on':
        case 'connect':
            return header.concat([0x01, switchParam]);
        case 'unlock':
            return header.concat([0x02]);
        case 'lock':
            return header.concat([0x03]);
        case 'delayed_off':
            if (data.delaySeconds !== undefined) {
                const delay = Math.round(Number(data.delaySeconds));
                const delayBytes = [
                    (delay >> 24) & 0xFF,
                    (delay >> 16) & 0xFF,
                    (delay >> 8) & 0xFF,
                    delay & 0xFF
                ];
                return header.concat([0x04, switchParam, ...delayBytes]);
            }
            break;
        case 'delayed_on':
            if (data.delaySeconds !== undefined) {
                const delay = Math.round(Number(data.delaySeconds));
                const delayBytes = [
                    (delay >> 24) & 0xFF,
                    (delay >> 16) & 0xFF,
                    (delay >> 8) & 0xFF,
                    delay & 0xFF
                ];
                return header.concat([0x05, switchParam, ...delayBytes]);
            }
            break;
        case 'cancel_timer':
            return header.concat([0x0C, switchParam]);
        case 'cancel_lock_timer':
            return header.concat([0x0D]);
        default:
            return [];
        }
    }

    // Direct control via switch states
    if (data.switch1State !== undefined) {
        const state = Number(data.switch1State);
        return header.concat([state ? 0x01 : 0x00, 0x01]);
    }

    if (data.switch2State !== undefined) {
        const state = Number(data.switch2State);
        return header.concat([state ? 0x01 : 0x00, 0x02]);
    }

    if (data.switch3State !== undefined) {
        const state = Number(data.switch3State);
        return header.concat([state ? 0x01 : 0x00, 0x03]);
    }

    if (data.powerState !== undefined && data.switch !== undefined) {
        const state = Number(data.powerState);
        const switchNum = Number(data.switch) || 0x01;
        return header.concat([state ? 0x01 : 0x00, switchNum]);
    }

    if (data.lockState !== undefined) {
        const state = Number(data.lockState);
        return header.concat([state ? 0x03 : 0x02]);
    }

    return [];
}

/**
 * AN-307 Sound & Light Alarm downlink encoder
 * AN-307 control command format: [0x01, modelCode, controlByte, alarmTimeLow, alarmTimeHigh]
 * Commands:
 *   - Alarm with timer: 0x01 0x2A 0x01 [timeLow] [timeHigh] (time in seconds, little-endian)
 *   - Alarm without timer: 0x01 0x2A 0x01
 *   - Disarm: 0x01 0x2A 0x00
 * @param {object} data - Control data
 * @returns {number[]} Encoded bytes or empty array if no command
 */
function encodeAN307(data) {
    const header = [0x01, 0x2A]; // AN-307 command header

    if (data.command) {
        const cmd = String(data.command).toLowerCase();

        switch (cmd) {
        case 'alarm_on':
        case 'alarm':
            if (data.alarmTime !== undefined) {
                const time = Math.min(65535, Math.round(Number(data.alarmTime))); // Max 65535 seconds
                // Time is little-endian in the protocol
                return header.concat([0x01, time & 0xFF, (time >> 8) & 0xFF]);
            } else {
                return header.concat([0x01]); // Alarm without timer
            }
        case 'alarm_off':
        case 'disarm':
            return header.concat([0x00]);
        default:
            return [];
        }
    }

    if (data.alarmStatus !== undefined) {
        const status = Number(data.alarmStatus);
        if (status === 1 && data.alarmTime !== undefined) {
            const time = Math.min(65535, Math.round(Number(data.alarmTime)));
            return header.concat([0x01, time & 0xFF, (time >> 8) & 0xFF]);
        } else {
            return header.concat([status ? 0x01 : 0x00]);
        }
    }

    return [];
}

/**
 * W8004 Thermostat downlink encoder
 * @param {object} data - Control data
 * @returns {number[]} Encoded bytes or empty array if no command
 */
function encodeW8004(data) {
    const attributes = [];

    // Collect attributes to set
    if (data.setTemperature !== undefined) {
        const tempValue = Math.round(Number(data.setTemperature) * 100);
        attributes.push({
            register: 0x0004,
            value: tempValue
        });
    }

    if (data.workMode !== undefined) {
        const mode = Math.max(0, Math.min(3, Math.round(Number(data.workMode))));
        attributes.push({
            register: 0x0005,
            value: mode
        });
    }

    if (data.fanSpeed !== undefined) {
        const speed = Math.max(0, Math.min(4, Math.round(Number(data.fanSpeed))));
        attributes.push({
            register: 0x0006,
            value: speed
        });
    }

    if (data.powerState !== undefined) {
        const state = Number(data.powerState) ? 1 : 0;
        attributes.push({
            register: 0xF000,
            value: state
        });
    }

    if (data.keyLockState !== undefined) {
        const state = Number(data.keyLockState) ? 1 : 0;
        attributes.push({
            register: 0xF001,
            value: state
        });
    }

    if (attributes.length === 0) {
        return [];
    }

    if (attributes.length === 1) {
        // Single register write - use 06 instruction
        const attr = attributes[0];
        return [0x06, 0x06,
            (attr.register >> 8) & 0xFF, attr.register & 0xFF,
            (attr.value >> 8) & 0xFF, attr.value & 0xFF];
    }

    // Multiple registers - check if consecutive
    attributes.sort((a, b) => a.register - b.register);
    let isConsecutive = true;
    for (let i = 1; i < attributes.length; i++) {
        if (attributes[i].register !== attributes[i - 1].register + 1) {
            isConsecutive = false;
            break;
        }
    }

    if (isConsecutive) {
        // Use Modbus function code 0x10 (write multiple registers)
        const slaveAddr = data.rs485Addr || 0x01;
        const startReg = attributes[0].register;
        const regCount = attributes.length;
        const byteCount = regCount * 2;

        // Build Modbus frame
        const frame = [
            slaveAddr,
            0x10, // Function code
            (startReg >> 8) & 0xFF, startReg & 0xFF,
            (regCount >> 8) & 0xFF, regCount & 0xFF,
            byteCount
        ];

        // Add register values
        for (const attr of attributes) {
            frame.push((attr.value >> 8) & 0xFF, attr.value & 0xFF);
        }

        // Calculate CRC
        const crc = modbusCRC16(frame);
        frame.push(crc[0], crc[1]);

        // Add 07 instruction header
        return [0x07].concat(frame);
    } else {
        // Non-consecutive - use first attribute
        const attr = attributes[0];
        return [0x06, 0x06,
            (attr.register >> 8) & 0xFF, attr.register & 0xFF,
            (attr.value >> 8) & 0xFF, attr.value & 0xFF];
    }
}

/**
 * EF5600-DN1 Electrical Fire Monitor downlink encoder
 * @param {object} data - Control data
 * @returns {number[]} Encoded bytes or empty array if no command
 */
function encodeEF5600DN1(data) {
    // EF5600-DN1 supports remote circuit breaker control
    if (data.command) {
        const cmd = String(data.command).toLowerCase();

        // Remote circuit breaker control
        if (cmd === 'circuit_breaker_on') {
            return [0x01, 0x01]; // Simple control command
        } else if (cmd === 'circuit_breaker_off') {
            return [0x01, 0x00];
        } else if (cmd === 'reset_alarms') {
            return [0x02, 0x01]; // Reset alarms command
        }
    }

    // Control via powerState (unified field)
    if (data.powerState !== undefined) {
        const state = Number(data.powerState) ? 1 : 0;
        return [0x01, state]; // Simple power control
    }

    return [];
}

/**
 * Generic sensor devices (no downlink control)
 * These devices are sensors only and don't support downlink control commands
 * Configuration is done via AT commands
 * @param {object} data - Control data
 * @returns {number[]} Empty array
 */
function encodeGenericSensor(data) {
    // Generic sensors don't have specific control commands
    return [];
}

// Aliases for generic sensor devices
const encodeAN301 = encodeGenericSensor;
const encodeAN204 = encodeGenericSensor;
const encodeAN303 = encodeGenericSensor;
const encodeAN304 = encodeGenericSensor;
const encodeAN305 = encodeGenericSensor;
const encodeCU606 = encodeGenericSensor;
const encodeJTYAN503A = encodeGenericSensor;
const encodeAN113 = encodeGenericSensor;
const encodeAN122 = encodeGenericSensor;
const encodeAN306 = encodeGenericSensor;
const encodeAN308 = encodeGenericSensor;
const encodeEX205 = encodeGenericSensor;
const encodeEX301 = encodeGenericSensor;
const encodeCM100 = encodeGenericSensor;
const encodeSC001 = encodeGenericSensor;

/* ============================================================================
 * DOWNLINK ENCODER - MAIN FUNCTION
 * ============================================================================ */

/**
 * Encode downlink message to device
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
    let fPort = 2; // Default to control port

    // ========== MODE 1: AT COMMANDS (Fport 220) ==========
    // All devices support AT commands for configuration
    // Format: 0xFF + ASCII(AT command) + CRLF
    // Multiple commands separated by CRLF, always put AT+REBOOT last
    if (data.at !== undefined && data.at !== null) {
        const atCommands = Array.isArray(data.at) ? data.at : [data.at];
        const cmdStrings = [];

        for (let cmd of atCommands) {
            const cmdStr = String(cmd).replace(/\r?\n/g, '');
            if (cmdStr.length > 0) {
                cmdStrings.push(cmdStr);
            }
        }

        if (cmdStrings.length === 0) {
            errors.push("Empty AT command provided");
            return {
                bytes: [],
                fPort: 220,
                errors,
                warnings
            };
        }

        // Build payload: 0xFF + commands + CRLF
        bytes = [0xFF];
        const joinedCmds = cmdStrings.join("\r\n") + "\r\n";
        for (let i = 0; i < joinedCmds.length; i++) {
            bytes.push(joinedCmds.charCodeAt(i) & 0xFF);
        }

        return {
            bytes,
            fPort: 220,
            errors,
            warnings
        };
    }

    // ========== MODE 2: SERIAL PASSTHROUGH (Fport 220) ==========
    // Used for direct serial communication (e.g., Modbus RTU)
    // Format: 0xFE + passthrough bytes
    // Example: {serialPassthrough: [0x01, 0x10, 0x00, 0x04, ...]}
    if (data.serialPassthrough !== undefined) {
        let passthroughBytes = [];

        if (Array.isArray(data.serialPassthrough)) {
            passthroughBytes = data.serialPassthrough.map(b => b & 0xFF);
        } else if (typeof data.serialPassthrough === 'string') {
            passthroughBytes = hexToBytes(data.serialPassthrough);
        } else {
            errors.push("serialPassthrough must be byte array or hex string");
            return {
                bytes: [],
                fPort: 220,
                errors,
                warnings
            };
        }

        if (passthroughBytes.length === 0) {
            errors.push("Empty serialPassthrough command");
            return {
                bytes: [],
                fPort: 220,
                errors,
                warnings
            };
        }

        bytes = [0xFE].concat(passthroughBytes);
        return {
            bytes,
            fPort: 220,
            errors,
            warnings
        };
    }

    // ========== MODE 3: MODBUS RAW FRAME (Fport 2) ==========
    // Used for Modbus-based devices like W8004
    // Format: 0x07 + full Modbus frame or 0x06 + single register write
    if (data.modbusRaw !== undefined || data.modbusHex !== undefined) {
        let modbusFrame = [];

        if (data.modbusRaw !== undefined) {
            if (Array.isArray(data.modbusRaw)) {
                modbusFrame = data.modbusRaw.map(b => b & 0xFF);
            } else {
                errors.push("modbusRaw must be byte array");
                return {
                    bytes: [],
                    fPort: 2,
                    errors,
                    warnings
                };
            }
        } else if (data.modbusHex !== undefined) {
            if (typeof data.modbusHex === 'string') {
                modbusFrame = hexToBytes(data.modbusHex);
            } else {
                errors.push("modbusHex must be hex string");
                return {
                    bytes: [],
                    fPort: 2,
                    errors,
                    warnings
                };
            }
        }

        if (modbusFrame.length === 0) {
            errors.push("Empty Modbus frame");
            return {
                bytes: [],
                fPort: 2,
                errors,
                warnings
            };
        }

        // Check if already has instruction header
        if (modbusFrame[0] === 0x06 || modbusFrame[0] === 0x07) {
            bytes = modbusFrame;
        } else {
            bytes = [0x07].concat(modbusFrame);
        }

        return {
            bytes,
            fPort: 2,
            errors,
            warnings
        };
    }

    // ========== MODE 4: RAW BYTES (Fport 2) ==========
    if (Array.isArray(data.rawBytes) && data.rawBytes.length > 0) {
        bytes = data.rawBytes.map(b => b & 0xFF);
        return {
            bytes,
            fPort: 2,
            errors,
            warnings
        };
    }

    // ========== MODE 5: DEVICE-SPECIFIC CONTROL ==========
    // Call appropriate device encoder based on model
    const model = data.model || "";

    switch (model) {
    case "DS-501":
        bytes = encodeDS501(data);
        break;
    case "DS-103":
        bytes = encodeDS103(data);
        break;
    case "AN-307":
        bytes = encodeAN307(data);
        break;
    case "W8004":
        bytes = encodeW8004(data);
        break;
    case "AN-301":
        bytes = encodeAN301(data);
        break;
    case "AN-204":
        bytes = encodeAN204(data);
        break;
    case "AN-303":
        bytes = encodeAN303(data);
        break;
    case "AN-304":
        bytes = encodeAN304(data);
        break;
    case "AN-305":
        bytes = encodeAN305(data);
        break;
    case "CU606":
        bytes = encodeCU606(data);
        break;
    case "EF5600-DN1":
        bytes = encodeEF5600DN1(data);
        break;
    case "JTY-AN-503A":
        bytes = encodeJTYAN503A(data);
        break;
    case "AN-113":
        bytes = encodeAN113(data);
        break;
    case "AN-122":
        bytes = encodeAN122(data);
        break;
    case "AN-306":
        bytes = encodeAN306(data);
        break;
    case "AN-308":
        bytes = encodeAN308(data);
        break;
    case "EX205":
        bytes = encodeEX205(data);
        break;
    case "EX301":
        bytes = encodeEX301(data);
        break;
    case "CM100":
        bytes = encodeCM100(data);
        break;
    case "SC001":
        bytes = encodeSC001(data);
        break;
    default:
        // Generic control for unknown devices
        if (data.powerState !== undefined) {
            const state = Number(data.powerState) ? 1 : 0;
            bytes = [0x01, state];
        } else if (data.lockState !== undefined) {
            const state = Number(data.lockState) ? 1 : 0;
            bytes = [0x02, state];
        }
        break;
    }

    if (bytes.length > 0) {
        return {
            bytes,
            fPort: 2,
            errors,
            warnings
        };
    }

    // No valid command found
    warnings.push("No valid downlink command specified");

    return {
        bytes: [],
        fPort: 2,
        errors,
        warnings
    };
}
