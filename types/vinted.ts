import type { DraftStatus } from "@/types/draft";
import type { PriceConfidence } from "@/types/pricing";
import type {
  DraftVintedCategoryPlan,
  DraftVintedFieldValue,
  VintedDynamicFieldDefinition,
} from "@/types/vinted-profile";

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

export interface VintedListingProfileFieldPayload
  extends VintedDynamicFieldDefinition {
  value: DraftVintedFieldValue;
}

export interface VintedListingProfilePayload {
  market: "vinted.pt";
  profileKey: string;
  label: string;
  description: string;
  categoryPlan: DraftVintedCategoryPlan;
  missingRequiredFieldKeys: string[];
  fields: VintedListingProfileFieldPayload[];
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
  apiUrl: string | null;
}

export type VintedFillResultStatus = "success" | "partial_success" | "failure";

export interface VintedFieldDiagnosticPayload {
  detail: string;
  matchedBy: string | null;
}

export interface VintedFillDebugPayload {
  pageReason: string | null;
  debugLog: string[];
  fieldDiagnostics: Record<string, VintedFieldDiagnosticPayload>;
}

export interface VintedFillResultPayload {
  status: VintedFillResultStatus;
  filledFields: string[];
  skippedFields: string[];
  failedFields: string[];
  message: string;
  debug: VintedFillDebugPayload | null;
}

export interface VintedListingPayload {
  version: "2026-05-03";
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
    profile: VintedListingProfilePayload | null;
  };
  images: VintedListingImagePayload[];
}
