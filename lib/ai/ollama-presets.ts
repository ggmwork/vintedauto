import "server-only";

import type { AiTask } from "@/types/ai";

export interface OllamaModelProfile {
  id: string;
  label: string;
  sizeLabel: string;
  vision: boolean;
  recommendedFor: AiTask[];
  note: string;
}

export interface OllamaPreset {
  id: "light-local" | "balanced-local" | "higher-quality-local";
  label: string;
  description: string;
  listingModel: string;
  groupingModel: string;
  listingMaxImages: number;
}

export const recommendedOllamaModelProfiles: OllamaModelProfile[] = [
  {
    id: "qwen3-vl:8b",
    label: "Qwen3-VL 8B",
    sizeLabel: "6.1GB",
    vision: true,
    recommendedFor: ["grouping", "listing"],
    note: "Installed local vision model. Best light local pick for grouping and image-aware listing generation.",
  },
  {
    id: "qwen3.5:9b",
    label: "Qwen3.5 9B",
    sizeLabel: "6.6GB",
    vision: true,
    recommendedFor: ["grouping", "listing"],
    note: "Best installed multimodal default. Stronger reasoning and richer extraction while staying local.",
  },
  {
    id: "qwen3:14b",
    label: "Qwen3 14B",
    sizeLabel: "9.3GB",
    vision: false,
    recommendedFor: [],
    note: "Installed local text model. Fine for future text workflows, not for photo grouping or image-based listing generation.",
  },
];

export const recommendedOllamaPresets: OllamaPreset[] = [
  {
    id: "light-local",
    label: "Light local",
    description: "Lightest installed local vision setup.",
    listingModel: "qwen3-vl:8b",
    groupingModel: "qwen3-vl:8b",
    listingMaxImages: 4,
  },
  {
    id: "balanced-local",
    label: "Balanced local",
    description: "Best default with the installed local Ollama models.",
    listingModel: "qwen3.5:9b",
    groupingModel: "qwen3-vl:8b",
    listingMaxImages: 4,
  },
  {
    id: "higher-quality-local",
    label: "Higher quality local",
    description: "Use the stronger multimodal model for both tasks when latency is acceptable.",
    listingModel: "qwen3.5:9b",
    groupingModel: "qwen3.5:9b",
    listingMaxImages: 5,
  },
];

export function getRecommendedOllamaPreset(presetId: string) {
  return recommendedOllamaPresets.find((preset) => preset.id === presetId) ?? null;
}

export function getRecommendedOllamaModelProfile(model: string | null | undefined) {
  const normalized = model?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    recommendedOllamaModelProfiles.find(
      (profile) => profile.id.toLowerCase() === normalized
    ) ?? null
  );
}

export function getOllamaCompatibilityIssue(
  task: AiTask,
  model: string | null | undefined
) {
  const profile = getRecommendedOllamaModelProfile(model);

  if (!profile) {
    return null;
  }

  if (!profile.vision) {
    return `${model} is text-only. ${task} needs a vision-capable model.`;
  }

  return null;
}

export function buildOllamaPullCommand(model: string) {
  return `ollama pull ${model}`;
}
