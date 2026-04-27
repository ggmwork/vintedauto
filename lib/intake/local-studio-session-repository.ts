import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  IntakeFolderConfig,
  PhotoAsset,
  StockItem,
  StudioSession,
  StudioSessionDetail,
  StudioSessionStatus,
} from "@/types/intake";

import type {
  AssignPhotoAssetsToStockItemInput,
  AttachDraftToStockItemInput,
  CreateStockItemInput,
  CreateStudioSessionInput,
  ReleasePhotoAssetsFromStockItemInput,
  RemoveStockItemInput,
  RenameStockItemInput,
  SavePhotoAssetsInput,
  SetStockItemCoverPhotoInput,
  StudioSessionRepository,
} from "./studio-session-repository";

interface StudioSessionStore {
  sessions: StudioSessionDetail[];
}

const dataDirectory = path.join(process.cwd(), ".data");
const studioSessionsFilePath = path.join(dataDirectory, "studio-sessions.json");

function createDefaultIntakeConfig(
  overrides?: Partial<IntakeFolderConfig>
): IntakeFolderConfig {
  return {
    sourceType: "local-folder",
    startMode: "manual",
    folderLabel: null,
    folderPath: null,
    ...overrides,
  };
}

function createSessionName(value: string | null | undefined) {
  if (value?.trim()) {
    return value.trim();
  }

  const timestamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return `Studio session ${timestamp}`;
}

function createStockItemName(
  value: string | null | undefined,
  existingCount: number
) {
  if (value?.trim()) {
    return value.trim();
  }

  return `Stock item ${existingCount + 1}`;
}

function uniqueStringIds(values: string[]) {
  return Array.from(
    new Set(values.filter((value) => typeof value === "string" && value.length > 0))
  );
}

function normalizePhotoAssets(photoAssets: PhotoAsset[]) {
  return photoAssets
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((photoAsset, index) => {
      const stockItemId =
        typeof photoAsset.stockItemId === "string" && photoAsset.stockItemId.length > 0
          ? photoAsset.stockItemId
          : null;

      return {
        ...photoAsset,
        sortOrder: index,
        sourceFingerprint:
          typeof photoAsset.sourceFingerprint === "string" &&
          photoAsset.sourceFingerprint.length > 0
            ? photoAsset.sourceFingerprint
            : null,
        organizationStatus: stockItemId
          ? ("grouped" as const)
          : ("unassigned" as const),
        stockItemId,
      };
    });
}

function normalizeStockItems(
  stockItems: StockItem[],
  sessionId: string
) {
  return stockItems
    .map((stockItem) => ({
      id: typeof stockItem.id === "string" ? stockItem.id : randomUUID(),
      sessionId,
      name: createStockItemName(stockItem.name, 0),
      coverPhotoAssetId:
        typeof stockItem.coverPhotoAssetId === "string" &&
        stockItem.coverPhotoAssetId.length > 0
          ? stockItem.coverPhotoAssetId
          : null,
      photoAssetIds: uniqueStringIds(
        Array.isArray(stockItem.photoAssetIds) ? stockItem.photoAssetIds : []
      ),
      draftId:
        typeof stockItem.draftId === "string" && stockItem.draftId.length > 0
          ? stockItem.draftId
          : null,
      createdAt:
        typeof stockItem.createdAt === "string"
          ? stockItem.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof stockItem.updatedAt === "string"
          ? stockItem.updatedAt
          : new Date().toISOString(),
    }))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}

function deriveStudioSessionStatus(
  photoAssets: PhotoAsset[],
  stockItems: StockItem[]
): StudioSessionStatus {
  if (
    photoAssets.length > 0 &&
    stockItems.length > 0 &&
    photoAssets.every((photoAsset) => photoAsset.stockItemId !== null)
  ) {
    return "stocked";
  }

  return "needs_stocking";
}

