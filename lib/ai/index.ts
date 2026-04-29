import type { ListingGenerationService } from "@/lib/ai/listing-generation-service";
import { anthropicListingGenerationService } from "@/lib/ai/anthropic-listing-generation-service";
import {
  getGroupingProviderConfig,
  getListingProviderConfig,
  type AiProvider,
} from "@/lib/ai/provider-config";
import { openAiListingGenerationService } from "@/lib/ai/openai-listing-generation-service";
import { ollamaListingGenerationService } from "@/lib/ai/ollama-listing-generation-service";
import { anthropicPhotoDescriptorService } from "@/lib/grouping/anthropic-photo-descriptor-service";
import type { PhotoDescriptorService } from "@/lib/grouping/photo-descriptor-service";
import { openAiPhotoDescriptorService } from "@/lib/grouping/openai-photo-descriptor-service";
import { ollamaPhotoDescriptorService } from "@/lib/grouping/ollama-photo-descriptor-service";

function getListingProviderService(provider: AiProvider): ListingGenerationService {
  switch (provider) {
    case "openai":
      return openAiListingGenerationService;
    case "anthropic":
      return anthropicListingGenerationService;
    case "ollama":
      return ollamaListingGenerationService;
  }
}

function getGroupingProviderService(provider: AiProvider): PhotoDescriptorService {
  switch (provider) {
    case "openai":
      return openAiPhotoDescriptorService;
    case "anthropic":
      return anthropicPhotoDescriptorService;
    case "ollama":
      return ollamaPhotoDescriptorService;
  }
}

export function getListingGenerationService(): ListingGenerationService {
  return getListingProviderService(getListingProviderConfig().provider);
}

export function getPhotoDescriptorService(): PhotoDescriptorService {
  return getGroupingProviderService(getGroupingProviderConfig().provider);
}

export function getActiveAiProviders() {
  return {
    listing: getListingProviderConfig().provider,
    grouping: getGroupingProviderConfig().provider,
  };
}
