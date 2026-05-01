import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  Draft,
  DraftDetail,
  DraftGenerationInfo,
  DraftImage,
  DraftMetadata,
  DraftVintedHandoffState,
} from "@/types/draft";
import type { GenerationResult } from "@/types/generation";
import type { PriceSuggestion } from "@/types/pricing";
import type {
  VintedFieldDiagnosticPayload,
  VintedFillResultPayload,
} from "@/types/vinted";

import type {
  CreateDraftInput,
  DraftRepository,
  RestoreGenerationInput,
  SaveDraftImagesInput,
  SaveGenerationResultInput,
  UpdateDraftInput,
} from "./draft-repository";

interface DraftStore {
  drafts: DraftDetail[];
}

const dataDirectory = path.join(process.cwd(), ".data");
const draftsFilePath = path.join(dataDirectory, "drafts.json");

function createDefaultMetadata(
  overrides?: Partial<DraftMetadata>
): DraftMetadata {
  return {
    brand: null,
    category: null,
    size: null,
    condition: null,
    color: null,
    material: null,
    notes: null,
    ...overrides,
  };
}

function createDefaultVintedHandoffState(
  overrides?: Partial<DraftVintedHandoffState>
): DraftVintedHandoffState {
  return {
    status: "not_started",
    lastRequestedAt: null,
    lastUpdatedAt: null,
    lastResult: null,
    ...overrides,
  };
}

function toDraftSummary(draft: DraftDetail): Draft {
  return {
    id: draft.id,
    status: draft.status,
    title: draft.title,
    description: draft.description,
    keywords: draft.keywords,
    metadata: draft.metadata,
    priceSuggestion: draft.priceSuggestion,
    generation: draft.generation,
    generationHistory: draft.generationHistory,
    vintedHandoff: draft.vintedHandoff,
    imageCount: draft.imageCount,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

async function ensureDraftStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(draftsFilePath, "utf8");
  } catch {
    const initialStore: DraftStore = { drafts: [] };
    await writeFile(draftsFilePath, JSON.stringify(initialStore, null, 2));
  }
}

async function readDraftStore(): Promise<DraftStore> {
  await ensureDraftStoreFile();

  const fileContents = await readFile(draftsFilePath, "utf8");
  const parsed = JSON.parse(fileContents) as Partial<DraftStore>;

  return {
    drafts: Array.isArray(parsed.drafts)
      ? parsed.drafts.map(normalizeDraftDetail)
      : [],
  };
}

async function writeDraftStore(store: DraftStore) {
  await writeFile(draftsFilePath, JSON.stringify(store, null, 2));
}

function mergeMetadata(
  current: DraftMetadata,
  updates?: Partial<DraftMetadata>
): DraftMetadata {
  if (!updates) {
    return current;
  }

  return {
    ...current,
    ...updates,
  };
}

function updateDraftTimestamp(draft: DraftDetail): DraftDetail {
  return {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeImages(images: DraftImage[]): DraftImage[] {
  return images
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image, index) => ({
      ...image,
      sortOrder: index,
    }));
}

function normalizePriceSuggestion(
  value: unknown,
  fallbackCurrency: PriceSuggestion["currency"] = "EUR"
): PriceSuggestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PriceSuggestion>;

  return {
    amount: typeof candidate.amount === "number" ? candidate.amount : null,
    minAmount:
      typeof candidate.minAmount === "number" ? candidate.minAmount : null,
    maxAmount:
      typeof candidate.maxAmount === "number" ? candidate.maxAmount : null,
    currency:
      typeof candidate.currency === "string" ? candidate.currency : fallbackCurrency,
    rationale:
      typeof candidate.rationale === "string"
        ? candidate.rationale
        : "No pricing rationale saved yet.",
    confidence:
      candidate.confidence === "high" ||
      candidate.confidence === "medium" ||
      candidate.confidence === "low"
        ? candidate.confidence
        : "medium",
  };
}

