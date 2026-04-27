import type { ListingGenerationService } from "@/lib/ai/listing-generation-service";
import { ollamaListingGenerationService } from "@/lib/ai/ollama-listing-generation-service";

export type AiProvider = "ollama" | "openai";

function getConfiguredProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (provider === "openai") {
    return "openai";
  }

  return "ollama";
}

export function getListingGenerationService(): ListingGenerationService {
  const provider = getConfiguredProvider();

  if (provider === "openai") {
    throw new Error(
      "OpenAI provider hook is not implemented yet. Use AI_PROVIDER=ollama for now."
    );
  }

  return ollamaListingGenerationService;
}

export function getActiveAiProvider(): AiProvider {
  return getConfiguredProvider();
}
