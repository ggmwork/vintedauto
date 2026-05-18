import { inflateRawSync } from "node:zlib";

export interface ZipArchiveEntry {
  path: string;
  data: Buffer;
}

const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  crcTable[index] = value >>> 0;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function normalizeZipPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (
    normalized.length === 0 ||
    normalized.includes("\0") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    parts.some((part) => part === "." || part === "..") ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new Error(`Invalid archive path: ${value}`);
  }

  return parts.join("/");
}

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

export function createStoreOnlyZip(entries: ZipArchiveEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(normalizeZipPath(entry.path), "utf8");
    const data = Buffer.from(entry.data);
    const crc = crc32(data);
    const flags = 0x0800;

    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(flags),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(crc),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
    ]);

    const centralHeader = Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(flags),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(crc),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name,
    ]);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Archive is not a readable ZIP file.");
}

export function readZipEntries(buffer: Buffer) {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  const entries = new Map<string, Buffer>();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, cursor) !== 0x02014b50) {
      throw new Error("Archive central directory is invalid.");
    }

    const method = readUInt16(buffer, cursor + 10);
    const compressedSize = readUInt32(buffer, cursor + 20);
    const uncompressedSize = readUInt32(buffer, cursor + 24);
    const nameLength = readUInt16(buffer, cursor + 28);
    const extraLength = readUInt16(buffer, cursor + 30);
    const commentLength = readUInt16(buffer, cursor + 32);
    const localHeaderOffset = readUInt32(buffer, cursor + 42);
    const name = normalizeZipPath(
      buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength)
    );

    if (readUInt32(buffer, localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Archive local header is invalid for ${name}.`);
    }

    const localNameLength = readUInt16(buffer, localHeaderOffset + 26);
    const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = buffer.subarray(
      dataOffset,
      dataOffset + compressedSize
    );
    const data =
      method === 0
        ? Buffer.from(compressedData)
        : method === 8
          ? inflateRawSync(compressedData)
          : null;

    if (!data) {
      throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`);
    }

    if (data.length !== uncompressedSize) {
      throw new Error(`ZIP entry size mismatch for ${name}.`);
    }

    entries.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