function normalizeVintedFillResult(
  value: unknown
): VintedFillResultPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<VintedFillResultPayload>;

  return {
    status:
      candidate.status === "success" ||
      candidate.status === "partial_success" ||
      candidate.status === "failure"
        ? candidate.status
        : "failure",
    filledFields: normalizeStringArray(candidate.filledFields),
    skippedFields: normalizeStringArray(candidate.skippedFields),
    failedFields: normalizeStringArray(candidate.failedFields),
    message:
      typeof candidate.message === "string"
        ? candidate.message
        : "No Vinted fill result message saved yet.",
    debug:
      candidate.debug && typeof candidate.debug === "object"
        ? {
            pageReason:
              typeof candidate.debug.pageReason === "string"
                ? candidate.debug.pageReason
                : null,
            debugLog: normalizeStringArray(candidate.debug.debugLog),
            fieldDiagnostics: normalizeVintedFieldDiagnostics(
              candidate.debug.fieldDiagnostics
            ),
          }
        : null,
  };
}

function normalizeVintedFieldDiagnostics(
  value: unknown
): Record<string, VintedFieldDiagnosticPayload> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry && typeof entry === "object")
      .map(([key, entry]) => {
        const candidate = entry as Partial<VintedFieldDiagnosticPayload>;

        return [
          key,
          {
            detail:
              typeof candidate.detail === "string"
                ? candidate.detail
                : "No diagnostic detail saved.",
            matchedBy:
              typeof candidate.matchedBy === "string" ? candidate.matchedBy : null,
          },
        ];
      })
  );
}

function normalizeVintedHandoffState(value: unknown): DraftVintedHandoffState {
  if (!value || typeof value !== "object") {
    return createDefaultVintedHandoffState();
  }

  const candidate = value as Partial<DraftVintedHandoffState>;

  return createDefaultVintedHandoffState({
    status:
      candidate.status === "not_started" ||
      candidate.status === "handed_off" ||
      candidate.status === "filled_on_vinted" ||
      candidate.status === "needs_manual_fix" ||
      candidate.status === "fill_failed"
        ? candidate.status
        : "not_started",
    lastRequestedAt: normalizeNullableString(candidate.lastRequestedAt),
    lastUpdatedAt: normalizeNullableString(candidate.lastUpdatedAt),
    lastResult: normalizeVintedFillResult(candidate.lastResult),
  });
}

function normalizeGenerationInfo(
  value: unknown,
  draft: Pick<
    DraftDetail,
    "title" | "description" | "keywords" | "metadata" | "priceSuggestion"
  >,
  fallbackMode: "current" | "empty" = "current"
): DraftGenerationInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DraftGenerationInfo>;

  return {
    provider:
      candidate.provider === "openai" ||
      candidate.provider === "mock" ||
      candidate.provider === "ollama"
        ? candidate.provider
        : "mock",
    model: typeof candidate.model === "string" ? candidate.model : "unknown",
    generatedAt:
      typeof candidate.generatedAt === "string"
        ? candidate.generatedAt
        : new Date().toISOString(),
    conditionNotes:
      typeof candidate.conditionNotes === "string" ? candidate.conditionNotes : null,
    snapshot: {
      title:
        typeof candidate.snapshot?.title === "string"
          ? candidate.snapshot.title
          : fallbackMode === "current"
            ? draft.title ?? ""
            : "",
      description:
        typeof candidate.snapshot?.description === "string"
          ? candidate.snapshot.description
          : fallbackMode === "current"
            ? draft.description ?? ""
            : "",
      keywords: Array.isArray(candidate.snapshot?.keywords)
        ? candidate.snapshot.keywords.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : fallbackMode === "current"
          ? draft.keywords
          : [],
      suggestedMetadata:
        candidate.snapshot?.suggestedMetadata &&
        typeof candidate.snapshot.suggestedMetadata === "object"
          ? candidate.snapshot.suggestedMetadata
          : fallbackMode === "current"
            ? draft.metadata
            : {},
      priceSuggestion:
        normalizePriceSuggestion(
          candidate.snapshot?.priceSuggestion,
          draft.priceSuggestion?.currency ?? "EUR"
        ) ??
        (fallbackMode === "current" ? draft.priceSuggestion : null) ??
        {
          amount: null,
          minAmount: null,
          maxAmount: null,
          currency: "EUR",
          rationale: "No pricing rationale saved yet.",
          confidence: "medium",
        },
    },
  };
}

