import type {
  PhotoDescriptorExtractionResult,
  PhotoDescriptorImageInput,
  PhotoDescriptorService,
} from "@/lib/grouping/photo-descriptor-service";
import { buildFallbackDescriptor } from "@/lib/grouping/photo-descriptor-service";
import type { GroupingConfidence, PhotoDescriptor } from "@/types/intake";

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    content?: string;
  };
}

const descriptorSchema = {
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

function getOllamaBaseUrl() {
  return process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
}

function getOllamaGroupingModel() {
  return process.env.OLLAMA_GROUPING_MODEL?.trim() || process.env.OLLAMA_MODEL?.trim() || "qwen3.5:4b";
}

function getOllamaTimeoutMs() {
  const rawValue = process.env.OLLAMA_TIMEOUT_MS?.trim();

  if (!rawValue) {
    return 120_000;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) && parsedValue >= 30_000
    ? parsedValue
    : 120_000;
}

function sanitizeStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeConfidence(value: unknown): GroupingConfidence {
  return value === "low" || value === "medium" ? value : "high";
}

function stripMarkdownCodeFence(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function buildPrompt(input: PhotoDescriptorImageInput) {
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

function parseDescriptor(
  content: string,
  createdAt: string,
  provider: string | null,
  model: string | null
): PhotoDescriptor {
  const parsed = JSON.parse(stripMarkdownCodeFence(content)) as Record<string, unknown>;

  return {
    garmentType: sanitizeStringOrNull(parsed.garmentType),
    primaryColor: sanitizeStringOrNull(parsed.primaryColor),
    secondaryColor: sanitizeStringOrNull(parsed.secondaryColor),
    pattern: sanitizeStringOrNull(parsed.pattern),
    visibleBrand: sanitizeStringOrNull(parsed.visibleBrand),
    backgroundType: sanitizeStringOrNull(parsed.backgroundType),
    presentationType: sanitizeStringOrNull(parsed.presentationType),
    confidence: sanitizeConfidence(parsed.confidence),
    provider,
    model,
    extractedAt: createdAt,
  };
}

class OllamaPhotoDescriptorService implements PhotoDescriptorService {
  async extract(
    input: PhotoDescriptorImageInput
  ): Promise<PhotoDescriptorExtractionResult> {
    try {
      const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOllamaGroupingModel(),
          messages: [
            {
              role: "user",
              content: buildPrompt(input),
              images: [Buffer.from(input.bytes).toString("base64")],
            },
          ],
          format: descriptorSchema,
          options: {
            // Keep vision prompts out of Ollama's retained prefix window.
            num_keep: 0,
            temperature: 0,
          },
          think: false,
          stream: false,
        }),
        signal: AbortSignal.timeout(getOllamaTimeoutMs()),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status}).`);
      }

      const payload = (await response.json()) as OllamaChatResponse;
      const content = payload.message?.content;

      if (!content) {
        throw new Error("Ollama returned an empty descriptor response.");
      }

      return {
        descriptor: parseDescriptor(
          content,
          payload.created_at || new Date().toISOString(),
          "ollama",
          payload.model || getOllamaGroupingModel()
        ),
        provider: "ollama",
        model: payload.model || getOllamaGroupingModel(),
      };
    } catch {
      const descriptor = buildFallbackDescriptor(input.photoAsset);

      return {
        descriptor,
        provider: null,
        model: null,
      };
    }
  }
}

export const ollamaPhotoDescriptorService = new OllamaPhotoDescriptorService();
