import type {
  DraftVintedCategoryPlan,
  DraftVintedFieldValue,
  DraftVintedProfileState,
  VintedDynamicFieldDefinition,
  VintedProfileFieldKey,
  VintedResolvedListingProfile,
} from "@/types/vinted-profile";

const DEFAULT_MARKET = "vinted.pt";

const GENERIC_APPAREL_FIELDS: VintedDynamicFieldDefinition[] = [
  {
    key: "logistics.packageSize",
    label: "Package size",
    section: "logistics",
    valueType: "single_select",
    description:
      "Choose the Vinted shipping size so the handoff can complete the delivery step too.",
    required: true,
    recommended: true,
    options: [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
  },
  {
    key: "compliance.aiGeneratedPhotos",
    label: "AI-generated photos",
    section: "compliance",
    valueType: "boolean",
    description:
      "Turn this on only if the uploaded product photos themselves were generated or materially altered by AI.",
    required: false,
    recommended: false,
  },
];

const SHIRT_MEASUREMENT_FIELDS: VintedDynamicFieldDefinition[] = [
  {
    key: "measurements.shoulderWidthCm",
    label: "Shoulder width",
    section: "measurements",
    valueType: "number",
    description:
      "Optional PT measurement field shown after category selection for shirts and tops.",
    required: false,
    recommended: true,
    placeholder: "46",
    unit: "cm",
  },
  {
    key: "measurements.lengthCm",
    label: "Length",
    section: "measurements",
    valueType: "number",
    description:
      "Optional PT measurement field shown after category selection for shirts and tops.",
    required: false,
    recommended: true,
    placeholder: "74",
    unit: "cm",
  },
];

const PROFILE_CATALOG: VintedResolvedListingProfile[] = [
  {
    market: DEFAULT_MARKET,
    profileKey: "generic_apparel_pt",
    label: "Generic PT apparel",
    description:
      "Fallback PT apparel profile for drafts that still need the later Vinted listing controls.",
    categoryMatchers: [],
    categoryPlan: {
      searchQuery: null,
      path: [],
    },
    dynamicFields: GENERIC_APPAREL_FIELDS,
  },
  {
    market: DEFAULT_MARKET,
    profileKey: "mens_shirts_pt",
    label: "PT mens shirts",
    description:
      "PT apparel profile for shirts. Includes category path and the extra measurement prompts Vinted shows after category fill.",
    categoryMatchers: [
      "men's shirts",
      "mens shirts",
      "shirt",
      "shirts",
      "camisa",
      "camisas",
    ],
    categoryPlan: {
      searchQuery: "Camisas",
      path: ["Homem", "Roupa", "Tops e t-shirts", "Camisas"],
    },
    dynamicFields: [...GENERIC_APPAREL_FIELDS, ...SHIRT_MEASUREMENT_FIELDS],
  },
  {
    market: DEFAULT_MARKET,
    profileKey: "coats_jackets_pt",
    label: "PT coats and jackets",
    description:
      "PT apparel profile for coats, jackets, and blazers.",
    categoryMatchers: [
      "coats & jackets",
      "coat",
      "coats",
      "jacket",
      "jackets",
      "blazer",
      "blazers",
      "casaco",
      "casacos",
    ],
    categoryPlan: {
      searchQuery: "Casacos",
      path: ["Homem", "Roupa", "Casacos", "Casacos"],
    },
    dynamicFields: GENERIC_APPAREL_FIELDS,
  },
];

const FIELD_DEFINITION_LOOKUP = Object.fromEntries(
  PROFILE_CATALOG.flatMap((profile) =>
    profile.dynamicFields.map((field) => [field.key, field])
  )
) as Record<VintedProfileFieldKey, VintedDynamicFieldDefinition>;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFieldValue(value: unknown): DraftVintedFieldValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return null;
}

function normalizeCategoryPlan(value: unknown): DraftVintedCategoryPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DraftVintedCategoryPlan>;

  return {
    searchQuery:
      typeof candidate.searchQuery === "string" && candidate.searchQuery.trim().length > 0
        ? candidate.searchQuery.trim()
        : null,
    path: Array.isArray(candidate.path)
      ? candidate.path
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
  };
}

export function createDefaultDraftVintedProfileState(): DraftVintedProfileState {
  return {
    market: DEFAULT_MARKET,
    profileKey: null,
    categoryPlan: null,
    fieldValues: {},
  };
}

export function normalizeDraftVintedProfileState(
  value: unknown
): DraftVintedProfileState {
  if (!value || typeof value !== "object") {
    return createDefaultDraftVintedProfileState();
  }

  const candidate = value as Partial<DraftVintedProfileState>;

  return {
    market: candidate.market === DEFAULT_MARKET ? candidate.market : DEFAULT_MARKET,
    profileKey: typeof candidate.profileKey === "string" ? candidate.profileKey : null,
    categoryPlan: normalizeCategoryPlan(candidate.categoryPlan),
    fieldValues:
      candidate.fieldValues && typeof candidate.fieldValues === "object"
        ? Object.fromEntries(
            Object.entries(candidate.fieldValues).map(([key, entry]) => [
              key,
              normalizeFieldValue(entry),
            ])
          )
        : {},
  };
}

export function getVintedProfileCatalog() {
  return PROFILE_CATALOG.slice();
}

export function getVintedFieldDefinition(
  fieldKey: VintedProfileFieldKey
): VintedDynamicFieldDefinition {
  return FIELD_DEFINITION_LOOKUP[fieldKey];
}

