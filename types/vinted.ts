import type { DraftStatus } from "@/types/draft";
import type { PriceConfidence } from "@/types/pricing";

export interface VintedListingPricePayload {
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: "EUR";
  confidence: PriceConfidence;
  rationale: string;
}

export interface VintedListingMetadataPayload {
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  color: string | null;
  material: string | null;
  notes: string | null;
}

export interface VintedListingImagePayload {
  id: string;
  filename: string;
  sortOrder: number;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  apiPath: string;
}

export interface VintedListingPayload {
  version: "2026-04-29";
  marketplace: "vinted";
  source: {
    draftId: string;
    draftStatus: DraftStatus;
    createdAt: string;
    updatedAt: string;
    generation: {
      generatedAt: string | null;
      provider: string | null;
      model: string | null;
    };
  };
  target: {
    accountId: string | null;
    accountLabel: string | null;
  };
  handoff: {
    ready: boolean;
    missingFields: string[];
    manualSubmitRequired: true;
  };
  listing: {
    title: string | null;
    description: string | null;
    keywords: string[];
    price: VintedListingPricePayload | null;
    metadata: VintedListingMetadataPayload;
  };
  images: VintedListingImagePayload[];
}
