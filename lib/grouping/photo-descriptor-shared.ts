import type {
  PhotoDescriptorExtractionResult,
  PhotoDescriptorImageInput,
} from "@/lib/grouping/photo-descriptor-service";
import { buildFallbackDescriptor } from "@/lib/grouping/photo-descriptor-service";
import type { GroupingConfidence, PhotoDescriptor } from "@/types/intake";

export const photoDescriptorSchema = {
  type: "object",
  properties: {
    garmentType: { type: ["string", "null"] },
    primaryColor: { type: ["string", "null"] },
    secondaryColor: { type: ["string", "null"] },
    pattern: { type: ["string", "null"] },
    visibleBrand: { type: ["string", "null"] },
    backgroundType: { type: ["string", "null"] },
    presentationType: { type: ["string", "null"] },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
  },
  required: [
    "garmentType",
    "primaryColor",
    "secondaryColor",
    "pattern",
    "visibleBrand",
    "backgroundType",
    "presentationType",
    "confidence",
  ],
  additionalProperties: false,
} as const;

export function sanitizeDescriptorStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeDescriptorConfidence(value: unknown): GroupingConfidence {
  return value === "low" || value === "medium" ? value : "high";
}

export function stripMarkdownCodeFence(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function buildPhotoDescriptorPrompt(input: PhotoDescriptorImageInput) {
  return [
    "You extract compact grouping descriptors from one clothing listing image.",
    "Return only JSON that matches the supplied schema.",
    "Do not write prose.",
    "Be conservative.",
    "If a field is not reasonably visible, return null.",
    "The goal is to help group multiple photos that belong to the same clothing item.",
    `Filename hint: ${input.photoAsset.originalFilename}`,
    `Relative path hint: ${input.photoAsset.relativePath ?? "none"}`,
  ].join("\n");
}

export function parseDescriptorFromValue(
  value: unknown,
  createdAt: string,
  provider: string | null,
  model: string | null
): PhotoDescriptor {
  if (!value || typeof value !== "object") {
    throw new Error("Model returned invalid descriptor payload.");
  }

  const parsed = value as Record<string, unknown>;

  return {
    garmentType: sanitizeDescriptorStringOrNull(parsed.garmentType),
    primaryColor: sanitizeDescriptorStringOrNull(parsed.primaryColor),
    secondaryColor: sanitizeDescriptorStringOrNull(parsed.secondaryColor),
    pattern: sanitizeDescriptorStringOrNull(parsed.pattern),
    visibleBrand: sanitizeDescriptorStringOrNull(parsed.visibleBrand),
    backgroundType: sanitizeDescriptorStringOrNull(parsed.backgroundType),
    presentationType: sanitizeDescriptorStringOrNull(parsed.presentationType),
    confidence: sanitizeDescriptorConfidence(parsed.confidence),
    provider,
    model,
    extractedAt: createdAt,
  };
}

export function parseDescriptorFromText(
  content: string,
  createdAt: string,
  provider: string | null,
  model: string | null
) {
  return parseDescriptorFromValue(
    JSON.parse(stripMarkdownCodeFence(content)) as Record<string, unknown>,
    createdAt,
    provider,
    model
  );
}

export function buildFallbackDescriptorResult(
  input: PhotoDescriptorImageInput
): PhotoDescriptorExtractionResult {
  return {
    descriptor: buildFallbackDescriptor(input.photoAsset),
    provider: null,
    model: null,
  };
}