function syncStudioSessionState(session: StudioSessionDetail): StudioSessionDetail {
  const normalizedPhotoAssets = normalizePhotoAssets(session.photoAssets);
  const normalizedStockItems = normalizeStockItems(session.stockItems, session.id);
  const validStockItemIds = new Set(
    normalizedStockItems.map((stockItem) => stockItem.id)
  );

  const photoAssets = normalizedPhotoAssets.map((photoAsset) => {
    const stockItemId =
      photoAsset.stockItemId && validStockItemIds.has(photoAsset.stockItemId)
        ? photoAsset.stockItemId
        : null;

    return {
      ...photoAsset,
      stockItemId,
      organizationStatus: stockItemId
        ? ("grouped" as const)
        : ("unassigned" as const),
    };
  });

  const photoAssetIdsByStockItem = new Map<string, string[]>();

  for (const photoAsset of photoAssets) {
    if (!photoAsset.stockItemId) {
      continue;
    }

    const current = photoAssetIdsByStockItem.get(photoAsset.stockItemId) ?? [];
    current.push(photoAsset.id);
    photoAssetIdsByStockItem.set(photoAsset.stockItemId, current);
  }

  const stockItems = normalizedStockItems
    .map((stockItem) => {
      const photoAssetIds = photoAssetIdsByStockItem.get(stockItem.id) ?? [];
      const coverPhotoAssetId =
        stockItem.coverPhotoAssetId && photoAssetIds.includes(stockItem.coverPhotoAssetId)
          ? stockItem.coverPhotoAssetId
          : photoAssetIds[0] ?? null;

      return {
        ...stockItem,
        photoAssetIds,
        coverPhotoAssetId,
      };
    })
    .filter((stockItem) => stockItem.photoAssetIds.length > 0 || stockItem.draftId !== null)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );

  return {
    ...session,
    status: deriveStudioSessionStatus(photoAssets, stockItems),
    photoCount: photoAssets.length,
    unassignedPhotoCount: photoAssets.filter(
      (photoAsset) => photoAsset.stockItemId === null
    ).length,
    stockItemCount: stockItems.length,
    draftedStockItemCount: stockItems.filter(
      (stockItem) => stockItem.draftId !== null
    ).length,
    photoAssets,
    stockItems,
  };
}

function toStudioSessionSummary(session: StudioSessionDetail): StudioSession {
  return syncStudioSessionState(session);
}

async function ensureStudioSessionStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(studioSessionsFilePath, "utf8");
  } catch {
    const initialStore: StudioSessionStore = { sessions: [] };
    await writeFile(
      studioSessionsFilePath,
      JSON.stringify(initialStore, null, 2)
    );
  }
}

async function readStudioSessionStore(): Promise<StudioSessionStore> {
  await ensureStudioSessionStoreFile();

  const fileContents = await readFile(studioSessionsFilePath, "utf8");
  const parsed = JSON.parse(fileContents) as Partial<StudioSessionStore>;

  return {
    sessions: Array.isArray(parsed.sessions)
      ? parsed.sessions.map(normalizeStudioSessionDetail)
      : [],
  };
}

async function writeStudioSessionStore(store: StudioSessionStore) {
  await writeFile(studioSessionsFilePath, JSON.stringify(store, null, 2));
}

function normalizeStudioSessionDetail(value: unknown): StudioSessionDetail {
  const candidate = (value && typeof value === "object"
    ? value
    : {}) as Partial<StudioSessionDetail>;
  const sessionId =
    typeof candidate.id === "string" ? candidate.id : randomUUID();
  const normalizedSession: StudioSessionDetail = syncStudioSessionState({
    id: sessionId,
    name: createSessionName(
      typeof candidate.name === "string" ? candidate.name : null
    ),
    status:
      candidate.status === "stocked" || candidate.status === "needs_stocking"
        ? candidate.status
        : "needs_stocking",
    intakeConfig: createDefaultIntakeConfig(
      candidate.intakeConfig && typeof candidate.intakeConfig === "object"
        ? candidate.intakeConfig
        : undefined
    ),
    photoCount: 0,
    unassignedPhotoCount: 0,
    stockItemCount: 0,
    draftedStockItemCount: 0,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
    photoAssets: Array.isArray(candidate.photoAssets) ? candidate.photoAssets : [],
    stockItems: Array.isArray(candidate.stockItems) ? candidate.stockItems : [],
  });

  return normalizedSession;
}

function updateStudioSessionTimestamp(
  session: StudioSessionDetail
): StudioSessionDetail {
  return syncStudioSessionState({
    ...session,
    updatedAt: new Date().toISOString(),
  });
}