function normalizeDraftDetail(value: unknown): DraftDetail {
  const candidate = (value && typeof value === "object" ? value : {}) as Partial<DraftDetail>;
  const metadata = createDefaultMetadata(
    candidate.metadata && typeof candidate.metadata === "object"
      ? candidate.metadata
      : undefined
  );
  const images = normalizeImages(Array.isArray(candidate.images) ? candidate.images : []);
  const priceSuggestion = normalizePriceSuggestion(candidate.priceSuggestion);
  const vintedHandoff = normalizeVintedHandoffState(candidate.vintedHandoff);

  const normalizedDraft: DraftDetail = {
    id: typeof candidate.id === "string" ? candidate.id : randomUUID(),
    status:
      candidate.status === "draft" ||
      candidate.status === "ready" ||
      candidate.status === "listed" ||
      candidate.status === "sold"
        ? candidate.status
        : "draft",
    title: normalizeNullableString(candidate.title),
    description: normalizeNullableString(candidate.description),
    keywords: normalizeStringArray(candidate.keywords),
    metadata,
    priceSuggestion,
    generation: null,
    generationHistory: [],
    vintedHandoff,
    imageCount: images.length,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
    images,
  };

  normalizedDraft.generation = normalizeGenerationInfo(
    candidate.generation,
    normalizedDraft,
    "empty"
  );
  normalizedDraft.generationHistory = Array.isArray(candidate.generationHistory)
    ? candidate.generationHistory
        .map((entry) => normalizeGenerationInfo(entry, normalizedDraft, "current"))
        .filter((entry): entry is DraftGenerationInfo => entry !== null)
        .sort(
          (left, right) =>
            new Date(right.generatedAt).getTime() -
            new Date(left.generatedAt).getTime()
        )
    : normalizedDraft.generation
      ? [
          normalizeGenerationInfo(candidate.generation, normalizedDraft, "current") ??
            normalizedDraft.generation,
        ]
      : [];

  return normalizedDraft;
}

function createGenerationInfo(generation: GenerationResult): DraftGenerationInfo {
  return {
    provider: generation.provider,
    model: generation.model,
    generatedAt: generation.generatedAt,
    conditionNotes: generation.content.conditionNotes,
    snapshot: {
      title: generation.content.title,
      description: generation.content.description,
      keywords: generation.content.keywords,
      suggestedMetadata: generation.content.suggestedMetadata,
      priceSuggestion: generation.priceSuggestion,
    },
  };
}

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function arePriceSuggestionsEqual(
  left: PriceSuggestion | null,
  right: PriceSuggestion | null
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.amount === right.amount &&
    left.minAmount === right.minAmount &&
    left.maxAmount === right.maxAmount &&
    left.currency === right.currency &&
    left.rationale === right.rationale &&
    left.confidence === right.confidence
  );
}

function shouldReplaceStringField(
  currentValue: string | null,
  previousGeneratedValue: string | null | undefined
) {
  if (!currentValue?.trim()) {
    return true;
  }

  if (!previousGeneratedValue?.trim()) {
    return false;
  }

  return currentValue.trim() === previousGeneratedValue.trim();
}

function shouldReplaceKeywords(
  currentKeywords: string[],
  previousGeneratedKeywords: string[] | undefined
) {
  if (currentKeywords.length === 0) {
    return true;
  }

  if (!previousGeneratedKeywords || previousGeneratedKeywords.length === 0) {
    return false;
  }

  return areStringArraysEqual(currentKeywords, previousGeneratedKeywords);
}

function shouldReplaceMetadataField(
  currentValue: string | null,
  previousGeneratedValue: string | null | undefined
) {
  if (!currentValue?.trim()) {
    return true;
  }

  if (!previousGeneratedValue?.trim()) {
    return false;
  }

  return currentValue.trim() === previousGeneratedValue.trim();
}

function shouldReplacePriceSuggestion(
  currentSuggestion: PriceSuggestion | null,
  previousGeneratedSuggestion: PriceSuggestion | null | undefined
) {
  if (!currentSuggestion) {
    return true;
  }

  if (!previousGeneratedSuggestion) {
    return false;
  }

  return arePriceSuggestionsEqual(currentSuggestion, previousGeneratedSuggestion);
}

