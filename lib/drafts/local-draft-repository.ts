import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  Draft,
  DraftDetail,
  DraftImage,
  DraftMetadata,
} from "@/types/draft";
import type { GenerationResult } from "@/types/generation";

import type {
  CreateDraftInput,
  DraftRepository,
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

function toDraftSummary(draft: DraftDetail): Draft {
  return {
    id: draft.id,
    status: draft.status,
    title: draft.title,
    description: draft.description,
    keywords: draft.keywords,
    metadata: draft.metadata,
    priceSuggestion: draft.priceSuggestion,
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
    drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
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

function normalizeImages(images: DraftImage[]): DraftImage[] {
  return images
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image, index) => ({
      ...image,
      sortOrder: index,
    }));
}

function applyGenerationResult(
  draft: DraftDetail,
  generation: GenerationResult
): DraftDetail {
  return {
    ...draft,
    title: generation.content.title,
    description: generation.content.description,
    keywords: generation.content.keywords,
    metadata: mergeMetadata(
      draft.metadata,
      generation.content.suggestedMetadata
    ),
    priceSuggestion: generation.priceSuggestion,
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
}

export const localDraftRepository = new LocalDraftRepository();