function mutatePhotoAssignments(
  session: StudioSessionDetail,
  stockItemId: string,
  photoAssetIds: string[]
) {
  const selectedIds = new Set(uniqueStringIds(photoAssetIds));

  if (selectedIds.size === 0) {
    return session;
  }

  const blockedPhotoAsset = session.photoAssets.find((photoAsset) => {
    if (!selectedIds.has(photoAsset.id) || !photoAsset.stockItemId) {
      return false;
    }

    if (photoAsset.stockItemId === stockItemId) {
      return false;
    }

    const sourceStockItem = session.stockItems.find(
      (entry) => entry.id === photoAsset.stockItemId
    );

    return sourceStockItem?.draftId !== null;
  });

  if (blockedPhotoAsset) {
    throw new Error(
      "Photos already linked to a drafted stock item must stay there. Open the draft instead."
    );
  }

  const now = new Date().toISOString();
  const affectedStockItemIds = new Set<string>([stockItemId]);

  for (const photoAsset of session.photoAssets) {
    if (selectedIds.has(photoAsset.id) && photoAsset.stockItemId) {
      affectedStockItemIds.add(photoAsset.stockItemId);
    }
  }

  const photoAssets = session.photoAssets.map((photoAsset) =>
    selectedIds.has(photoAsset.id)
      ? {
          ...photoAsset,
          stockItemId,
          organizationStatus: "grouped" as const,
        }
      : photoAsset
  );
  const stockItems = session.stockItems.map((stockItem) =>
    affectedStockItemIds.has(stockItem.id)
      ? {
          ...stockItem,
          updatedAt: now,
        }
      : stockItem
  );

  return updateStudioSessionTimestamp({
    ...session,
    photoAssets,
    stockItems,
  });
}

async function mutateStudioSessionStore(
  mutator: (
    store: StudioSessionStore
  ) => StudioSessionStore | Promise<StudioSessionStore>
) {
  const currentStore = await readStudioSessionStore();
  const nextStore = await mutator(currentStore);
  await writeStudioSessionStore(nextStore);
  return nextStore;
}

function findSessionIndex(store: StudioSessionStore, sessionId: string) {
  return store.sessions.findIndex((session) => session.id === sessionId);
}

class LocalStudioSessionRepository implements StudioSessionRepository {
  async list(): Promise<StudioSession[]> {
    const store = await readStudioSessionStore();

    return store.sessions
      .map(toStudioSessionSummary)
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
  }

  async getById(id: string): Promise<StudioSessionDetail | null> {
    const store = await readStudioSessionStore();

    return store.sessions.find((session) => session.id === id) ?? null;
  }

  async create(input: CreateStudioSessionInput): Promise<StudioSessionDetail> {
    const store = await readStudioSessionStore();
    const now = new Date().toISOString();
    const nextSession: StudioSessionDetail = {
      id: randomUUID(),
      name: createSessionName(input.name),
      status: input.status ?? ("needs_stocking" satisfies StudioSessionStatus),
      intakeConfig: createDefaultIntakeConfig(input.intakeConfig),
      photoCount: 0,
      unassignedPhotoCount: 0,
      stockItemCount: 0,
      draftedStockItemCount: 0,
      createdAt: now,
      updatedAt: now,
      photoAssets: [],
      stockItems: [],
    };

    store.sessions.unshift(nextSession);
    await writeStudioSessionStore(store);

    return nextSession;
  }

  async attachPhotoAssets(
    input: SavePhotoAssetsInput
  ): Promise<StudioSessionDetail> {
    const store = await readStudioSessionStore();
    const sessionIndex = findSessionIndex(store, input.sessionId);

    if (sessionIndex === -1) {
      throw new Error(`Studio session not found: ${input.sessionId}`);
    }

    const currentSession = store.sessions[sessionIndex];
    const nextSession = updateStudioSessionTimestamp({
      ...currentSession,
      photoAssets: input.photoAssets,
      stockItems: currentSession.stockItems,
    });

    store.sessions[sessionIndex] = nextSession;
    await writeStudioSessionStore(store);

    return nextSession;
  }

