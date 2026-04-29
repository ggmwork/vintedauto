import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AiProvider,
  AiProviderTestResult,
  AiRouterMode,
} from "@/types/ai";

export interface StoredAiSettings {
  routerMode: AiRouterMode | null;
  listingProvider: AiProvider | null;
  listingModel: string | null;
  groupingProvider: AiProvider | null;
  groupingModel: string | null;
  listingMaxImages: number | null;
  ollamaBaseUrl: string | null;
  openAiBaseUrl: string | null;
  openAiApiKey: string | null;
  anthropicBaseUrl: string | null;
  anthropicApiKey: string | null;
  openAiTimeoutMs: number | null;
  anthropicTimeoutMs: number | null;
  ollamaTimeoutMs: number | null;
  lastTests: Partial<Record<AiProvider, AiProviderTestResult>>;
  updatedAt: string | null;
}

const dataDirectory = path.join(process.cwd(), ".data");
const aiSettingsFilePath = path.join(dataDirectory, "ai-settings.json");

function normalizeProvider(value: unknown): AiProvider | null {
  return value === "ollama" || value === "openai" || value === "anthropic"
    ? value
    : null;
}

function normalizeRouterMode(value: unknown): AiRouterMode | null {
  return value === "fallback" || value === "manual" ? value : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function createDefaultStoredAiSettings(): StoredAiSettings {
  return {
    routerMode: null,
    listingProvider: null,
    listingModel: null,
    groupingProvider: null,
    groupingModel: null,
    listingMaxImages: null,
    ollamaBaseUrl: null,
    openAiBaseUrl: null,
    openAiApiKey: null,
    anthropicBaseUrl: null,
    anthropicApiKey: null,
    openAiTimeoutMs: null,
    anthropicTimeoutMs: null,
    ollamaTimeoutMs: null,
    lastTests: {},
    updatedAt: null,
  };
}

function normalizeStoredAiSettings(value: unknown): StoredAiSettings {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<StoredAiSettings>)
      : {};
  const defaults = createDefaultStoredAiSettings();

  return {
    routerMode: normalizeRouterMode(candidate.routerMode),
    listingProvider: normalizeProvider(candidate.listingProvider),
    listingModel: normalizeString(candidate.listingModel),
    groupingProvider: normalizeProvider(candidate.groupingProvider),
    groupingModel: normalizeString(candidate.groupingModel),
    listingMaxImages: normalizeNumber(candidate.listingMaxImages),
    ollamaBaseUrl: normalizeString(candidate.ollamaBaseUrl),
    openAiBaseUrl: normalizeString(candidate.openAiBaseUrl),
    openAiApiKey: normalizeString(candidate.openAiApiKey),
    anthropicBaseUrl: normalizeString(candidate.anthropicBaseUrl),
    anthropicApiKey: normalizeString(candidate.anthropicApiKey),
    openAiTimeoutMs: normalizeNumber(candidate.openAiTimeoutMs),
    anthropicTimeoutMs: normalizeNumber(candidate.anthropicTimeoutMs),
    ollamaTimeoutMs: normalizeNumber(candidate.ollamaTimeoutMs),
    lastTests:
      candidate.lastTests && typeof candidate.lastTests === "object"
        ? Object.fromEntries(
            Object.entries(candidate.lastTests).filter(
              ([provider, result]) =>
                normalizeProvider(provider) &&
                result &&
                typeof result === "object" &&
                typeof (result as AiProviderTestResult).message === "string" &&
                typeof (result as AiProviderTestResult).testedAt === "string"
            )
          ) as Partial<Record<AiProvider, AiProviderTestResult>>
        : defaults.lastTests,
    updatedAt: normalizeString(candidate.updatedAt),
  };
}

function ensureStoredAiSettingsSync() {
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }

  if (!existsSync(aiSettingsFilePath)) {
    const defaults = createDefaultStoredAiSettings();
    writeFileSync(aiSettingsFilePath, JSON.stringify(defaults, null, 2));
  }
}

export function readStoredAiSettingsSync(): StoredAiSettings {
  ensureStoredAiSettingsSync();
  const raw = readFileSync(aiSettingsFilePath, "utf8");

  return normalizeStoredAiSettings(JSON.parse(raw));
}

async function ensureStoredAiSettingsFile() {
  await mkdir(dataDirectory, { recursive: true });

  if (!existsSync(aiSettingsFilePath)) {
    const defaults = createDefaultStoredAiSettings();
    await writeFile(aiSettingsFilePath, JSON.stringify(defaults, null, 2));
  }
}

export async function readStoredAiSettings() {
  await ensureStoredAiSettingsFile();
  const raw = readFileSync(aiSettingsFilePath, "utf8");

  return normalizeStoredAiSettings(JSON.parse(raw));
}

export async function writeStoredAiSettings(settings: StoredAiSettings) {
  await ensureStoredAiSettingsFile();
  await writeFile(aiSettingsFilePath, JSON.stringify(settings, null, 2));
}

export async function updateStoredAiSettings(
  updater: (current: StoredAiSettings) => StoredAiSettings
) {
  const current = await readStoredAiSettings();
  const next = normalizeStoredAiSettings(updater(current));

  await writeStoredAiSettings({
    ...next,
    updatedAt: new Date().toISOString(),
  });

  return next;
}
