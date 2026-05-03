import {
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";
import type { DraftDetail } from "@/types/draft";

export interface DraftReadiness {
  ready: boolean;
  missing: string[];
}

export function getDraftReadiness(
  draft: Pick<
    DraftDetail,
    | "imageCount"
    | "title"
    | "description"
    | "keywords"
    | "metadata"
    | "priceSuggestion"
    | "vintedProfile"
  >
): DraftReadiness {
  const missing: string[] = [];

  if (draft.imageCount === 0) {
    missing.push("images");
  }

  if (!draft.title?.trim()) {
    missing.push("title");
  }

  if (!draft.description?.trim()) {
    missing.push("description");
  }

  if (draft.keywords.length === 0) {
    missing.push("keywords");
  }

  if (
    !draft.priceSuggestion ||
    (draft.priceSuggestion.amount === null &&
      draft.priceSuggestion.minAmount === null &&
      draft.priceSuggestion.maxAmount === null)
  ) {
    missing.push("price");
  }

  if (!draft.metadata.category?.trim()) {
    missing.push("category");
  }

  if (!draft.metadata.condition?.trim()) {
    missing.push("condition");
  }

  if (draft.metadata.category?.trim()) {
    const vintedProfileState = hydrateDraftVintedProfileState({
      category: draft.metadata.category,
      state: draft.vintedProfile,
    });
    const resolvedProfile = resolveVintedListingProfile({
      category: draft.metadata.category,
      state: vintedProfileState,
    });
    const missingVintedFields = getVintedProfileMissingFieldKeys(
      resolvedProfile,
      vintedProfileState
    );

    missing.push(
      ...missingVintedFields.map((fieldKey) => `vinted:${fieldKey}`)
    );
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}
