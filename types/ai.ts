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
