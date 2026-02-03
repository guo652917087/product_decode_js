/**
 * ChirpStack JS decoder/encoder for temperature & humidity sensor (custom LPP-like TLV)
 *
 * - Uplink fPort: 210
 * - Payload: first byte reserved (protocol version), then sequence: type (1 byte) + value (N bytes)
 * - Supports parsing:
 *   - 0x01: model (1 byte) -> mapped to model string
 *   - 0x04: battery voltage (2 bytes BE, uint16) -> mV (value), V = value / 1000
 *   - 0x7D: battery voltage state (1 byte) 0=normal,1=low
 *   - 0x77: tamper state (1 byte) 0=no,1=yes
 *   - 0x10: temperature (2 bytes BE, int16) value = °C * 100
 *   - 0x12: humidity (2 bytes BE, uint16) value = %RH * 10
 *   - 0x05: battery voltage event (1 byte)
 *   - 0x03: tamper event (1 byte)
 *   - 0x11: temperature event (1 byte)
 *   - 0x13: humidity event (1 byte)
 *   - 0x06/0x07/0x08/0x09/0x0c/0x0d/0x0e/0x0f: null-terminated strings (versions, reset cause, radio chip, AT response, etc.)
 *
 * - Downlink fPort: 220
 *   - Format: first byte 0xFF, followed by ASCII AT command(s).
 *   - If multiple AT commands are provided, separate each with CRLF (`\r\n`). Each command should be terminated with CRLF.
 *
 * Returns data/errors/warnings following ChirpStack JS decoder contract.
 */

/* Helper: mapping model code -> string (from provided C mapping) */
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

/* Helpers for byte conversions */
function readUint8(bytes, idx) {
  return bytes[idx];
}
function readInt16BE(bytes, idx) {
  const hi = bytes[idx];
  const lo = bytes[idx + 1];
  const val = (hi << 8) | lo;
  // convert to signed 16
  return val & 0x8000 ? val - 0x10000 : val;
}
function readUint16BE(bytes, idx) {
  return (bytes[idx] << 8) | bytes[idx + 1];
}
function readUint32BE(bytes, idx) {
  return (
    (bytes[idx] << 24) |
    (bytes[idx + 1] << 16) |
    (bytes[idx + 2] << 8) |
    bytes[idx + 3]
  ) >>> 0;
}
function readStringNullTerm(bytes, idx) {
  // read until 0x00 or end
  let strBytes = [];
  let i = idx;
  while (i < bytes.length && bytes[i] !== 0x00) {
    strBytes.push(bytes[i]);
    i++;
  }
  // convert to ASCII string
  const s = String.fromCharCode(...strBytes);
  const nextIndex = i + 1; // skip terminating 0x00; mimic C code +2 from type (type + strlen + 2)
  return { str: s, nextIndex };
}

/**
 * Decode uplink
 */