function applyGenerationResult(
  draft: DraftDetail,
  generation: GenerationResult
): DraftDetail {
  const previousSnapshot = draft.generation?.snapshot;
  const nextGenerationInfo = createGenerationInfo(generation);

  return {
    ...draft,
    title: shouldReplaceStringField(draft.title, previousSnapshot?.title)
      ? generation.content.title
      : draft.title,
    description: shouldReplaceStringField(
      draft.description,
      previousSnapshot?.description
    )
      ? generation.content.description
      : draft.description,
    keywords: shouldReplaceKeywords(draft.keywords, previousSnapshot?.keywords)
      ? generation.content.keywords
      : draft.keywords,
    metadata: {
      brand: shouldReplaceMetadataField(
        draft.metadata.brand,
        previousSnapshot?.suggestedMetadata.brand
      )
        ? generation.content.suggestedMetadata.brand ?? draft.metadata.brand
        : draft.metadata.brand,
      category: shouldReplaceMetadataField(
        draft.metadata.category,
        previousSnapshot?.suggestedMetadata.category
      )
        ? generation.content.suggestedMetadata.category ?? draft.metadata.category
        : draft.metadata.category,
      size: shouldReplaceMetadataField(
        draft.metadata.size,
        previousSnapshot?.suggestedMetadata.size
      )
        ? generation.content.suggestedMetadata.size ?? draft.metadata.size
        : draft.metadata.size,
      condition: shouldReplaceMetadataField(
        draft.metadata.condition,
        previousSnapshot?.suggestedMetadata.condition
      )
        ? generation.content.suggestedMetadata.condition ?? draft.metadata.condition
        : draft.metadata.condition,
      color: shouldReplaceMetadataField(
        draft.metadata.color,
        previousSnapshot?.suggestedMetadata.color
      )
        ? generation.content.suggestedMetadata.color ?? draft.metadata.color
        : draft.metadata.color,
      material: shouldReplaceMetadataField(
        draft.metadata.material,
        previousSnapshot?.suggestedMetadata.material
      )
        ? generation.content.suggestedMetadata.material ?? draft.metadata.material
        : draft.metadata.material,
      notes: shouldReplaceMetadataField(
        draft.metadata.notes,
        previousSnapshot?.suggestedMetadata.notes
      )
        ? generation.content.suggestedMetadata.notes ?? draft.metadata.notes
        : draft.metadata.notes,
    },
    priceSuggestion: shouldReplacePriceSuggestion(
      draft.priceSuggestion,
      previousSnapshot?.priceSuggestion
    )
      ? generation.priceSuggestion
      : draft.priceSuggestion,
    generation: nextGenerationInfo,
    generationHistory: [
      nextGenerationInfo,
      ...draft.generationHistory.filter(
        (entry) => entry.generatedAt !== nextGenerationInfo.generatedAt
      ),
    ].slice(0, 12),
  };
}

function applyDraftUpdate(
  draft: DraftDetail,
  update: UpdateDraftInput
): DraftDetail {
  return {
    ...draft,
    status: update.status ?? draft.status,
    title: update.title === undefined ? draft.title : update.title,
    description:
      update.description === undefined ? draft.description : update.description,
    keywords: update.keywords ?? draft.keywords,
    metadata: mergeMetadata(draft.metadata, update.metadata),
    priceSuggestion:
      update.priceSuggestion === undefined
        ? draft.priceSuggestion
        : update.priceSuggestion,
    generation:
      update.generation === undefined ? draft.generation : update.generation,
    generationHistory: draft.generationHistory,
    vintedHandoff: update.vintedHandoff ?? draft.vintedHandoff,
  };
}

async function mutateDraftStore(
  mutator: (store: DraftStore) => DraftStore | Promise<DraftStore>
) {
  const currentStore = await readDraftStore();
  const nextStore = await mutator(currentStore);
  await writeDraftStore(nextStore);
  return nextStore;
}

class LocalDraftRepository implements DraftRepository {
  async list(): Promise<Draft[]> {
    const store = await readDraftStore();

    return store.drafts
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
      .map(toDraftSummary);
  }

  async getById(id: string): Promise<DraftDetail | null> {
    const store = await readDraftStore();
    return store.drafts.find((draft) => draft.id === id) ?? null;
  }

  async create(input: CreateDraftInput): Promise<Draft> {
    const now = new Date().toISOString();

    const draft: DraftDetail = {
      id: randomUUID(),
      status: input.status ?? "draft",
      title: null,
      description: null,
      keywords: [],
      metadata: createDefaultMetadata(input.metadata),
      priceSuggestion: null,
      generation: null,
      generationHistory: [],
      vintedHandoff: createDefaultVintedHandoffState(),
      imageCount: 0,
      createdAt: now,
      updatedAt: now,
      images: [],
    };

    await mutateDraftStore((store) => ({
      drafts: [draft, ...store.drafts],
    }));

    return toDraftSummary(draft);
  }

