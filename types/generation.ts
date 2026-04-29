import type { DraftMetadata } from "@/types/draft";
import type { PriceSuggestion } from "@/types/pricing";

export interface GeneratedListingContent {
  title: string;
  description: string;
  keywords: string[];
  conditionNotes: string | null;
  suggestedMetadata: Partial<DraftMetadata>;
}

export interface GenerationResult {
  provider: "openai" | "mock" | "ollama" | "anthropic";
  model: string;
  generatedAt: string;
  content: GeneratedListingContent;
  priceSuggestion: PriceSuggestion;
}
