export type PriceConfidence = "low" | "medium" | "high";

export interface PriceSuggestion {
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: "EUR";
  rationale: string;
  confidence: PriceConfidence;
}
