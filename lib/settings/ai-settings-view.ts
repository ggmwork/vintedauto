import "server-only";

import {
  getAiRouterMode,
  getAnthropicBaseUrl,
  getGroupingProviderConfig,
  getListingMaxImages,
  getListingProviderConfig,
  getLocalCliEnabled,
  getLocalCliEngine,
  getLocalCliModel,
  getOllamaBaseUrl,
  getOpenAiBaseUrl,
  getProviderTimeoutMs,
  getStoredAiSettingsSnapshot,
} from "@/lib/ai/provider-config";
import { readLocalModelDiscoveryCacheSync } from "@/lib/ai/local-model-discovery";

export function getAiSettingsViewModel() {
  const stored = getStoredAiSettingsSnapshot();
  const listing = getListingProviderConfig();
  const grouping = getGroupingProviderConfig();
  const localModels = readLocalModelDiscoveryCacheSync();

  return {
    routerMode: getAiRouterMode(),
    tasks: {
      listing,
      grouping,
    },
    providers: {
      ollama: {
        baseUrl: getOllamaBaseUrl(),
        timeoutMs: getProviderTimeoutMs("ollama", "listing"),
        listingMaxImages: getListingMaxImages(),
      },
      openai: {
        baseUrl: getOpenAiBaseUrl(),
        timeoutMs: getProviderTimeoutMs("openai", "listing"),
        hasApiKey:
          Boolean(stored.openAiApiKey) || Boolean(process.env.OPENAI_API_KEY?.trim()),
      },
      anthropic: {
        baseUrl: getAnthropicBaseUrl(),
        timeoutMs: getProviderTimeoutMs("anthropic", "listing"),
        hasApiKey:
          Boolean(stored.anthropicApiKey) || Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      },
      localCli: {
        enabled: getLocalCliEnabled(),
        engine: getLocalCliEngine(),
        model: getLocalCliModel(),
        timeoutMs: getProviderTimeoutMs("local-cli", "listing"),
      },
    },
    lastTests: stored.lastTests,
    lastVisionTest: stored.lastVisionTest,
    localModels,
    updatedAt: stored.updatedAt,
    storedFlags: {
      openAiApiKey: Boolean(stored.openAiApiKey),
      anthropicApiKey: Boolean(stored.anthropicApiKey),
    },
  };
}
