import {
  buildFallbackDescriptorResult,
  buildPhotoDescriptorPrompt,
  parseDescriptorFromText,
  photoDescriptorSchema,
} from "@/lib/grouping/photo-descriptor-shared";
import type {
  PhotoDescriptorImageInput,
  PhotoDescriptorService,
} from "@/lib/grouping/photo-descriptor-service";
import {
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
    throw new Error("OpenAI returned an empty descriptor response.");
  }

  return textBlocks.join("\n");
}

function resolveGeneratedAt(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  return new Date().toISOString();
}

class OpenAiPhotoDescriptorService implements PhotoDescriptorService {
  async extract(input: PhotoDescriptorImageInput) {
    try {
      const model = requireProviderModel("grouping", "openai");
      const apiKey = requireProviderApiKey("openai");
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
                "You extract compact grouping descriptors from clothing photos and must return structured data only.",
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildPhotoDescriptorPrompt(input),
                },
                {
                  type: "input_image",
                  image_url: toDataUrl(
                    input.photoAsset.originalFilename,
                    input.photoAsset.contentType,
                    input.bytes
                  ),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "photo_descriptor",
              schema: photoDescriptorSchema,
              strict: true,
            },
          },
        }),
        signal: AbortSignal.timeout(getProviderTimeoutMs("openai", "grouping")),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}).`);
      }

      const payload = (await response.json()) as OpenAIResponsesApiResponse;
      const content = extractOpenAiOutputText(payload);

      return {
        descriptor: parseDescriptorFromText(
          content,
          resolveGeneratedAt(payload.created_at),
          "openai",
          payload.model || model
        ),
        provider: "openai",
        model: payload.model || model,
      };
    } catch {
      return buildFallbackDescriptorResult(input);
    }
  }
}

export const openAiPhotoDescriptorService = new OpenAiPhotoDescriptorService();
