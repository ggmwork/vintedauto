import type {
  ListingGenerationInput,
  ListingGenerationService,
} from "@/lib/ai/listing-generation-service";
import {
  buildCanonicalGenerationResult,
  buildListingPrompt,
  listingGenerationSchema,
  parseStructuredPayload,
  resolveGeneratedAt,
  selectRepresentativeImages,
} from "@/lib/ai/listing-generation-shared";
import {
  getListingMaxImages,
  getListingProviderConfig,
  getOllamaBaseUrl,
  getProviderTimeoutMs,
  requireProviderModel,
} from "@/lib/ai/provider-config";

interface OllamaChatResponse {
  model?: string;
  created_at?: string;
  message?: {
    content?: string;
  };
}

class OllamaListingGenerationService implements ListingGenerationService {
  async generate(input: ListingGenerationInput) {
    if (input.images.length === 0) {
      throw new Error("At least one image is required for generation.");
    }

    const model =
      getListingProviderConfig().provider === "ollama"
        ? requireProviderModel("listing", "ollama")
        : getListingProviderConfig().model ?? requireProviderModel("listing", "ollama");
    const selectedImages = selectRepresentativeImages(
      input.images,
      getListingMaxImages()
    );

    let response: Response;

    try {
      response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: buildListingPrompt(
                {
                  ...input,
                  images: selectedImages,
                },
                input.images.length
              ),
              images: selectedImages.map((image) =>
                Buffer.from(image.bytes).toString("base64")
              ),
            },
          ],
          format: listingGenerationSchema,
          options: {
            num_keep: 0,
            temperature: 0.1,
          },
          think: false,
          stream: false,
        }),
        signal: AbortSignal.timeout(getProviderTimeoutMs("ollama", "listing")),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new Error(
          `Ollama request timed out after ${Math.round(
            getProviderTimeoutMs("ollama", "listing") / 1000
          )}s. Try fewer item photos or raise OLLAMA_TIMEOUT_MS.`
        );
      }

      throw error;
    }

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

    return buildCanonicalGenerationResult(
      "ollama",
      payload.model || model,
      resolveGeneratedAt(payload.created_at),
      parseStructuredPayload(content),
      input.metadata
    );
  }
}

export const ollamaListingGenerationService =
  new OllamaListingGenerationService();
