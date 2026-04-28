import type {
  GroupingConfidence,
  PhotoAsset,
  PhotoDescriptor,
} from "@/types/intake";

export interface PhotoDescriptorImageInput {
  photoAsset: PhotoAsset;
  bytes: Uint8Array;
}

export interface PhotoDescriptorExtractionResult {
  descriptor: PhotoDescriptor;
  provider: string | null;
  model: string | null;
}

export interface PhotoDescriptorService {
  extract(
    input: PhotoDescriptorImageInput
  ): Promise<PhotoDescriptorExtractionResult>;
}

function normalizeToken(value: string) {
  return value
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickConfidenceFromTokens(tokens: string[]): GroupingConfidence {
  return tokens.length >= 2 ? "medium" : "low";
}

export function buildFallbackDescriptor(photoAsset: PhotoAsset): PhotoDescriptor {
  const relativeHint = normalizeToken(photoAsset.relativePath ?? "");
  const fileHint = normalizeToken(photoAsset.originalFilename);
  const merged = `${relativeHint} ${fileHint}`.trim().toLowerCase();
  const tokens = merged.split(/\s+/).filter((token) => token.length > 1);

  const clothingType =
    ["hoodie", "shirt", "tshirt", "t-shirt", "jacket", "pants", "jeans", "dress", "shorts", "skirt", "sweater", "top", "polo"].find((token) =>
      tokens.includes(token)
    ) ?? null;

  const color =
    ["black", "white", "blue", "red", "green", "pink", "grey", "gray", "brown", "beige", "yellow", "orange", "purple"].find((token) =>
      tokens.includes(token)
    ) ?? null;

  return {
    garmentType: clothingType,
    primaryColor: color === "gray" ? "grey" : color,
    secondaryColor: null,
    pattern: null,
    visibleBrand: null,
    backgroundType: null,
    presentationType: null,
    confidence: pickConfidenceFromTokens(tokens),
    provider: null,
    model: null,
    extractedAt: new Date().toISOString(),
  };
}