export function buildVintedFieldFormName(fieldKey: VintedProfileFieldKey) {
  return `vintedField__${fieldKey.replace(/\./g, "__")}`;
}

export function buildVintedFieldPresenceName(fieldKey: VintedProfileFieldKey) {
  return `vintedFieldPresent__${fieldKey.replace(/\./g, "__")}`;
}

export function parseVintedCategoryPathInput(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(">")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatVintedCategoryPathInput(
  categoryPlan: DraftVintedCategoryPlan | null
) {
  if (!categoryPlan || categoryPlan.path.length === 0) {
    return "";
  }

  return categoryPlan.path.join(" > ");
}

function findProfileByKey(profileKey: string | null) {
  if (!profileKey) {
    return null;
  }

  return PROFILE_CATALOG.find((profile) => profile.profileKey === profileKey) ?? null;
}

function inferProfileByCategory(category: string | null) {
  const normalizedCategory = normalizeText(category);

  if (!normalizedCategory) {
    return PROFILE_CATALOG[0];
  }

  const matchedProfile = PROFILE_CATALOG.find(
    (profile) =>
      profile.profileKey !== "generic_apparel_pt" &&
      profile.categoryMatchers.some((matcher) =>
        normalizedCategory.includes(normalizeText(matcher))
      )
  );

  return matchedProfile ?? PROFILE_CATALOG[0];
}

function cloneCategoryPlan(
  categoryPlan: DraftVintedCategoryPlan
): DraftVintedCategoryPlan {
  return {
    searchQuery: categoryPlan.searchQuery,
    path: categoryPlan.path.slice(),
  };
}

export function resolveVintedListingProfile(options: {
  category: string | null;
  state?: DraftVintedProfileState | null;
}): VintedResolvedListingProfile {
  const preferredProfile = findProfileByKey(options.state?.profileKey ?? null);
  const inferredProfile = inferProfileByCategory(options.category);

  if (preferredProfile && !options.category?.trim()) {
    return {
      ...preferredProfile,
      categoryPlan: cloneCategoryPlan(preferredProfile.categoryPlan),
      dynamicFields: preferredProfile.dynamicFields.slice(),
    };
  }

  if (
    preferredProfile &&
    preferredProfile.profileKey === inferredProfile.profileKey
  ) {
    return {
      ...preferredProfile,
      categoryPlan: cloneCategoryPlan(preferredProfile.categoryPlan),
      dynamicFields: preferredProfile.dynamicFields.slice(),
    };
  }

  return {
    ...inferredProfile,
    categoryPlan: cloneCategoryPlan(inferredProfile.categoryPlan),
    dynamicFields: inferredProfile.dynamicFields.slice(),
  };
}

export function hydrateDraftVintedProfileState(options: {
  category: string | null;
  state?: DraftVintedProfileState | null;
}): DraftVintedProfileState {
  const normalizedState = normalizeDraftVintedProfileState(options.state);
  const resolvedProfile = resolveVintedListingProfile({
    category: options.category,
    state: normalizedState,
  });

  return {
    market: normalizedState.market,
    profileKey: resolvedProfile.profileKey,
    categoryPlan:
      normalizedState.categoryPlan &&
      (normalizedState.categoryPlan.searchQuery || normalizedState.categoryPlan.path.length > 0)
        ? {
            searchQuery: normalizedState.categoryPlan.searchQuery,
            path: normalizedState.categoryPlan.path.slice(),
          }
        : cloneCategoryPlan(resolvedProfile.categoryPlan),
    fieldValues: {
      ...normalizedState.fieldValues,
    },
  };
}

export function coerceDraftVintedFieldValue(
  definition: VintedDynamicFieldDefinition,
  rawValue: FormDataEntryValue | null
): DraftVintedFieldValue {
  if (definition.valueType === "boolean") {
    if (rawValue === null) {
      return false;
    }

    if (typeof rawValue === "string") {
      return rawValue === "true" || rawValue === "on" || rawValue === "1";
    }

    return false;
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  if (definition.valueType === "number") {
    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
  }

  return trimmed;
}

export function isDraftVintedFieldValueMissing(
  definition: VintedDynamicFieldDefinition,
  state: DraftVintedProfileState
) {
  const value = state.fieldValues[definition.key];

  if (definition.valueType === "boolean") {
    return value === null || value === undefined;
  }

  if (typeof value === "number") {
    return Number.isNaN(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return value === null || value === undefined;
}

export function getVintedProfileMissingFieldKeys(
  profile: VintedResolvedListingProfile,
  state: DraftVintedProfileState
) {
  return profile.dynamicFields
    .filter(
      (fieldDefinition) =>
        fieldDefinition.required &&
        isDraftVintedFieldValueMissing(fieldDefinition, state)
    )
    .map((fieldDefinition) => fieldDefinition.key);
}

export function formatVintedFieldValue(
  definition: VintedDynamicFieldDefinition,
  value: DraftVintedFieldValue
) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  if (definition.valueType === "boolean") {
    return value === true ? "Yes" : "No";
  }

  if (definition.valueType === "number" && typeof value === "number") {
    return definition.unit ? `${value} ${definition.unit}` : String(value);
  }

  if (definition.valueType === "single_select" && typeof value === "string") {
    const option = definition.options?.find((entry) => entry.value === value);
    return option?.label ?? value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}
