export const appConfig = {
  name: "Vinted Auto",
  description:
    "Desktop-first Vinted listing workspace for draft creation, image analysis, and AI-assisted pricing.",
  ai: {
    defaultProvider: "ollama",
    defaultOllamaModel: "qwen3.5:4b",
  },
} as const;
