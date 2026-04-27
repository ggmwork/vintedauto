import type { DraftMetadata } from "@/types/draft";
import type { PriceSuggestion } from "@/types/pricing";

export interface PriceSuggestionInput {
  title: string;
  description: string;
  metadata: DraftMetadata;
}

export interface PriceSuggestionService {
  suggest(input: PriceSuggestionInput): Promise<PriceSuggestion>;
}