function decodeUplink(input) {
  const bytes = input.bytes || [];
  const fPort = input.fPort;
  const errors = [];
  const warnings = [];
  const data = {};

  if (fPort !== 210) {
    return { data: {}, errors: [], warnings: ["fPort is not 210, decoder skipped"] };
  }

  if (!bytes || bytes.length < 2) {
    errors.push("payload too short");
    return { data: {}, errors, warnings };
  }

  // first byte reserved / protocol version
  let idx = 1;

  while (idx < bytes.length) {
    const t = bytes[idx];

    switch (t) {
      case 0x01: { // model (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated model field"); return { data, errors, warnings }; }
        const code = bytes[idx + 1];
        data.model = MODEL_MAP.hasOwnProperty(code) ? MODEL_MAP[code] : `unknown(0x${code.toString(16)})`;
        idx += 2;
        break;
      }

      case 0x02: { // downlink count (4 bytes)
        if (idx + 4 >= bytes.length) { errors.push("truncated downlink count"); return { data, errors, warnings }; }
        data.downlinkCount = readUint32BE(bytes, idx + 1);
        idx += 5;
        break;
      }

      case 0x03: { // tamper event (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated tamper event"); return { data, errors, warnings }; }
        data.tamperEvent = bytes[idx + 1];
        idx += 2;
        break;
      }

      case 0x04: { // battery voltage (2 bytes BE) -> mV
        if (idx + 2 >= bytes.length) { errors.push("truncated battery voltage"); return { data, errors, warnings }; }
        const v = readUint16BE(bytes, idx + 1);
        data.batteryVoltage = Number((v / 1000).toFixed(3)); // volts
        idx += 3;
        break;
      }

      case 0x05: { // battery state/event (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated battery state"); return { data, errors, warnings }; }
        data.batteryState = bytes[idx + 1]; // 0 normal, 1 low
        idx += 2;
        break;
      }

      case 0x06: { // boot version (null-terminated string)
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.bootVersion = str;
        idx = nextIndex;
        break;
      }

      case 0x07: { // main version
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.mainVersion = str;
        idx = nextIndex;
        break;
      }

      case 0x08: { // app version
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.appVersion = str;
        idx = nextIndex;
        break;
      }

      case 0x09: { // hardware version
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.hardwareVersion = str;
        idx = nextIndex;
        break;
      }

      case 0x0c: { // radio chip (string)
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.radioChip = str;
        idx = nextIndex;
        break;
      }

      case 0x0d: { // reset cause (string)
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.resetCause = str;
        idx = nextIndex;
        break;
      }

      case 0x0e: { // lorawan region (string)
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.lorawanRegion = str;
        idx = nextIndex;
        break;
      }

      case 0x0f: { // AT response (string)
        const { str, nextIndex } = readStringNullTerm(bytes, idx + 1);
        data.atResponse = str;
        idx = nextIndex;
        break;
      }

      case 0x10: { // temperature int16 BE, val = °C * 100
        if (idx + 2 >= bytes.length) { errors.push("truncated temperature"); return { data, errors, warnings }; }
        const val = readInt16BE(bytes, idx + 1);
        data.temperature = Number((val / 100).toFixed(2));
        idx += 3;
        break;
      }

      case 0x11: { // temperature event (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated temperature event"); return { data, errors, warnings }; }
        data.temperatureEvent = bytes[idx + 1];
        idx += 2;
        break;
      }

      case 0x12: { // humidity uint16 BE, value = %RH * 10
        if (idx + 2 >= bytes.length) { errors.push("truncated humidity"); return { data, errors, warnings }; }
        const humRaw = readUint16BE(bytes, idx + 1);
        data.humidity = Number((humRaw / 10).toFixed(1));
        idx += 3;
        break;
      }

      case 0x13: { // humidity event (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated humidity event"); return { data, errors, warnings }; }
        data.humidityEvent = bytes[idx + 1];
        idx += 2;
        break;
      }

      case 0x77: { // tamper state (1 byte)
        if (idx + 1 >= bytes.length) { errors.push("truncated tamper state"); return { data, errors, warnings }; }
        data.tamper = bytes[idx + 1];
        idx += 2;
        break;
      }

      case 0x7d: { // battery voltage state (1 byte) (same as 0x05 semantics)
        if (idx + 1 >= bytes.length) { errors.push("truncated battery voltage state"); return { data, errors, warnings }; }
        data.batteryVoltageState = bytes[idx + 1];
        idx += 2;
        break;
      }

      // add parsing for commonly used extra types (length-known)
      case 0x0a: // p2p update frequency (4 bytes)
      case 0x0b: // p2p config frequency (4 bytes)
      case 0x78: // heartbeat interval (4 bytes)
      case 0x79: { // localtime (4 bytes)
        if (idx + 4 >= bytes.length) { errors.push(`truncated 4-byte field 0x${t.toString(16)}`); return { data, errors, warnings }; }
        const val = readUint32BE(bytes, idx + 1);
        if (t === 0x0a) data.p2pUpdateFrequency = val;
        if (t === 0x0b) data.p2pConfigFrequency = val;
        if (t === 0x78) data.heartbeatInterval = val;
        if (t === 0x79) data.localtimeSec = val;
        idx += 5;
        break;
      }

      default:
        // Unknown / unsupported type: stop parsing to avoid misalignment (mirrors C behavior `default: return;`)
        warnings.push(`unknown or unhandled type 0x${t.toString(16)}, stopping parse`);
        idx = bytes.length; // break loop
        break;
    }
  }

  return { data, errors, warnings };
}
/**
 * Encode downlink
 *
 * Input options:
 * - input.data.command: string or array of strings (raw AT commands)
 * - OR input.data as JSON object, e.g. { interval: 1800, reboot: 1 }
 *
 * Rules:
 * - interval => AT+HBTPKTTIMS=<interval> (must be int between 10 and 86400)
 * - reboot => AT+REBOOT
 * - When multiple commands, reboot is placed last.
 * - payload = 0xFF + ASCII(commands joined with CRLF) + CRLF
 * - fPort = 220
 */
