import type {
  ListingGenerationInput,
} from "@/lib/ai/listing-generation-service";
import type { DraftMetadata } from "@/types/draft";
import type { GeneratedListingContent } from "@/types/generation";
import type { PriceConfidence, PriceSuggestion } from "@/types/pricing";

export const listingGenerationSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    keywords: {
      type: "array",
      items: { type: "string" },
    },
    conditionNotes: {
      type: ["string", "null"],
    },
    suggestedMetadata: {
      type: "object",
      properties: {
        brand: { type: ["string", "null"] },
        category: { type: ["string", "null"] },
        size: { type: ["string", "null"] },
        condition: { type: ["string", "null"] },
        color: { type: ["string", "null"] },
        material: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
      },
      additionalProperties: false,
    },
    priceSuggestion: {
      type: "object",
      properties: {
        amount: { type: ["number", "null"] },
        minAmount: { type: ["number", "null"] },
        maxAmount: { type: ["number", "null"] },
        currency: { type: "string", enum: ["EUR"] },
        rationale: { type: "string" },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
      },
      required: [
        "amount",
        "minAmount",
        "maxAmount",
        "currency",
        "rationale",
        "confidence",
      ],
      additionalProperties: false,
    },
  },
  required: [
    "title",
    "description",
    "keywords",
    "conditionNotes",
    "suggestedMetadata",
    "priceSuggestion",
  ],
  additionalProperties: false,
} as const;

export function sanitizeKeywords(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

export function sanitizeStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function sanitizeMetadata(value: unknown): Partial<DraftMetadata> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;

  return {
    brand: sanitizeStringOrNull(candidate.brand),
    category: sanitizeStringOrNull(candidate.category),
    size: sanitizeStringOrNull(candidate.size),
    condition: sanitizeStringOrNull(candidate.condition),
    color: sanitizeStringOrNull(candidate.color),
    material: sanitizeStringOrNull(candidate.material),
    notes: sanitizeStringOrNull(candidate.notes),
  };
}

export function sanitizeConfidence(value: unknown): PriceConfidence {
  return value === "high" || value === "low" ? value : "medium";
}

export function sanitizeNumberOrNull(value: unknown) {
  if (typeof value === "string") {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2));
    }
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(2));
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

export function normalizeModelPayload(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Model returned invalid JSON payload.");
  }

  const candidate = value as Record<string, unknown>;

  return {
    title: candidate.title,
    description: candidate.description,
    keywords: candidate.keywords,
    conditionNotes: candidate.conditionNotes ?? null,
    suggestedMetadata:
      candidate.suggestedMetadata && typeof candidate.suggestedMetadata === "object"
        ? candidate.suggestedMetadata
        : {
            brand: candidate.brand ?? null,
            category: candidate.category ?? null,
            size: candidate.size ?? null,
            condition: candidate.condition ?? null,
            color: candidate.color ?? null,
            material: candidate.material ?? null,
            notes: candidate.notes ?? null,
          },
    priceSuggestion:
      candidate.priceSuggestion && typeof candidate.priceSuggestion === "object"
        ? candidate.priceSuggestion
        : typeof candidate.priceSuggestion === "string" ||
            typeof candidate.priceSuggestion === "number"
          ? {
              amount: candidate.priceSuggestion,
              minAmount: null,
              maxAmount: null,
              currency: "EUR",
              rationale:
                candidate.rationale ??
                "Model returned a flat price suggestion instead of the nested priceSuggestion object.",
              confidence: candidate.confidence ?? "low",
            }
          : {
              amount: candidate.price ?? candidate.amount ?? null,
              minAmount: candidate.minPrice ?? candidate.minAmount ?? null,
              maxAmount: candidate.maxPrice ?? candidate.maxAmount ?? null,
              currency: candidate.currency ?? "EUR",
              rationale:
                candidate.rationale ??
                "Model did not provide a reliable price suggestion.",
              confidence: candidate.confidence ?? "low",
            },
  } satisfies Record<string, unknown>;
}

export function parseStructuredPayload(content: string) {
  const normalizedContent = stripMarkdownCodeFence(content);

  return JSON.parse(normalizedContent) as Record<string, unknown>;
}

export function normalizePriceSuggestion(value: unknown): PriceSuggestion {
  const fallback: PriceSuggestion = {
    amount: null,
    minAmount: null,
    maxAmount: null,
    currency: "EUR",
    rationale: "Model did not provide a reliable price suggestion.",
    confidence: "low",
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  const amount = sanitizeNumberOrNull(candidate.amount);
  let minAmount = sanitizeNumberOrNull(candidate.minAmount);
  let maxAmount = sanitizeNumberOrNull(candidate.maxAmount);

  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    [minAmount, maxAmount] = [maxAmount, minAmount];
  }

  return {
    amount,
    minAmount,
    maxAmount,
    currency: "EUR",
    rationale:
      typeof candidate.rationale === "string" && candidate.rationale.trim()
        ? candidate.rationale.trim()
        : fallback.rationale,
    confidence: sanitizeConfidence(candidate.confidence),
  };
}

