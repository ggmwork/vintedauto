import type {
  ListingGenerationInput,
  ListingGenerationService,
} from "@/lib/ai/listing-generation-service";
import type { DraftMetadata } from "@/types/draft";
import type { GeneratedListingContent, GenerationResult } from "@/types/generation";
import type { PriceConfidence, PriceSuggestion } from "@/types/pricing";

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    content?: string;
  };
}

const generationSchema = {
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

function getOllamaBaseUrl() {
  return process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL?.trim() || "qwen3.5:4b";
}

function sanitizeKeywords(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function buildFallbackKeywords(title: string, metadata: DraftMetadata) {
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

function sanitizeStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function sanitizeMetadata(value: unknown): Partial<DraftMetadata> {
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

function sanitizeConfidence(value: unknown): PriceConfidence {
  return value === "high" || value === "low" ? value : "medium";
}

function sanitizeNumberOrNull(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}

function normalizePriceSuggestion(value: unknown): PriceSuggestion {
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

function validateStructuredContent(value: unknown): GeneratedListingContent {
  if (!value || typeof value !== "object") {
    throw new Error("Model returned invalid JSON payload.");
  }

  const candidate = value as Record<string, unknown>;
  const title =
    typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title.trim()
      : null;
  const description =
    typeof candidate.description === "string" && candidate.description.trim()
      ? candidate.description.trim()
      : null;

  if (!title || !description) {
    throw new Error("Model response is missing title or description.");
  }

  return {
    title,
    description,
    keywords: [],
    conditionNotes: sanitizeStringOrNull(candidate.conditionNotes),
    suggestedMetadata: sanitizeMetadata(candidate.suggestedMetadata),
  };
}

function buildPrompt(input: ListingGenerationInput) {
  return [
    "You generate Vinted listing drafts from product photos.",
    "Return only JSON that matches the supplied schema.",
    "Be concrete and concise.",
    "Use the photos as the primary source of truth.",
    `Write the listing in ${input.preferredLanguage}.`,
    "Do not invent brand, material, or size unless reasonably visible.",
    "If uncertain, leave metadata fields null and explain uncertainty in conditionNotes or rationale.",
    `Pricing must be a realistic ${input.currency} suggestion or range for a second-hand ${input.marketplace} listing.`,
    `Known draft metadata: ${JSON.stringify(input.metadata)}`,
  ].join("\n");
}

class OllamaListingGenerationService implements ListingGenerationService {
  async generate(input: ListingGenerationInput): Promise<GenerationResult> {
    if (input.images.length === 0) {
      throw new Error("At least one image is required for generation.");
    }

    const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOllamaModel(),
        messages: [
          {
            role: "user",
            content: buildPrompt(input),
            images: input.images.map((image) =>
              Buffer.from(image.bytes).toString("base64")
            ),
          },
        ],
        format: generationSchema,
        options: {
          temperature: 0.1,
        },
        think: false,
        stream: false,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Ollama request failed (${response.status}): ${errorText || "unknown error"}`
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload.message?.content;

    if (!content) {
      throw new Error("Ollama returned an empty response.");
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;

    const contentResult = validateStructuredContent(parsed);
    const mergedMetadata = {
      ...input.metadata,
      ...contentResult.suggestedMetadata,
    };

    return {
      provider: "ollama",
      model: payload.model || getOllamaModel(),
      generatedAt: payload.created_at || new Date().toISOString(),
      content: {
        ...contentResult,
        keywords:
          sanitizeKeywords(parsed.keywords).length > 0
            ? sanitizeKeywords(parsed.keywords)
            : buildFallbackKeywords(contentResult.title, mergedMetadata),
      },
      priceSuggestion: normalizePriceSuggestion(parsed.priceSuggestion),
    };
  }
}

export const ollamaListingGenerationService =
  new OllamaListingGenerationService();
