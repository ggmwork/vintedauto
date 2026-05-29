import type { DraftMetadata } from "@/types/draft";
import type { PriceSuggestion } from "@/types/pricing";

export type AiProvider = "ollama" | "openai" | "anthropic" | "local-cli";
export type LocalCliEngine = "codex" | "claude";
export type AiTask = "listing" | "grouping";
export type AiRouterMode = "manual" | "fallback";

export type AiConnectionTestStatus = "idle" | "success" | "failed";

export interface AiProviderTestResult {
  provider: AiProvider;
  status: AiConnectionTestStatus;
  message: string;
  testedAt: string;
}

export interface AiVisionTestResult {
  status: "success" | "failed";
  message: string;
  testedAt: string;
  provider: AiProvider | null;
  model: string | null;
  imageCount: number;
  fileNames: string[];
  title: string | null;
  description: string | null;
  keywords: string[];
  conditionNotes: string | null;
  suggestedMetadata: Partial<DraftMetadata>;
  priceSuggestion: PriceSuggestion | null;
}
