import {
  buildFallbackDescriptorResult,
  buildPhotoDescriptorPrompt,
  parseDescriptorFromText,
  parseDescriptorFromValue,
  photoDescriptorSchema,
} from "@/lib/grouping/photo-descriptor-shared";
import type {
  PhotoDescriptorImageInput,
  PhotoDescriptorService,
} from "@/lib/grouping/photo-descriptor-service";
import {
  getAnthropicBaseUrl,
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

class AnthropicPhotoDescriptorService implements PhotoDescriptorService {
  async extract(input: PhotoDescriptorImageInput) {
    try {
      const model = requireProviderModel("grouping", "anthropic");
      const apiKey = requireProviderApiKey("anthropic");
      const response = await fetch(`${getAnthropicBaseUrl()}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system:
            "You extract compact grouping descriptors from clothing photos. Use the provided tool and return structured data only.",
          tools: [
            {
              name: "emit_photo_descriptor",
              description:
                "Emit compact grouping descriptors that match the schema exactly.",
              input_schema: photoDescriptorSchema,
              strict: true,
            },
          ],
          tool_choice: {
            type: "tool",
            name: "emit_photo_descriptor",
          },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: normalizeVisionMediaType(
                      input.photoAsset.originalFilename,
                      input.photoAsset.contentType
                    ),
                    data: toBase64(input.bytes),
                  },
                },
                {
                  type: "text",
                  text: buildPhotoDescriptorPrompt(input),
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(getProviderTimeoutMs("anthropic", "grouping")),
      });

      if (!response.ok) {
        throw new Error(`Anthropic request failed (${response.status}).`);
      }

      const payload = (await response.json()) as AnthropicMessagesApiResponse;
      const toolBlock = payload.content?.find(
        (block) =>
          block.type === "tool_use" && block.name === "emit_photo_descriptor"
      );

      if (toolBlock?.input && typeof toolBlock.input === "object") {
        return {
          descriptor: parseDescriptorFromValue(
            toolBlock.input,
            new Date().toISOString(),
            "anthropic",
            payload.model || model
          ),
          provider: "anthropic",
          model: payload.model || model,
        };
      }

      const textBlock = payload.content?.find(
        (block) => block.type === "text" && typeof block.text === "string"
      );

      if (textBlock?.text) {
        return {
          descriptor: parseDescriptorFromText(
            textBlock.text,
            new Date().toISOString(),
            "anthropic",
            payload.model || model
          ),
          provider: "anthropic",
          model: payload.model || model,
        };
      }

      throw new Error("Anthropic returned an empty descriptor response.");
    } catch {
      return buildFallbackDescriptorResult(input);
    }
  }
}

export const anthropicPhotoDescriptorService =
  new AnthropicPhotoDescriptorService();
