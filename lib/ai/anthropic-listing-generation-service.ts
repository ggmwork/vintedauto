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
  getAnthropicBaseUrl,
  getListingMaxImages,
  getProviderTimeoutMs,
  requireProviderApiKey,
  requireProviderModel,
} from "@/lib/ai/provider-config";
import { normalizeVisionMediaType, toBase64 } from "@/lib/ai/vision-input";

interface AnthropicMessageBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicMessagesApiResponse {
  model?: string;
  content?: AnthropicMessageBlock[];
}

function extractAnthropicToolInput(payload: AnthropicMessagesApiResponse) {
  const toolBlock = payload.content?.find(
    (block) => block.type === "tool_use" && block.name === "emit_listing"
  );

  if (toolBlock?.input && typeof toolBlock.input === "object") {
    return toolBlock.input;
  }

  const textBlock = payload.content?.find(
    (block) => block.type === "text" && typeof block.text === "string"
  );

  if (textBlock?.text) {
    return parseStructuredPayload(textBlock.text);
  }

  throw new Error("Anthropic returned no structured listing payload.");
}

class AnthropicListingGenerationService implements ListingGenerationService {
  async generate(input: ListingGenerationInput) {
    if (input.images.length === 0) {
      throw new Error("At least one image is required for generation.");
    }

    const model = requireProviderModel("listing", "anthropic");
    const apiKey = requireProviderApiKey("anthropic");
    const selectedImages = selectRepresentativeImages(
      input.images,
      getListingMaxImages()
    );

    const response = await fetch(`${getAnthropicBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system:
          "You generate Vinted listing drafts from product photos. Use the provided tool and return structured data only.",
        tools: [
          {
            name: "emit_listing",
            description:
              "Emit a complete Vinted listing payload that matches the schema exactly.",
            input_schema: listingGenerationSchema,
            strict: true,
          },
        ],
        tool_choice: {
          type: "tool",
          name: "emit_listing",
        },
        messages: [
          {
            role: "user",
            content: [
              ...selectedImages.map((image) => ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: normalizeVisionMediaType(
                    image.originalFilename,
                    image.contentType
                  ),
                  data: toBase64(image.bytes),
                },
              })),
              {
                type: "text" as const,
                text: buildListingPrompt(
                  {
                    ...input,
                    images: selectedImages,
                  },
                  input.images.length
                ),
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(getProviderTimeoutMs("anthropic", "listing")),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Anthropic request failed (${response.status}): ${errorText || "unknown error"}`
      );
    }

    const payload = (await response.json()) as AnthropicMessagesApiResponse;

    return buildCanonicalGenerationResult(
      "anthropic",
      payload.model || model,
      resolveGeneratedAt(null),
      extractAnthropicToolInput(payload),
      input.metadata
    );
  }
}

export const anthropicListingGenerationService =
  new AnthropicListingGenerationService();
