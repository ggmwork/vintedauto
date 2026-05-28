import type { DraftDetail } from "@/types/draft";
import {
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";

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
    draft.priceSuggestion.amount === null
  ) {
    missing.push("price");
  }

  if (!draft.metadata.category?.trim()) {
    missing.push("category");
  }

  if (!draft.metadata.condition?.trim()) {
    missing.push("condition");
  }

  const vintedProfileState = hydrateDraftVintedProfileState({
    category: draft.metadata.category,
    state: draft.vintedProfile,
  });
  const resolvedVintedProfile = resolveVintedListingProfile({
    category: draft.metadata.category,
    state: vintedProfileState,
  });

  missing.push(
    ...getVintedProfileMissingFieldKeys(
      resolvedVintedProfile,
      vintedProfileState
    )
  );

  return {
    ready: missing.length === 0,
    missing,
  };
}
