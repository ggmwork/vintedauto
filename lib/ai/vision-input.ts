function guessMediaTypeFromFilename(filename: string) {
  const normalized = filename.toLowerCase();

  if (normalized.endsWith(".png")) {
    return "image/png";
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/jpeg";
}

export function normalizeVisionMediaType(
  fileName: string,
  contentType: string | null
) {
  if (contentType?.startsWith("image/")) {
    return contentType;
  }

  return guessMediaTypeFromFilename(fileName);
}

export function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

export function toDataUrl(fileName: string, contentType: string | null, bytes: Uint8Array) {
  return `data:${normalizeVisionMediaType(fileName, contentType)};base64,${toBase64(bytes)}`;
}
