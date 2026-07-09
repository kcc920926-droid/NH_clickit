(function attachZip(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITZip = api;
})(globalThis, function createZipApi() {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const CRC_TABLE = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[index] = value >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function validatePath(name) {
    if (!name || name.includes('\\') || name.startsWith('/') || /^[a-z]:/i.test(name)) {
      throw new Error(`Unsafe ZIP path: ${name}`);
    }
    const parts = name.split('/');
    if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe ZIP path: ${name}`);
  }

  async function toBytes(data) {
    if (typeof data === 'string') return encoder.encode(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof Blob !== 'undefined' && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    throw new TypeError('Unsupported ZIP entry data');
  }

  function header(size) {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  }

  function concatenate(chunks) {
    const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  async function writeZip(entries) {
    const locals = [];
    const centrals = [];
    let localOffset = 0;
    for (const entry of entries) {
      validatePath(entry.name);
      const name = encoder.encode(entry.name);
      const data = await toBytes(entry.data);
      const crc = crc32(data);
      const local = header(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint16(8, 0, true);
      local.view.setUint32(14, crc, true);
      local.view.setUint32(18, data.length, true);
      local.view.setUint32(22, data.length, true);
      local.view.setUint16(26, name.length, true);
      local.view.setUint16(28, 0, true);
      locals.push(local.bytes, name, data);

      const central = header(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint16(10, 0, true);
      central.view.setUint32(16, crc, true);
      central.view.setUint32(20, data.length, true);
      central.view.setUint32(24, data.length, true);
      central.view.setUint16(28, name.length, true);
      central.view.setUint32(42, localOffset, true);
      centrals.push(central.bytes, name);
      localOffset += local.bytes.length + name.length + data.length;
    }

    const centralBytes = concatenate(centrals);
    const end = header(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(8, entries.length, true);
    end.view.setUint16(10, entries.length, true);
    end.view.setUint32(12, centralBytes.length, true);
    end.view.setUint32(16, localOffset, true);
    const archive = concatenate([...locals, centralBytes, end.bytes]);
    return new Blob([archive], { type: 'application/zip' });
  }

  async function readZip(input, limits = {}) {
    const bytes = await toBytes(input);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const maxFiles = limits.maxFiles || 500;
    const maxFileBytes = limits.maxFileBytes || 100 * 1024 * 1024;
    const maxUncompressedBytes = limits.maxUncompressedBytes || 500 * 1024 * 1024;
    const entries = new Map();
    let offset = 0;
    let totalSize = 0;
    while (offset + 4 <= bytes.length) {
      const signature = view.getUint32(offset, true);
      if (signature === 0x02014b50 || signature === 0x06054b50) break;
      if (signature !== 0x04034b50) throw new Error('Invalid ZIP local header');
      const method = view.getUint16(offset + 8, true);
      const expectedCrc = view.getUint32(offset + 14, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      if (method !== 0 || compressedSize !== uncompressedSize) throw new Error('Unsupported ZIP compression method');
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > bytes.length) throw new Error('Truncated ZIP entry');
      const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
      validatePath(name);
      if (entries.has(name)) throw new Error(`Duplicate ZIP path: ${name}`);
      if (uncompressedSize > maxFileBytes) throw new Error(`ZIP file size limit exceeded: ${name}`);
      const data = bytes.slice(dataStart, dataEnd);
      if (crc32(data) !== expectedCrc) throw new Error(`CRC mismatch: ${name}`);
      entries.set(name, data);
      totalSize += uncompressedSize;
      if (entries.size > maxFiles || totalSize > maxUncompressedBytes) throw new Error('ZIP safety limit exceeded');
      offset = dataEnd;
    }
    return entries;
  }

  return {
    readZip,
    writeZip,
  };
});
