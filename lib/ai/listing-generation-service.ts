import type { DraftMetadata } from "@/types/draft";
import type { GenerationResult } from "@/types/generation";

export type ListingLanguage = "pt" | "en" | "bilingual";

export interface ListingGenerationImage {
  originalFilename: string;
  contentType: string | null;
  bytes: Uint8Array;
}

export interface ListingGenerationInput {
  draftId: string;
  images: ListingGenerationImage[];
  metadata: DraftMetadata;
  preferredLanguage: ListingLanguage;
  currency: "EUR";
  marketplace: "vinted";
}

export interface ListingGenerationService {
  generate(input: ListingGenerationInput): Promise<GenerationResult>;
}