  async createStockItem(input: CreateStockItemInput): Promise<StockItem> {
    let createdStockItemId: string | null = null;

    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const selectedIds = uniqueStringIds(input.photoAssetIds);

      if (selectedIds.length === 0) {
        throw new Error("Select at least one photo before creating a stock item.");
      }

      const now = new Date().toISOString();
      const stockItem: StockItem = {
        id: randomUUID(),
        sessionId: session.id,
        name: createStockItemName(input.name, session.stockItems.length),
        coverPhotoAssetId: selectedIds[0] ?? null,
        photoAssetIds: selectedIds,
        draftId: null,
        createdAt: now,
        updatedAt: now,
      };
      createdStockItemId = stockItem.id;

      const nextSession = mutatePhotoAssignments(
        {
          ...session,
          stockItems: [stockItem, ...session.stockItems],
        },
        stockItem.id,
        selectedIds
      );
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });
    const session = store.sessions.find((entry) => entry.id === input.sessionId);
    const stockItem =
      session?.stockItems.find((entry) => entry.id === createdStockItemId) ?? null;

    if (!stockItem) {
      throw new Error("Stock item was not created correctly.");
    }

    return stockItem;
  }

  async assignPhotoAssetsToStockItem(
    input: AssignPhotoAssetsToStockItemInput
  ): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      if (stockItem.draftId) {
        throw new Error(
          "This stock item already has a draft. Open the draft instead of changing the grouped photos here."
        );
      }

      const nextSession = mutatePhotoAssignments(
        session,
        input.stockItemId,
        input.photoAssetIds
      );
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }

  async removeStockItem(input: RemoveStockItemInput): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      if (stockItem.draftId) {
        throw new Error(
          "This stock item already has a draft linked to it. Keep the stock record and open the draft instead."
        );
      }

      const photoAssets = session.photoAssets.map((photoAsset) =>
        photoAsset.stockItemId === input.stockItemId
          ? {
              ...photoAsset,
              stockItemId: null,
              organizationStatus: "unassigned" as const,
            }
          : photoAsset
      );
      const nextSession = updateStudioSessionTimestamp({
        ...session,
        photoAssets,
        stockItems: session.stockItems.filter(
          (entry) => entry.id !== input.stockItemId
        ),
      });
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }

  async renameStockItem(input: RenameStockItemInput): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      const nextName = input.name.trim();

      if (!nextName) {
        throw new Error("Stock item name cannot be empty.");
      }

      const nextSession = updateStudioSessionTimestamp({
        ...session,
        stockItems: session.stockItems.map((entry) =>
          entry.id === input.stockItemId
            ? {
                ...entry,
                name: nextName,
                updatedAt: new Date().toISOString(),
              }
            : entry
        ),
      });
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }

  async releasePhotoAssetsFromStockItem(
    input: ReleasePhotoAssetsFromStockItemInput
  ): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      if (stockItem.draftId) {
        throw new Error(
          "This stock item already has a draft. Open the draft instead of changing grouped photos here."
        );
      }

      const selectedIds = new Set(uniqueStringIds(input.photoAssetIds));

      if (selectedIds.size === 0) {
        throw new Error("Select at least one photo to move back into Inbox.");
      }

      const photoAssets = session.photoAssets.map((photoAsset) =>
        selectedIds.has(photoAsset.id) && photoAsset.stockItemId === input.stockItemId
          ? {
              ...photoAsset,
              stockItemId: null,
              organizationStatus: "unassigned" as const,
            }
          : photoAsset
      );
      const nextSession = updateStudioSessionTimestamp({
        ...session,
        photoAssets,
        stockItems: session.stockItems.map((entry) =>
          entry.id === input.stockItemId
            ? {
                ...entry,
                updatedAt: new Date().toISOString(),
              }
            : entry
        ),
      });
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }

  async setStockItemCoverPhoto(
    input: SetStockItemCoverPhotoInput
  ): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      if (!stockItem.photoAssetIds.includes(input.photoAssetId)) {
        throw new Error("Cover photo must belong to the selected stock item.");
      }

      const nextSession = updateStudioSessionTimestamp({
        ...session,
        stockItems: session.stockItems.map((entry) =>
          entry.id === input.stockItemId
            ? {
                ...entry,
                coverPhotoAssetId: input.photoAssetId,
                updatedAt: new Date().toISOString(),
              }
            : entry
        ),
      });
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }

  async attachDraftToStockItem(
    input: AttachDraftToStockItemInput
  ): Promise<StudioSessionDetail> {
    const store = await mutateStudioSessionStore((currentStore) => {
      const sessionIndex = findSessionIndex(currentStore, input.sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Studio session not found: ${input.sessionId}`);
      }

      const session = currentStore.sessions[sessionIndex];
      const stockItem = session.stockItems.find(
        (entry) => entry.id === input.stockItemId
      );

      if (!stockItem) {
        throw new Error(`Stock item not found: ${input.stockItemId}`);
      }

      const nextSession = updateStudioSessionTimestamp({
        ...session,
        stockItems: session.stockItems.map((entry) =>
          entry.id === input.stockItemId
            ? {
                ...entry,
                draftId: input.draftId,
                updatedAt: new Date().toISOString(),
              }
            : entry
        ),
      });
      const sessions = currentStore.sessions.slice();
      sessions[sessionIndex] = nextSession;

      return { sessions };
    });

    const session = store.sessions.find((entry) => entry.id === input.sessionId);

    if (!session) {
      throw new Error(`Studio session not found after update: ${input.sessionId}`);
    }

    return session;
  }
}

export const localStudioSessionRepository = new LocalStudioSessionRepository();
