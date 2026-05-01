export const appConfig = {
  name: "Vinted Auto",
  description:
    "Desktop-first Vinted listing workspace for draft creation, image analysis, and AI-assisted pricing.",
  ai: {
    defaultProvider: "ollama",
    defaultOllamaModel: "qwen3.5:4b",
  },
  vinted: {
    createListingUrl:
      process.env.NEXT_PUBLIC_VINTED_CREATE_LISTING_URL?.trim() ||
      "https://www.vinted.pt/items/new",
  },
} as const;