  async update(id: string, input: UpdateDraftInput): Promise<Draft> {
    const store = await mutateDraftStore((currentStore) => {
      const draftIndex = currentStore.drafts.findIndex((draft) => draft.id === id);

      if (draftIndex === -1) {
        throw new Error(`Draft not found: ${id}`);
      }

      const updatedDraft = updateDraftTimestamp(
        applyDraftUpdate(currentStore.drafts[draftIndex], input)
      );

      const drafts = currentStore.drafts.slice();
      drafts[draftIndex] = updatedDraft;

      return { drafts };
    });

    const draft = store.drafts.find((entry) => entry.id === id);

    if (!draft) {
      throw new Error(`Draft not found after update: ${id}`);
    }

    return toDraftSummary(draft);
  }

  async attachImages(input: SaveDraftImagesInput): Promise<DraftDetail> {
    const store = await mutateDraftStore((currentStore) => {
      const draftIndex = currentStore.drafts.findIndex(
        (draft) => draft.id === input.draftId
      );

      if (draftIndex === -1) {
        throw new Error(`Draft not found: ${input.draftId}`);
      }

      const draft = currentStore.drafts[draftIndex];
      const images = normalizeImages(input.images);
      const updatedDraft = updateDraftTimestamp({
        ...draft,
        images,
        imageCount: images.length,
      });

      const drafts = currentStore.drafts.slice();
      drafts[draftIndex] = updatedDraft;

      return { drafts };
    });

    const draft = store.drafts.find((entry) => entry.id === input.draftId);

    if (!draft) {
      throw new Error(`Draft not found after attaching images: ${input.draftId}`);
    }

    return draft;
  }

  async saveGeneration(input: SaveGenerationResultInput): Promise<DraftDetail> {
    const store = await mutateDraftStore((currentStore) => {
      const draftIndex = currentStore.drafts.findIndex(
        (draft) => draft.id === input.draftId
      );

      if (draftIndex === -1) {
        throw new Error(`Draft not found: ${input.draftId}`);
      }

      const draft = currentStore.drafts[draftIndex];
      const updatedDraft = updateDraftTimestamp(
        applyGenerationResult(draft, input.generation)
      );

      const drafts = currentStore.drafts.slice();
      drafts[draftIndex] = updatedDraft;

      return { drafts };
    });

    const draft = store.drafts.find((entry) => entry.id === input.draftId);

    if (!draft) {
      throw new Error(`Draft not found after saving generation: ${input.draftId}`);
    }

    return draft;
  }

  async restoreGeneration(input: RestoreGenerationInput): Promise<DraftDetail> {
    const store = await mutateDraftStore((currentStore) => {
      const draftIndex = currentStore.drafts.findIndex(
        (draft) => draft.id === input.draftId
      );

      if (draftIndex === -1) {
        throw new Error(`Draft not found: ${input.draftId}`);
      }

      const draft = currentStore.drafts[draftIndex];
      const generationToRestore = draft.generationHistory.find(
        (entry) => entry.generatedAt === input.generatedAt
      );

      if (!generationToRestore) {
        throw new Error(
          `Generation not found for draft ${input.draftId}: ${input.generatedAt}`
        );
      }

      const updatedDraft = updateDraftTimestamp({
        ...draft,
        title: generationToRestore.snapshot.title,
        description: generationToRestore.snapshot.description,
        keywords: generationToRestore.snapshot.keywords,
        metadata: mergeMetadata(
          createDefaultMetadata(),
          generationToRestore.snapshot.suggestedMetadata
        ),
        priceSuggestion: generationToRestore.snapshot.priceSuggestion,
        generation: generationToRestore,
      });

      const drafts = currentStore.drafts.slice();
      drafts[draftIndex] = updatedDraft;

      return { drafts };
    });

    const draft = store.drafts.find((entry) => entry.id === input.draftId);

    if (!draft) {
      throw new Error(
        `Draft not found after restoring generation: ${input.draftId}`
      );
    }

    return draft;
  }
}

export const localDraftRepository = new LocalDraftRepository();
