import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  InboxWatcherSnapshot,
  InboxWatcherState,
} from "@/types/watcher";

const dataDirectory = path.join(process.cwd(), ".data");
const defaultWatchedFolderPath = path.join(process.cwd(), "watched-inbox");
const watcherStateFilePath = path.join(dataDirectory, "inbox-watcher.json");

function createDefaultWatcherState(): InboxWatcherState {
  return {
    config: {
      folderPath: defaultWatchedFolderPath,
      enabled: true,
    },
    health: "idle",
    lastStartedAt: null,
    lastEventAt: null,
    lastImportAt: null,
    lastError: null,
    importedFileCount: 0,
    processedFingerprints: [],
  };
}

async function ensureWatcherStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(watcherStateFilePath, "utf8");
  } catch {
    await writeFile(
      watcherStateFilePath,
      JSON.stringify(createDefaultWatcherState(), null, 2)
    );
  }
}

function normalizeWatcherState(value: unknown): InboxWatcherState {
  const fallback = createDefaultWatcherState();
  const candidate = (value && typeof value === "object"
    ? value
    : {}) as Partial<InboxWatcherState>;
  const config =
    candidate.config && typeof candidate.config === "object"
      ? candidate.config
      : undefined;

  return {
    config: {
      folderPath:
        typeof config?.folderPath === "string" && config.folderPath.trim().length > 0
          ? path.resolve(config.folderPath)
          : fallback.config.folderPath,
      enabled: typeof config?.enabled === "boolean" ? config.enabled : true,
    },
    health:
      candidate.health === "idle" ||
      candidate.health === "watching" ||
      candidate.health === "error"
        ? candidate.health
        : fallback.health,
    lastStartedAt:
      typeof candidate.lastStartedAt === "string" ? candidate.lastStartedAt : null,
    lastEventAt:
      typeof candidate.lastEventAt === "string" ? candidate.lastEventAt : null,
    lastImportAt:
      typeof candidate.lastImportAt === "string" ? candidate.lastImportAt : null,
    lastError:
      typeof candidate.lastError === "string" ? candidate.lastError : null,
    importedFileCount:
      typeof candidate.importedFileCount === "number" ? candidate.importedFileCount : 0,
    processedFingerprints: Array.isArray(candidate.processedFingerprints)
      ? candidate.processedFingerprints.filter(
          (entry): entry is string => typeof entry === "string"
        )
      : [],
  };
}

async function readWatcherState(): Promise<InboxWatcherState> {
  await ensureWatcherStoreFile();

  const fileContents = await readFile(watcherStateFilePath, "utf8");
  return normalizeWatcherState(JSON.parse(fileContents));
}

async function writeWatcherState(state: InboxWatcherState) {
  await writeFile(watcherStateFilePath, JSON.stringify(state, null, 2));
}

export async function getInboxWatcherStateSnapshot({
  running,
}: {
  running: boolean;
}): Promise<InboxWatcherSnapshot> {
  const state = await readWatcherState();

  return {
    ...state,
    running,
  };
}

export async function updateInboxWatcherState(
  updater: (current: InboxWatcherState) => InboxWatcherState | Promise<InboxWatcherState>
) {
  const current = await readWatcherState();
  const next = await updater(current);
  await writeWatcherState(next);
  return next;
}

export async function resetProcessedFingerprints() {
  await updateInboxWatcherState((current) => ({
    ...current,
    processedFingerprints: [],
  }));
}

export { defaultWatchedFolderPath };
