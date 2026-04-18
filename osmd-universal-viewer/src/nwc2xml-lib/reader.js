// Binary reader with little-endian support
export class BinaryReader {
  constructor(buffer) {
    // Ensure we have a plain Uint8Array with its own ArrayBuffer
    if (buffer instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(buffer);
    } else if (ArrayBuffer.isView(buffer)) {
      // Copy to new Uint8Array to avoid offset issues with Node Buffer
      this.buffer = new Uint8Array(buffer.length);
      this.buffer.set(buffer);
    } else {
      this.buffer = new Uint8Array(buffer);
    }
    this.view = new DataView(this.buffer.buffer);
    this.pos = 0;
  }

  get length() { return this.buffer.length; }
  get remaining() { return this.length - this.pos; }
  eof() { return this.pos >= this.length; }
  tell() { return this.pos; }
  seek(pos) { this.pos = pos; }
  skip(n) { this.pos += n; }

  readUint8() { return this.buffer[this.pos++]; }
  readInt8() { return this.view.getInt8(this.pos++); }
  readUint16() { const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  readInt16() { const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
  readUint32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  readBytes(n) { const b = this.buffer.slice(this.pos, this.pos + n); this.pos += n; return b; }

  readUntil(byte) {
    while (this.pos < this.length && this.buffer[this.pos] !== byte) this.pos++;
  }

  readStringNul() {
    const start = this.pos;
    while (this.pos < this.length && this.buffer[this.pos] !== 0) this.pos++;
    const bytes = this.buffer.slice(start, this.pos);
    this.pos++; // skip NUL
    return decodeString(bytes);
  }

  readStringSpace() {
    const start = this.pos;
    while (this.pos < this.length && this.buffer[this.pos] !== 0 && this.buffer[this.pos] > 32) this.pos++;
    const bytes = this.buffer.slice(start, this.pos);
    this.pos++; // skip terminator (space or NUL)
    return decodeString(bytes);
  }
}

function decodeString(bytes) {
  // NWC on Windows: 한글은 CP949/EUC-KR. 고바이트 있으면 EUC-KR 우선 시도.
  const hasHigh = bytes.length > 0 && bytes.some(b => b > 127);
  if (hasHigh) {
    try {
      const s = new TextDecoder('euc-kr').decode(bytes);
      if (s && s.indexOf('\uFFFD') < 0) return s;
    } catch {}
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {}
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('euc-kr').decode(bytes);
    } catch {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  }
}
