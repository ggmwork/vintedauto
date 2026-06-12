import type { DraftMetadata } from "@/types/draft";
import type { GenerationResult } from "@/types/generation";
import type { LocalCliEngine } from "@/types/ai";

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
  modelOverride?: string | null;
  // Used by the settings vision test to try a specific local CLI route
  // (engine + model) before it is saved and enabled.
  localCliEngineOverride?: LocalCliEngine | null;
  allowDisabledLocalCli?: boolean;
}

export interface ListingGenerationService {
  generate(input: ListingGenerationInput): Promise<GenerationResult>;
}
