import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  IntakeFolderConfig,
  PhotoAsset,
  StudioSession,
  StudioSessionDetail,
  StudioSessionStatus,
} from "@/types/intake";

import type {
  CreateStudioSessionInput,
  SavePhotoAssetsInput,
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
    ...overrides,
  };
}

function normalizePhotoAssets(photoAssets: PhotoAsset[]) {
  return photoAssets
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((photoAsset, index) => ({
      ...photoAsset,
      sortOrder: index,
    }));
}

function toStudioSessionSummary(session: StudioSessionDetail): StudioSession {
  const photoAssets = normalizePhotoAssets(session.photoAssets);

  return {
    id: session.id,
    name: session.name,
    status: session.status,
    intakeConfig: session.intakeConfig,
    photoCount: photoAssets.length,
    unassignedPhotoCount: photoAssets.filter(
      (photoAsset) => photoAsset.organizationStatus === "unassigned"
    ).length,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
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
  const photoAssets = normalizePhotoAssets(
    Array.isArray(candidate.photoAssets) ? candidate.photoAssets : []
  );
  const normalizedSession: StudioSessionDetail = {
    id: typeof candidate.id === "string" ? candidate.id : randomUUID(),
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
    photoCount: photoAssets.length,
    unassignedPhotoCount: photoAssets.filter(
      (photoAsset) => photoAsset.organizationStatus === "unassigned"
    ).length,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
    photoAssets,
  };

  return normalizedSession;
}

function updateStudioSessionTimestamp(
  session: StudioSessionDetail
): StudioSessionDetail {
  const photoAssets = normalizePhotoAssets(session.photoAssets);

  return {
    ...session,
    photoAssets,
    photoCount: photoAssets.length,
    unassignedPhotoCount: photoAssets.filter(
      (photoAsset) => photoAsset.organizationStatus === "unassigned"
    ).length,
    updatedAt: new Date().toISOString(),
  };
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

    return (
      store.sessions.find((session) => session.id === id) ?? null
    );
  }

  async create(
    input: CreateStudioSessionInput
  ): Promise<StudioSessionDetail> {
    const store = await readStudioSessionStore();
    const now = new Date().toISOString();
    const nextSession: StudioSessionDetail = {
      id: randomUUID(),
      name: createSessionName(input.name),
      status: input.status ?? ("needs_stocking" satisfies StudioSessionStatus),
      intakeConfig: createDefaultIntakeConfig(input.intakeConfig),
      photoCount: 0,
      unassignedPhotoCount: 0,
      createdAt: now,
      updatedAt: now,
      photoAssets: [],
    };

    store.sessions.unshift(nextSession);
    await writeStudioSessionStore(store);

    return nextSession;
  }

  async attachPhotoAssets(
    input: SavePhotoAssetsInput
  ): Promise<StudioSessionDetail> {
    const store = await readStudioSessionStore();
    const sessionIndex = store.sessions.findIndex(
      (session) => session.id === input.sessionId
    );

    if (sessionIndex === -1) {
      throw new Error(`Studio session not found: ${input.sessionId}`);
    }

    const currentSession = store.sessions[sessionIndex];
    const nextSession = updateStudioSessionTimestamp({
      ...currentSession,
      status: "needs_stocking",
      photoAssets: input.photoAssets,
    });

    store.sessions[sessionIndex] = nextSession;
    await writeStudioSessionStore(store);

    return nextSession;
  }
}

export const localStudioSessionRepository = new LocalStudioSessionRepository();
