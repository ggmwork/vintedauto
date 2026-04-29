import "server-only";

import { getRecommendedOllamaPreset } from "@/lib/ai/ollama-presets";
import { readStoredAiSettingsSync } from "@/lib/settings/ai-settings";
import type { AiProvider, AiRouterMode, AiTask } from "@/types/ai";

const defaultLocalPreset = getRecommendedOllamaPreset("light-local");

function parseProvider(value: string | undefined | null): AiProvider | null {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "ollama" ||
    normalized === "openai" ||
    normalized === "anthropic"
  ) {
    return normalized;
  }

  return null;
}

function parseRouterMode(value: string | undefined | null): AiRouterMode {
  return value?.trim().toLowerCase() === "fallback" ? "fallback" : "manual";
}

function parseTimeout(value: string | undefined | null, fallback: number) {
  const parsed = Number(value?.trim());

  if (!Number.isFinite(parsed) || parsed < 30_000) {
    return fallback;
  }

  return parsed;
}

function parseBoundedCount(
  value: string | undefined | null,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number(value?.trim());

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
}

function getLegacyProvider() {
  return parseProvider(process.env.AI_PROVIDER) ?? "ollama";
}

function getConfiguredTaskProvider(task: AiTask): AiProvider {
  const stored = readStoredAiSettingsSync();
  const taskKey =
    task === "listing" ? process.env.AI_LISTING_PROVIDER : process.env.AI_GROUPING_PROVIDER;

  const storedProvider =
    task === "listing" ? stored.listingProvider : stored.groupingProvider;

  return storedProvider ?? parseProvider(taskKey) ?? getLegacyProvider();
}

function getProviderSpecificModel(task: AiTask, provider: AiProvider) {
  const stored = readStoredAiSettingsSync();
  switch (provider) {
    case "ollama":
      return task === "listing"
        ? process.env.OLLAMA_MODEL?.trim() || defaultLocalPreset?.listingModel || "gemma3:4b"
        : stored.groupingProvider === "ollama" && stored.groupingModel
          ? stored.groupingModel
          : process.env.OLLAMA_GROUPING_MODEL?.trim() ||
            process.env.OLLAMA_MODEL?.trim() ||
            defaultLocalPreset?.groupingModel ||
            "qwen2.5vl:3b";
    case "openai":
      return task === "listing"
        ? process.env.OPENAI_MODEL?.trim() || null
        : stored.groupingProvider === "openai" && stored.groupingModel
          ? stored.groupingModel
          : process.env.OPENAI_GROUPING_MODEL?.trim() ||
            process.env.OPENAI_MODEL?.trim() ||
            null;
    case "anthropic":
      return task === "listing"
        ? process.env.ANTHROPIC_MODEL?.trim() || null
        : stored.groupingProvider === "anthropic" && stored.groupingModel
          ? stored.groupingModel
          : process.env.ANTHROPIC_GROUPING_MODEL?.trim() ||
            process.env.ANTHROPIC_MODEL?.trim() ||
            null;
  }
}

function getGenericTaskModel(task: AiTask) {
  const stored = readStoredAiSettingsSync();

  if (task === "listing") {
    return (
      stored.listingModel ??
      process.env.AI_LISTING_MODEL?.trim() ??
      null
    );
  }

  return (
    stored.groupingModel ??
    process.env.AI_GROUPING_MODEL?.trim() ??
    null
  );
}

export function getAiRouterMode(): AiRouterMode {
  const stored = readStoredAiSettingsSync();
  return stored.routerMode ?? parseRouterMode(process.env.AI_ROUTER_MODE);
}

export function getTaskProviderConfig(task: AiTask) {
  const provider = getConfiguredTaskProvider(task);
  const model = getGenericTaskModel(task) || getProviderSpecificModel(task, provider);

  return {
    provider,
    model,
  };
}

export function getListingProviderConfig() {
  return getTaskProviderConfig("listing");
}

export function getGroupingProviderConfig() {
  return getTaskProviderConfig("grouping");
}

export function getProviderTimeoutMs(provider: AiProvider, task: AiTask) {
  const stored = readStoredAiSettingsSync();
  switch (provider) {
    case "ollama":
      return typeof stored.ollamaTimeoutMs === "number"
        ? stored.ollamaTimeoutMs
        : parseTimeout(
            process.env.OLLAMA_TIMEOUT_MS,
            task === "listing" ? 300_000 : 120_000
          );
    case "openai":
      return typeof stored.openAiTimeoutMs === "number"
        ? stored.openAiTimeoutMs
        : parseTimeout(process.env.OPENAI_TIMEOUT_MS, 120_000);
    case "anthropic":
      return typeof stored.anthropicTimeoutMs === "number"
        ? stored.anthropicTimeoutMs
        : parseTimeout(process.env.ANTHROPIC_TIMEOUT_MS, 120_000);
  }
}

export function getListingMaxImages() {
  const stored = readStoredAiSettingsSync();
  return parseBoundedCount(
    stored.listingMaxImages !== null
      ? String(stored.listingMaxImages)
      : process.env.AI_LISTING_MAX_IMAGES ?? process.env.OLLAMA_MAX_GENERATION_IMAGES,
    defaultLocalPreset?.listingMaxImages ?? 4,
    1,
    8
  );
}

export function getOllamaBaseUrl() {
  const stored = readStoredAiSettingsSync();
  return (
    stored.ollamaBaseUrl ??
    process.env.OLLAMA_BASE_URL?.trim() ??
    "http://127.0.0.1:11434"
  );
}

export function getOpenAiBaseUrl() {
  const stored = readStoredAiSettingsSync();
  return (
    stored.openAiBaseUrl ??
    process.env.OPENAI_BASE_URL?.trim() ??
    "https://api.openai.com/v1"
  );
}

export function getAnthropicBaseUrl() {
  const stored = readStoredAiSettingsSync();
  return (
    stored.anthropicBaseUrl ??
    process.env.ANTHROPIC_BASE_URL?.trim() ??
    "https://api.anthropic.com/v1"
  );
}

export function requireProviderApiKey(provider: Extract<AiProvider, "openai" | "anthropic">) {
  const stored = readStoredAiSettingsSync();
  const key =
    provider === "openai"
      ? stored.openAiApiKey ?? process.env.OPENAI_API_KEY?.trim()
      : stored.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY?.trim();

  if (!key) {
    throw new Error(
      `${provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} is required when ${provider} is selected.`
    );
  }

  return key;
}

export function getStoredAiSettingsSnapshot() {
  return readStoredAiSettingsSync();
}

export function requireProviderModel(task: AiTask, provider: AiProvider) {
  const model = getGenericTaskModel(task) || getProviderSpecificModel(task, provider);

  if (!model) {
    throw new Error(
      `No model configured for ${provider} ${task}. Set ${
        task === "listing" ? "AI_LISTING_MODEL" : "AI_GROUPING_MODEL"
      } or the provider-specific model env var.`
    );
  }

  return model;
}