function buildFallbackTitle(metadata: Partial<DraftMetadata>) {
  const lead = [metadata.brand, metadata.color, metadata.category]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  const tail = [metadata.size ? `Size ${metadata.size}` : null, metadata.material]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" - ");

  const title = [lead, tail]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" - ");

  return title || null;
}

function buildFallbackDescription(
  metadata: Partial<DraftMetadata>,
  conditionNotes: string | null
) {
  const subject =
    [metadata.color, metadata.brand, metadata.category]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ") || "This item";

  const details = [
    metadata.condition ? `${metadata.condition} condition.` : null,
    metadata.size ? `Size ${metadata.size}.` : null,
    metadata.material ? `Material: ${metadata.material}.` : null,
    metadata.notes ? metadata.notes : null,
    conditionNotes,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (details.length === 0) {
    return null;
  }

  return `${subject}. ${details.join(" ")}`.trim();
}

export function validateStructuredContent(value: unknown): GeneratedListingContent {
  if (!value || typeof value !== "object") {
    throw new Error("Model returned invalid JSON payload.");
  }

  const candidate = value as Record<string, unknown>;
  const suggestedMetadata = sanitizeMetadata(candidate.suggestedMetadata);
  const conditionNotes = sanitizeStringOrNull(candidate.conditionNotes);
  const title =
    typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title.trim()
      : buildFallbackTitle(suggestedMetadata);
  const description =
    typeof candidate.description === "string" && candidate.description.trim()
      ? candidate.description.trim()
      : buildFallbackDescription(suggestedMetadata, conditionNotes);

  if (!title || !description) {
    throw new Error("Model response is missing title or description.");
  }

  return {
    title,
    description,
    keywords: [],
    conditionNotes,
    suggestedMetadata,
  };
}

export function buildFallbackKeywords(title: string, metadata: DraftMetadata) {
  const candidateValues = [
    title,
    metadata.brand,
    metadata.category,
    metadata.size,
    metadata.condition,
    metadata.color,
    metadata.material,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .flatMap((value) => value.split(/[^a-zA-Z0-9]+/))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 2);

  return Array.from(new Set(candidateValues)).slice(0, 12);
}

export function buildListingPrompt(
  input: ListingGenerationInput,
  totalImageCount = input.images.length
) {
  const imageContextLine =
    totalImageCount > input.images.length
      ? `You are seeing ${input.images.length} representative photos selected from ${totalImageCount} total item photos.`
      : `You are seeing ${input.images.length} item photos.`;

  return [
    "You generate Vinted listing drafts from product photos.",
    "Return only JSON that matches the supplied schema.",
    "Be concrete and concise.",
    "Always return non-empty title and description fields.",
    "Use the photos as the primary source of truth.",
    `Write the listing in ${input.preferredLanguage}.`,
    "Do not invent brand, material, or size unless reasonably visible.",
    "Do not return top-level brand, category, size, condition, color, material, notes, or price fields. Put metadata under suggestedMetadata and pricing under priceSuggestion.",
    "If uncertain, leave metadata fields null and explain uncertainty in conditionNotes or rationale.",
    `Pricing must be a realistic ${input.currency} suggestion or range for a second-hand ${input.marketplace} listing.`,
    imageContextLine,
    `Known draft metadata: ${JSON.stringify(input.metadata)}`,
  ].join("\n");
}

export function selectRepresentativeImages<T>(images: T[], limit: number) {
  if (images.length <= limit) {
    return images;
  }

  const selectedIndices = new Set<number>();

  for (let step = 0; step < limit; step += 1) {
    const index = Math.round((step * (images.length - 1)) / (limit - 1));
    selectedIndices.add(index);
  }

  for (let index = 0; selectedIndices.size < limit && index < images.length; index += 1) {
    selectedIndices.add(index);
  }

  return Array.from(selectedIndices)
    .sort((left, right) => left - right)
    .slice(0, limit)
    .map((index) => images[index]);
}

export function resolveGeneratedAt(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  return new Date().toISOString();
}

export function buildCanonicalGenerationResult(
  provider: "ollama" | "openai" | "anthropic",
  model: string,
  generatedAt: string,
  parsedPayload: unknown,
  inputMetadata: DraftMetadata
) {
  const normalizedPayload = normalizeModelPayload(parsedPayload);
  const content = validateStructuredContent(normalizedPayload);
  const mergedMetadata = {
    ...inputMetadata,
    ...content.suggestedMetadata,
  };

  return {
    provider,
    model,
    generatedAt,
    content: {
      ...content,
      keywords:
        sanitizeKeywords(normalizedPayload.keywords).length > 0
          ? sanitizeKeywords(normalizedPayload.keywords)
          : buildFallbackKeywords(content.title, mergedMetadata),
    },
    priceSuggestion: normalizePriceSuggestion(normalizedPayload.priceSuggestion),
  };
}
