import type { DraftDetail, DraftStatus } from "@/types/draft";

export interface VintedHandoffPayload {
  title: string | null;
  description: string | null;
  keywords: string[];
  price: {
    amount: number | null;
    minAmount: number | null;
    maxAmount: number | null;
    currency: "EUR";
    confidence: "low" | "medium" | "high";
    rationale: string;
  } | null;
  item: {
    brand: string | null;
    category: string | null;
    size: string | null;
    condition: string | null;
    color: string | null;
    material: string | null;
    notes: string | null;
  };
  workflow: {
    status: DraftStatus;
    imageCount: number;
    generatedAt: string | null;
    provider: string | null;
    model: string | null;
  };
}

export function createVintedHandoffPayload(
  draft: Pick<
    DraftDetail,
    | "title"
    | "description"
    | "keywords"
    | "priceSuggestion"
    | "metadata"
    | "status"
    | "imageCount"
    | "generation"
  >
): VintedHandoffPayload {
  return {
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
    item: {
      brand: draft.metadata.brand,
      category: draft.metadata.category,
      size: draft.metadata.size,
      condition: draft.metadata.condition,
      color: draft.metadata.color,
      material: draft.metadata.material,
      notes: draft.metadata.notes,
    },
    workflow: {
      status: draft.status,
      imageCount: draft.imageCount,
      generatedAt: draft.generation?.generatedAt ?? null,
      provider: draft.generation?.provider ?? null,
      model: draft.generation?.model ?? null,
    },
  };
}

export function formatVintedHandoffText(payload: VintedHandoffPayload) {
  const priceLabel = payload.price
    ? payload.price.amount !== null
      ? `${payload.price.amount.toFixed(2)} ${payload.price.currency}`
      : `${payload.price.minAmount?.toFixed(2) ?? "?"} - ${payload.price.maxAmount?.toFixed(2) ?? "?"} ${payload.price.currency}`
    : "Not set";

  return [
    `Title: ${payload.title ?? "Not set"}`,
    `Category: ${payload.item.category ?? "Not set"}`,
    `Brand: ${payload.item.brand ?? "Not set"}`,
    `Size: ${payload.item.size ?? "Not set"}`,
    `Condition: ${payload.item.condition ?? "Not set"}`,
    `Color: ${payload.item.color ?? "Not set"}`,
    `Material: ${payload.item.material ?? "Not set"}`,
    `Price: ${priceLabel}`,
    `Keywords: ${payload.keywords.length > 0 ? payload.keywords.join(", ") : "Not set"}`,
    "",
    "Description:",
    payload.description ?? "Not set",
    "",
    "Notes:",
    payload.item.notes ?? "No notes set.",
  ].join("\n");
}

export function formatVintedHandoffJson(payload: VintedHandoffPayload) {
  return JSON.stringify(payload, null, 2);
}
