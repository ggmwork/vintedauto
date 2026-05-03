export const VINTED_EXTENSION_PROTOCOL_VERSION = "2026-05-03" as const;

export const VINTED_EXTENSION_MESSAGE_TYPES = {
  ping: "vinted-auto:ping",
  launchHandoff: "vinted-auto:launch-handoff",
} as const;

export interface VintedExtensionPingRequest {
  type: typeof VINTED_EXTENSION_MESSAGE_TYPES.ping;
}

export interface VintedExtensionLaunchRequest {
  type: typeof VINTED_EXTENSION_MESSAGE_TYPES.launchHandoff;
  draftId: string;
  appOrigin: string;
}

export interface VintedExtensionErrorResponse {
  ok: false;
  message: string;
}

export interface VintedExtensionPingResponse {
  ok: true;
  protocolVersion: string;
  extensionId: string;
  capabilities: {
    externalLaunch: true;
    cleanLaunch: true;
    fallbackRoute: true;
  };
}

export interface VintedExtensionLaunchResponse {
  ok: true;
  protocolVersion: string;
  launch: {
    tabId: number;
    url: string;
    flow: "external_message";
  };
}

export function getConfiguredVintedExtensionId() {
  return process.env.NEXT_PUBLIC_VINTED_EXTENSION_ID?.trim() ?? "";
}

export function isVintedExtensionLaunchResponse(
  value: unknown
): value is VintedExtensionLaunchResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<VintedExtensionLaunchResponse>;

  return Boolean(
    candidate.ok === true &&
      candidate.protocolVersion &&
      candidate.launch &&
      typeof candidate.launch.tabId === "number" &&
      typeof candidate.launch.url === "string" &&
      candidate.launch.flow === "external_message"
  );
}
