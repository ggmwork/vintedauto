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
    id: "qwen2.5vl:3b",
    label: "Qwen2.5 VL 3B",
    sizeLabel: "3.2GB",
    vision: true,
    recommendedFor: ["grouping", "listing"],
    note: "Best light vision model for grouping and fast item understanding.",
  },
  {
    id: "qwen2.5vl:7b",
    label: "Qwen2.5 VL 7B",
    sizeLabel: "6.0GB",
    vision: true,
    recommendedFor: ["grouping", "listing"],
    note: "Stronger vision model when you want better grouping and richer extraction.",
  },
  {
    id: "gemma3:4b",
    label: "Gemma 3 4B",
    sizeLabel: "3.3GB",
    vision: true,
    recommendedFor: ["listing"],
    note: "Balanced Google vision model for listing text and price suggestion.",
  },
  {
    id: "gemma3:12b",
    label: "Gemma 3 12B",
    sizeLabel: "8.1GB",
    vision: true,
    recommendedFor: ["listing"],
    note: "Higher quality listing generation if your machine can handle it.",
  },
  {
    id: "gemma3:1b",
    label: "Gemma 3 1B",
    sizeLabel: "815MB",
    vision: false,
    recommendedFor: [],
    note: "Text-only. Not suitable for image-based grouping or listing generation.",
  },
  {
    id: "gemma3:270m",
    label: "Gemma 3 270M",
    sizeLabel: "292MB",
    vision: false,
    recommendedFor: [],
    note: "Text-only. Too small for this image workflow.",
  },
];

export const recommendedOllamaPresets: OllamaPreset[] = [
  {
    id: "light-local",
    label: "Light local",
    description: "Fastest useful local setup for this app.",
    listingModel: "gemma3:4b",
    groupingModel: "qwen2.5vl:3b",
    listingMaxImages: 4,
  },
  {
    id: "balanced-local",
    label: "Balanced local",
    description: "Better listing quality without going heavy.",
    listingModel: "qwen2.5vl:7b",
    groupingModel: "qwen2.5vl:3b",
    listingMaxImages: 4,
  },
  {
    id: "higher-quality-local",
    label: "Higher quality local",
    description: "Use stronger local models when VRAM and latency are acceptable.",
    listingModel: "gemma3:12b",
    groupingModel: "qwen2.5vl:7b",
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
