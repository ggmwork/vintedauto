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
  getOpenAiBaseUrl,
  getProviderTimeoutMs,
  requireProviderApiKey,
  requireProviderModel,
} from "@/lib/ai/provider-config";
import { toDataUrl } from "@/lib/ai/vision-input";

interface OpenAIResponsesApiResponse {
  model?: string;
  created_at?: string | number;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

function extractOpenAiOutputText(payload: OpenAIResponsesApiResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const textBlocks =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => typeof item.text === "string")
      .map((item) => item.text!.trim())
      .filter(Boolean) ?? [];

  if (textBlocks.length === 0) {
    throw new Error("OpenAI returned an empty response.");
  }

  return textBlocks.join("\n");
}

class OpenAiListingGenerationService implements ListingGenerationService {
  async generate(input: ListingGenerationInput) {
    if (input.images.length === 0) {
      throw new Error("At least one image is required for generation.");
    }

    const model = requireProviderModel("listing", "openai");
    const apiKey = requireProviderApiKey("openai");
    const selectedImages = selectRepresentativeImages(
      input.images,
      getListingMaxImages()
    );

    const response = await fetch(`${getOpenAiBaseUrl()}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You generate Vinted listing drafts from product photos and must return structured data only.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildListingPrompt(
                  {
                    ...input,
                    images: selectedImages,
                  },
                  input.images.length
                ),
              },
              ...selectedImages.map((image) => ({
                type: "input_image" as const,
                image_url: toDataUrl(
                  image.originalFilename,
                  image.contentType,
                  image.bytes
                ),
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "listing_generation",
            schema: listingGenerationSchema,
            strict: true,
          },
        },
      }),
      signal: AbortSignal.timeout(getProviderTimeoutMs("openai", "listing")),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `OpenAI request failed (${response.status}): ${errorText || "unknown error"}`
      );
    }

    const payload = (await response.json()) as OpenAIResponsesApiResponse;

    return buildCanonicalGenerationResult(
      "openai",
      payload.model || model,
      resolveGeneratedAt(payload.created_at),
      parseStructuredPayload(extractOpenAiOutputText(payload)),
      input.metadata
    );
  }
}

export const openAiListingGenerationService =
  new OpenAiListingGenerationService();
