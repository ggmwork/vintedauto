import type { PriceSuggestion } from "@/types/pricing";

export type DraftStatus = "draft" | "ready" | "listed" | "sold";

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
  provider: "openai" | "mock" | "ollama";
  model: string;
  generatedAt: string;
  conditionNotes: string | null;
  snapshot: DraftGenerationSnapshot;
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
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DraftDetail extends Draft {
  images: DraftImage[];
}
