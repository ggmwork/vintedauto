import type { PriceSuggestion } from "@/types/pricing";
import type { VintedFillResultPayload } from "@/types/vinted";

export type DraftStatus = "draft" | "ready" | "listed" | "sold";

export type DraftVintedHandoffStatus =
  | "not_started"
  | "handed_off"
  | "filled_on_vinted"
  | "needs_manual_fix"
  | "fill_failed";

export interface DraftMetadata {
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  color: string | null;
  material: string | null;
  notes: string | null;
}

export interface DraftImage {
  id: string;
  draftId: string;
  storagePath: string;
  originalFilename: string;
  sortOrder: number;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
}

export interface DraftGenerationSnapshot {
  title: string;
  description: string;
  keywords: string[];
  suggestedMetadata: Partial<DraftMetadata>;
  priceSuggestion: PriceSuggestion;
}

export interface DraftGenerationInfo {
  provider: "openai" | "mock" | "ollama" | "anthropic";
  model: string;
  generatedAt: string;
  conditionNotes: string | null;
  snapshot: DraftGenerationSnapshot;
}

export interface DraftVintedHandoffState {
  status: DraftVintedHandoffStatus;
  lastRequestedAt: string | null;
  lastUpdatedAt: string | null;
  lastResult: VintedFillResultPayload | null;
}

export interface Draft {
  id: string;
  status: DraftStatus;
  title: string | null;
  description: string | null;
  keywords: string[];
  metadata: DraftMetadata;
  priceSuggestion: PriceSuggestion | null;
  generation: DraftGenerationInfo | null;
  generationHistory: DraftGenerationInfo[];
  vintedHandoff: DraftVintedHandoffState;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftDetail extends Draft {
  images: DraftImage[];
}
