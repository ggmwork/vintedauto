export type VintedProfileMarket = "vinted.pt";

export type VintedFieldSection =
  | "category_plan"
  | "measurements"
  | "logistics"
  | "compliance";

export type VintedFieldValueType =
  | "text"
  | "number"
  | "boolean"
  | "single_select";

export type VintedProfileFieldKey =
  | "measurements.shoulderWidthCm"
  | "measurements.lengthCm"
  | "logistics.packageSize"
  | "compliance.aiGeneratedPhotos";

export type DraftVintedFieldValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export interface DraftVintedCategoryPlan {
  searchQuery: string | null;
  path: string[];
}

export interface DraftVintedProfileState {
  market: VintedProfileMarket;
  profileKey: string | null;
  categoryPlan: DraftVintedCategoryPlan | null;
  fieldValues: Record<string, DraftVintedFieldValue>;
}

export interface VintedFieldOption {
  value: string;
  label: string;
}

export interface VintedDynamicFieldDefinition {
  key: VintedProfileFieldKey;
  label: string;
  section: VintedFieldSection;
  valueType: VintedFieldValueType;
  description: string;
  required: boolean;
  recommended: boolean;
  placeholder?: string;
  unit?: string;
  options?: VintedFieldOption[];
}

export interface VintedResolvedListingProfile {
  market: VintedProfileMarket;
  profileKey: string;
  label: string;
  description: string;
  categoryMatchers: string[];
  categoryPlan: DraftVintedCategoryPlan;
  dynamicFields: VintedDynamicFieldDefinition[];
}
