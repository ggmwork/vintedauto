export type ListingGenerationJobStatus = "running" | "done" | "failed";

export type ListingGenerationJobTargetType = "stock-item" | "draft";

export interface ListingGenerationJob {
  id: string;
  targetType: ListingGenerationJobTargetType;
  sessionId: string | null;
  stockItemId: string | null;
  draftId: string | null;
  resultDraftId: string | null;
  label: string;
  status: ListingGenerationJobStatus;
  message: string;
  error: string | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface ListingGenerationJobTarget {
  targetType: ListingGenerationJobTargetType;
  sessionId?: string | null;
  stockItemId?: string | null;
  draftId?: string | null;
}
