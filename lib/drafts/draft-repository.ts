import type {
  Draft,
  DraftDetail,
  DraftImage,
  DraftMetadata,
  DraftStatus,
} from "@/types/draft";
import type { GenerationResult } from "@/types/generation";
import type { PriceSuggestion } from "@/types/pricing";

export interface CreateDraftInput {
  status?: DraftStatus;
  metadata?: Partial<DraftMetadata>;
}

export interface UpdateDraftInput {
  status?: DraftStatus;
  title?: string | null;
  description?: string | null;
  keywords?: string[];
  metadata?: Partial<DraftMetadata>;
  priceSuggestion?: PriceSuggestion | null;
  generation?: DraftDetail["generation"] | null;
}

export interface SaveDraftImagesInput {
  draftId: string;
  images: DraftImage[];
}

export interface SaveGenerationResultInput {
  draftId: string;
  generation: GenerationResult;
}

export interface RestoreGenerationInput {
  draftId: string;
  generatedAt: string;
}

export interface DraftRepository {
  list(): Promise<Draft[]>;
  getById(id: string): Promise<DraftDetail | null>;
  create(input: CreateDraftInput): Promise<Draft>;
  update(id: string, input: UpdateDraftInput): Promise<Draft>;
  attachImages(input: SaveDraftImagesInput): Promise<DraftDetail>;
  saveGeneration(input: SaveGenerationResultInput): Promise<DraftDetail>;
  restoreGeneration(input: RestoreGenerationInput): Promise<DraftDetail>;
}
