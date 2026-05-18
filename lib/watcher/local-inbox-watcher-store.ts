import path from "node:path";

import { getDatabasePath } from "@/lib/data/database-root";
import { readJsonFile, writeJsonFile } from "@/lib/data/json-store";
import type {
  InboxWatcherSnapshot,
  InboxWatcherState,
} from "@/types/watcher";

const defaultWatchedFolderPath = path.join(process.cwd(), "watched-inbox");

function getWatcherStateFilePath() {
  return getDatabasePath("inbox-watcher.json");
}

declare global {
  var __vintedautoWatcherStateQueue: Promise<void> | undefined;
}

function getWatcherStateQueue() {
  if (!globalThis.__vintedautoWatcherStateQueue) {
    globalThis.__vintedautoWatcherStateQueue = Promise.resolve();
  }

  return globalThis.__vintedautoWatcherStateQueue;
}

function queueWatcherStateOperation<T>(operation: () => Promise<T>) {
  const nextOperation = getWatcherStateQueue().then(operation, operation);

  globalThis.__vintedautoWatcherStateQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );

  return nextOperation;
}

function createDefaultWatcherState(): InboxWatcherState {
  return {
    config: {
      folderPath: defaultWatchedFolderPath,
      enabled: true,
    },
    health: "idle",
    lastStartedAt: null,
    lastScanAt: null,
    lastEventAt: null,
    lastImportAt: null,
    lastScanSummary: null,
    lastError: null,
    importedFileCount: 0,
    processedFingerprints: [],
  };
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
      candidate.health === "scanning" ||
      candidate.health === "watching" ||
      candidate.health === "error"
        ? candidate.health
        : fallback.health,
    lastStartedAt:
      typeof candidate.lastStartedAt === "string" ? candidate.lastStartedAt : null,
    lastScanAt:
      typeof candidate.lastScanAt === "string" ? candidate.lastScanAt : null,
    lastEventAt:
      typeof candidate.lastEventAt === "string" ? candidate.lastEventAt : null,
    lastImportAt:
      typeof candidate.lastImportAt === "string" ? candidate.lastImportAt : null,
    lastScanSummary:
      typeof candidate.lastScanSummary === "string"
        ? candidate.lastScanSummary
        : null,
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
  let attempt = 0;

  while (attempt < 3) {
    try {
      return readJsonFile(
        getWatcherStateFilePath(),
        createDefaultWatcherState,
        normalizeWatcherState
      );
    } catch (error) {
      attempt += 1;

      if (attempt >= 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  return createDefaultWatcherState();
}

export async function readInboxWatcherState() {
  return queueWatcherStateOperation(() => readWatcherState());
}

async function writeWatcherState(state: InboxWatcherState) {
  await writeJsonFile(getWatcherStateFilePath(), state);
}

export async function getInboxWatcherStateSnapshot({
  running,
}: {
  running: boolean;
}): Promise<InboxWatcherSnapshot> {
  const state = await readInboxWatcherState();

  return {
    ...state,
    running,
  };
}

export async function updateInboxWatcherState(
  updater: (current: InboxWatcherState) => InboxWatcherState | Promise<InboxWatcherState>
) {
  return queueWatcherStateOperation(async () => {
    const current = await readWatcherState();
    const next = await updater(current);
    await writeWatcherState(next);
    return next;
  });
}

export async function resetProcessedFingerprints() {
  await updateInboxWatcherState((current) => ({
    ...current,
    processedFingerprints: [],
  }));
}

export { defaultWatchedFolderPath };