function encodeDownlink(input) {
  const errors = [];
  const warnings = [];
  const dataIn = input.data || {};

  // Helper to normalize raw AT commands (strip internal newlines)
  function normalizeCmd(cmd) {
    return String(cmd).replace(/\r?\n/g, '');
  }

  let cmds = [];

  // 1) If user provided raw command(s)
  if (dataIn.command !== undefined && dataIn.command !== null) {
    let c = dataIn.command;
    if (typeof c === 'string') {
      cmds = [normalizeCmd(c)];
    } else if (Array.isArray(c)) {
      cmds = c.map(normalizeCmd);
    } else {
      errors.push("input.data.command must be string or array of strings");
      return { bytes: [], fPort: 220, errors, warnings };
    }
  }

  // 2) If user provided JSON-like control object (no explicit 'command'), accept fields
  // Accept both direct properties on input.data and nested input.data.object (for ubus envelope).
  const control = (typeof dataIn === 'object' && !Array.isArray(dataIn)) ? dataIn : {};
  const envelope = control.object && typeof control.object === 'object' ? control.object : null;
  const ctl = envelope || control;

  // Determine interval/reboot from ctl if present (number or numeric string)
  const hasInterval = ctl && (ctl.interval !== undefined && ctl.interval !== null);
  const hasReboot = ctl && (ctl.reboot !== undefined && ctl.reboot !== null);

  if (hasInterval || hasReboot) {
    // Build commands from ctl. Ensure reboot ends up last if present.
    const paramCmds = [];

    if (hasInterval) {
      const rawInterval = ctl.interval;
      const interval = Number(rawInterval);
      if (!Number.isFinite(interval) || !Number.isInteger(interval)) {
        errors.push(`invalid interval value: ${rawInterval}`);
      } else if (interval < 10 || interval > 86400) {
        errors.push(`interval ${interval} out of allowed range [10..86400]`);
      } else {
        paramCmds.push(`AT+HBTPKTTIMS=${interval}`);
      }
    }

    // Note: other parameter-setting commands could be added here following same pattern.

    // add paramCmds before reboot
    for (const pc of paramCmds) {
      cmds.push(pc);
    }

    if (hasReboot) {
      // interpret reboot truthy values
      const val = ctl.reboot;
      const rebootRequested = (typeof val === 'number' && val !== 0) || (typeof val === 'string' && val !== '0') || (val === true);
      if (rebootRequested) {
        // ensure reboot is at the end even if cmds already had entries
        // remove existing occurrences of AT+REBOOT to avoid duplicates
        cmds = cmds.filter(c => c.toUpperCase() !== 'AT+REBOOT');
        cmds.push('AT+REBOOT');
      }
    }
  }

  // If still no commands, error out
  if (cmds.length === 0) {
    errors.push("no commands to encode; provide input.data.command or JSON control with interval/reboot");
    return { bytes: [], fPort: 220, errors, warnings };
  }

  // Build payload: 0xFF then ASCII of commands joined with CRLF and final CRLF
  const payload = [0xFF];
  const joined = cmds.join("\r\n") + "\r\n";
  for (let i = 0; i < joined.length; i++) {
    payload.push(joined.charCodeAt(i));
  }

  return { bytes: payload, fPort: 220, errors, warnings };
}


//uplink fport 220
//fcnt=0:000d534654525354460008312e312e32340009312e32284c29000200000000
//sensor:000103040e157d007701100a0812023f0301
//sensor:000103040e187d007700100a1c120230

//downlink fport 220
//reboot:FF41542B5245424F4F540D0A

