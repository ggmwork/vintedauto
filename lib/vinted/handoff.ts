import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import {
  formatVintedCategoryPathInput,
  formatVintedFieldValue,
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";
import type { DraftDetail } from "@/types/draft";
import type { VintedListingPayload } from "@/types/vinted";

function buildDraftImageApiPath(draftId: string, imageId: string) {
  return `/api/drafts/${draftId}/images/${imageId}`;
}

function buildDraftImageApiUrl(apiPath: string, origin?: string | null) {
  if (!origin) {
    return null;
  }

  try {
    return new URL(apiPath, origin).toString();
  } catch {
    return null;
  }
}

function formatPriceLabel(payload: VintedListingPayload) {
  if (!payload.listing.price) {
    return "Not set";
  }

  if (payload.listing.price.amount !== null) {
    return `${payload.listing.price.amount.toFixed(2)} ${payload.listing.price.currency}`;
  }

  return `${payload.listing.price.minAmount?.toFixed(2) ?? "?"} - ${payload.listing.price.maxAmount?.toFixed(2) ?? "?"} ${payload.listing.price.currency}`;
}

export function createVintedHandoffPayload(
  draft: Pick<
    DraftDetail,
    | "title"
    | "description"
    | "keywords"
    | "priceSuggestion"
    | "metadata"
    | "vintedProfile"
    | "status"
    | "images"
    | "generation"
    | "id"
    | "createdAt"
    | "updatedAt"
  >,
  options?: {
    origin?: string | null;
  }
): VintedListingPayload {
  const vintedProfileState = hydrateDraftVintedProfileState({
    category: draft.metadata.category,
    state: draft.vintedProfile,
  });
  const resolvedVintedProfile = resolveVintedListingProfile({
    category: draft.metadata.category,
    state: vintedProfileState,
  });
  const readiness = getDraftReadiness({
    imageCount: draft.images.length,
    title: draft.title,
    description: draft.description,
    keywords: draft.keywords,
    metadata: draft.metadata,
    priceSuggestion: draft.priceSuggestion,
    vintedProfile: vintedProfileState,
  });
  const missingVintedFieldKeys = getVintedProfileMissingFieldKeys(
    resolvedVintedProfile,
    vintedProfileState
  );

  return {
    version: "2026-05-03",
    marketplace: "vinted",
    source: {
      draftId: draft.id,
      draftStatus: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      generation: {
        generatedAt: draft.generation?.generatedAt ?? null,
        provider: draft.generation?.provider ?? null,
        model: draft.generation?.model ?? null,
      },
    },
    target: {
      accountId: null,
      accountLabel: null,
    },
    handoff: {
      ready: readiness.ready,
      missingFields: readiness.missing,
      manualSubmitRequired: true,
    },
    listing: {
      title: draft.title,
      description: draft.description,
      keywords: draft.keywords,
      price: draft.priceSuggestion
        ? {
            amount: draft.priceSuggestion.amount,
            minAmount: draft.priceSuggestion.minAmount,
            maxAmount: draft.priceSuggestion.maxAmount,
            currency: draft.priceSuggestion.currency,
            confidence: draft.priceSuggestion.confidence,
            rationale: draft.priceSuggestion.rationale,
          }
        : null,
      metadata: {
        brand: draft.metadata.brand,
        category: draft.metadata.category,
        size: draft.metadata.size,
        condition: draft.metadata.condition,
        color: draft.metadata.color,
        material: draft.metadata.material,
        notes: draft.metadata.notes,
      },
      profile: {
        market: resolvedVintedProfile.market,
        profileKey: resolvedVintedProfile.profileKey,
        label: resolvedVintedProfile.label,
        description: resolvedVintedProfile.description,
        categoryPlan:
          vintedProfileState.categoryPlan ?? resolvedVintedProfile.categoryPlan,
        missingRequiredFieldKeys: missingVintedFieldKeys,
        fields: resolvedVintedProfile.dynamicFields.map((fieldDefinition) => ({
          ...fieldDefinition,
          value: vintedProfileState.fieldValues[fieldDefinition.key] ?? null,
        })),
      },
    },
    images: [...draft.images]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => {
        const apiPath = buildDraftImageApiPath(draft.id, image.id);

        return {
          id: image.id,
          filename: image.originalFilename,
          sortOrder: image.sortOrder,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          width: image.width,
          height: image.height,
          apiPath,
          apiUrl: buildDraftImageApiUrl(apiPath, options?.origin),
        };
      }),
  };
}

export function formatVintedHandoffText(payload: VintedListingPayload) {
  const priceLabel = formatPriceLabel(payload);
  const profileLines = payload.listing.profile
    ? [
        `Vinted profile: ${payload.listing.profile.label}`,
        `Category path: ${formatVintedCategoryPathInput(payload.listing.profile.categoryPlan) || "Not set"}`,
        ...payload.listing.profile.fields.map(
          (fieldDefinition) =>
            `${fieldDefinition.label}: ${formatVintedFieldValue(fieldDefinition, fieldDefinition.value)}`
        ),
      ]
    : ["Vinted profile: Not set"];

  return [
    `Title: ${payload.listing.title ?? "Not set"}`,
    `Category: ${payload.listing.metadata.category ?? "Not set"}`,
    `Brand: ${payload.listing.metadata.brand ?? "Not set"}`,
    `Size: ${payload.listing.metadata.size ?? "Not set"}`,
    `Condition: ${payload.listing.metadata.condition ?? "Not set"}`,
    `Color: ${payload.listing.metadata.color ?? "Not set"}`,
    `Material: ${payload.listing.metadata.material ?? "Not set"}`,
    `Price: ${priceLabel}`,
    `Keywords: ${payload.listing.keywords.length > 0 ? payload.listing.keywords.join(", ") : "Not set"}`,
    `Images: ${payload.images.length}`,
    "",
    "Description:",
    payload.listing.description ?? "Not set",
    "",
    "Notes:",
    payload.listing.metadata.notes ?? "No notes set.",
    "",
    ...profileLines,
  ].join("\n");
}

export function formatVintedHandoffJson(payload: VintedListingPayload) {
  return JSON.stringify(payload, null, 2);
}
