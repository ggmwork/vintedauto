import type { DraftDetail, DraftGenerationInfo } from "@/types/draft";
import type { PriceSuggestion } from "@/types/pricing";

export interface DraftGenerationDiffField {
  key:
    | "title"
    | "description"
    | "keywords"
    | "price"
    | "brand"
    | "category"
    | "size"
    | "condition"
    | "color"
    | "material"
    | "notes";
  label: string;
}

const draftGenerationFields: DraftGenerationDiffField[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "keywords", label: "Keywords" },
  { key: "price", label: "Price" },
  { key: "brand", label: "Brand" },
  { key: "category", label: "Category" },
  { key: "size", label: "Size" },
  { key: "condition", label: "Condition" },
  { key: "color", label: "Color" },
  { key: "material", label: "Material" },
  { key: "notes", label: "Notes" },
];

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function arePriceSuggestionsEqual(
  left: PriceSuggestion | null,
  right: PriceSuggestion | null
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.amount === right.amount &&
    left.minAmount === right.minAmount &&
    left.maxAmount === right.maxAmount &&
    left.currency === right.currency &&
    left.rationale === right.rationale &&
    left.confidence === right.confidence
  );
}

export function getChangedFieldsFromGeneration(
  draft: Pick<
    DraftDetail,
    "title" | "description" | "keywords" | "metadata" | "priceSuggestion"
  >,
  generation: DraftGenerationInfo | null
) {
  if (!generation) {
    return [];
  }

  return draftGenerationFields.filter((field) => {
    switch (field.key) {
      case "title":
        return (draft.title ?? "") !== generation.snapshot.title;
      case "description":
        return (draft.description ?? "") !== generation.snapshot.description;
      case "keywords":
        return !areStringArraysEqual(draft.keywords, generation.snapshot.keywords);
      case "price":
        return !arePriceSuggestionsEqual(
          draft.priceSuggestion,
          generation.snapshot.priceSuggestion
        );
      case "brand":
        return (
          (draft.metadata.brand ?? "") !==
          (generation.snapshot.suggestedMetadata.brand ?? "")
        );
      case "category":
        return (
          (draft.metadata.category ?? "") !==
          (generation.snapshot.suggestedMetadata.category ?? "")
        );
      case "size":
        return (
          (draft.metadata.size ?? "") !==
          (generation.snapshot.suggestedMetadata.size ?? "")
        );
      case "condition":
        return (
          (draft.metadata.condition ?? "") !==
          (generation.snapshot.suggestedMetadata.condition ?? "")
        );
      case "color":
        return (
          (draft.metadata.color ?? "") !==
          (generation.snapshot.suggestedMetadata.color ?? "")
        );
      case "material":
        return (
          (draft.metadata.material ?? "") !==
          (generation.snapshot.suggestedMetadata.material ?? "")
        );
      case "notes":
        return (
          (draft.metadata.notes ?? "") !==
          (generation.snapshot.suggestedMetadata.notes ?? "")
        );
    }
  });
}
