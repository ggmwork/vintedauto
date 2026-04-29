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

class OllamaPhotoDescriptorService implements PhotoDescriptorService {
  async extract(input: PhotoDescriptorImageInput) {
    try {
      const model = requireProviderModel("grouping", "ollama");
      const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: buildPhotoDescriptorPrompt(input),
              images: [Buffer.from(input.bytes).toString("base64")],
            },
          ],
          format: photoDescriptorSchema,
          options: {
            num_keep: 0,
            temperature: 0,
          },
          think: false,
          stream: false,
        }),
        signal: AbortSignal.timeout(getProviderTimeoutMs("ollama", "grouping")),
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
        descriptor: parseDescriptorFromText(
          content,
          payload.created_at || new Date().toISOString(),
          "ollama",
          payload.model || model
        ),
        provider: "ollama",
        model: payload.model || model,
      };
    } catch {
      return buildFallbackDescriptorResult(input);
    }
  }
}

export const ollamaPhotoDescriptorService = new OllamaPhotoDescriptorService();
