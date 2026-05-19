export const VINTED_AUTO_EXTENSION_ORIGIN =
  "chrome-extension://jjlanfbmjhiodmoamflpjclhfcjhcemb";

const CORS_HEADER_ENTRIES = [
  ["access-control-allow-origin", VINTED_AUTO_EXTENSION_ORIGIN],
  ["access-control-allow-methods", "GET,POST,OPTIONS"],
  ["access-control-allow-headers", "content-type"],
  ["access-control-max-age", "86400"],
  ["vary", "origin"],
] as const;

export function buildVintedExtensionCorsHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  for (const [key, value] of CORS_HEADER_ENTRIES) {
    nextHeaders.set(key, value);
  }

  return nextHeaders;
}

export function applyVintedExtensionCors<T extends Response>(response: T) {
  for (const [key, value] of CORS_HEADER_ENTRIES) {
    response.headers.set(key, value);
  }

  return response;
}

export function createVintedExtensionCorsOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: buildVintedExtensionCorsHeaders(),
  });
}
