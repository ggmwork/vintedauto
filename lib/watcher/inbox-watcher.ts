import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

import { runSessionAutoGrouping } from "@/lib/grouping";
import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import {
  defaultWatchedFolderPath,
  getInboxWatcherStateSnapshot,
  readInboxWatcherState,
  updateInboxWatcherState,
} from "@/lib/watcher/local-inbox-watcher-store";
import type { PhotoAsset } from "@/types/intake";

interface RuntimeState {
  watcher: fs.FSWatcher | null;
  folderPath: string | null;
  scanTimer: NodeJS.Timeout | null;
  pollTimer: NodeJS.Timeout | null;
  scanning: boolean;
}

const AUTO_SCAN_INTERVAL_MS = 5_000;

declare global {
  var __vintedautoInboxWatcherRuntime: RuntimeState | undefined;
}

function getRuntimeState() {
  if (!globalThis.__vintedautoInboxWatcherRuntime) {
    globalThis.__vintedautoInboxWatcherRuntime = {
      watcher: null,
      folderPath: null,
      scanTimer: null,
      pollTimer: null,
      scanning: false,
    };
  }

  return globalThis.__vintedautoInboxWatcherRuntime;
}

function createDefaultIntakeName(folderPath: string) {
  return `Watched inbox (${path.basename(folderPath)})`;
}

async function ensureFolderExists(folderPath: string) {
  await mkdir(folderPath, { recursive: true });
}

async function walkImageFiles(rootPath: string, currentPath = rootPath) {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkImageFiles(rootPath, absolutePath)));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (![".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"].includes(extension)) {
      continue;
    }

    files.push(absolutePath);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function normalizeRelativePath(rootPath: string, absolutePath: string) {
  return path.relative(rootPath, absolutePath).split(path.sep).join("/");
}

function createSourceFingerprint(relativePath: string, fileStat: fs.Stats) {
  return `${relativePath}:${fileStat.size}:${fileStat.mtimeMs}`;
}

function buildScanSummary(result: {
  importedCount: number;
  autoCommittedCount: number;
  reviewClusterCount: number;
  regroupedExistingLoose: boolean;
}) {
  if (
    result.importedCount === 0 &&
    result.autoCommittedCount === 0 &&
    result.reviewClusterCount === 0 &&
    !result.regroupedExistingLoose
  ) {
    return "No new images found.";
  }

  const parts: string[] = [];

  if (result.importedCount > 0) {
    parts.push(
      `Imported ${result.importedCount} file${result.importedCount === 1 ? "" : "s"}.`
    );
  }

  if (result.regroupedExistingLoose && result.importedCount === 0) {
    parts.push("Re-ran grouping for existing loose photos.");
  }

  parts.push(
    `Auto-grouped ${result.autoCommittedCount} cluster${result.autoCommittedCount === 1 ? "" : "s"}.`
  );
  parts.push(
    `${result.reviewClusterCount} cluster${result.reviewClusterCount === 1 ? "" : "s"} need review.`
  );

  return parts.join(" ");
}

async function writeScanState(update: {
  health: "watching" | "scanning" | "error";
  lastScanAt?: string | null;
  lastImportAt?: string | null;
  lastScanSummary?: string | null;
  lastError?: string | null;
  importedFileCountDelta?: number;
  processedFingerprints?: string[];
  lastEventAt?: string | null;
}) {
  await updateInboxWatcherState((current) => ({
    ...current,
    health: update.health,
    lastScanAt:
      update.lastScanAt === undefined ? current.lastScanAt : update.lastScanAt,
    lastImportAt:
      update.lastImportAt === undefined ? current.lastImportAt : update.lastImportAt,
    lastScanSummary:
      update.lastScanSummary === undefined
        ? current.lastScanSummary
        : update.lastScanSummary,
    lastError:
      update.lastError === undefined ? current.lastError : update.lastError,
    lastEventAt:
      update.lastEventAt === undefined ? current.lastEventAt : update.lastEventAt,
    importedFileCount:
      current.importedFileCount + (update.importedFileCountDelta ?? 0),
    processedFingerprints:
      update.processedFingerprints ?? current.processedFingerprints,
  }));
}

async function getWatchedSession(folderPath: string) {
  const sessions = await studioSessionRepository.list();
  const existingSession = sessions.find(
    (session) =>
      session.intakeConfig.sourceType === "watched-folder" &&
      session.intakeConfig.folderPath === folderPath
  );

  if (existingSession) {
    const detail = await studioSessionRepository.getById(existingSession.id);

    if (!detail) {
      throw new Error(`Watched session missing after lookup: ${existingSession.id}`);
    }

    return detail;
  }

  return null;
}

async function createWatchedSession(folderPath: string) {
  return studioSessionRepository.create({
    name: createDefaultIntakeName(folderPath),
    intakeConfig: {
      sourceType: "watched-folder",
      startMode: "automatic",
      folderLabel: path.basename(folderPath),
      folderPath,
    },
  });
}

async function importLooseAndGroupedFiles(
  folderPath: string,
  options?: {
    forceRegroupExistingLoose?: boolean;
    useVisualDescriptors?: boolean;
  }
) {
  const watcherState = await readInboxWatcherState();
  const runtime = getRuntimeState();

  if (runtime.scanning) {
    return {
      importedCount: 0,
      sessionId: null as string | null,
      autoCommittedCount: 0,
      reviewClusterCount: 0,
      regroupedExistingLoose: false,
    };
  }

  runtime.scanning = true;

  try {
    const scanStartedAt = new Date().toISOString();
    await writeScanState({
      health: "scanning",
      lastScanAt: scanStartedAt,
      lastError: null,
    });

    const files = await walkImageFiles(folderPath);
    const existingSession = await getWatchedSession(folderPath);
    const shouldRegroupExistingLoose =
      options?.forceRegroupExistingLoose ??
      Boolean(
        existingSession &&
          existingSession.groupingRuns.length === 0 &&
          existingSession.photoAssets.some(
            (photoAsset) =>
              photoAsset.stockItemId === null &&
              photoAsset.candidateClusterId === null
          )
      );

    if (!existingSession && files.length === 0) {
      await writeScanState({
        health: "watching",
        lastScanAt: scanStartedAt,
        lastScanSummary: "No images found in the watched folder.",
        lastError: null,
      });

      return {
        importedCount: 0,
        sessionId: null as string | null,
        autoCommittedCount: 0,
        reviewClusterCount: 0,
        regroupedExistingLoose: false,
      };
    }

    if (!existingSession && shouldRegroupExistingLoose) {
      await writeScanState({
        health: "watching",
        lastScanAt: scanStartedAt,
        lastScanSummary: "No existing loose photos were available to regroup.",
        lastError: null,
      });

      return {
        importedCount: 0,
        sessionId: null as string | null,
        autoCommittedCount: 0,
        reviewClusterCount: 0,
        regroupedExistingLoose: false,
      };
    }

    const currentSession =
      existingSession ?? (await createWatchedSession(folderPath));
    const existingFingerprints = new Set(watcherState.processedFingerprints);
    const existingPhotoAssets = currentSession.photoAssets.slice();
    const importedPhotoAssetIds: string[] = [];
    let importedCount = 0;
    let nextSortOrder = existingPhotoAssets.length;
    const processedFingerprints = watcherState.processedFingerprints.slice();

    for (const absolutePath of files) {
      const fileStat = await stat(absolutePath);

      if (!fileStat.isFile()) {
        continue;
      }

      const relativePath = normalizeRelativePath(folderPath, absolutePath);
      const sourceFingerprint = createSourceFingerprint(relativePath, fileStat);

      if (existingFingerprints.has(sourceFingerprint)) {
        continue;
      }

      const fileName = path.basename(absolutePath);
      const bytes = await fs.promises.readFile(absolutePath);
      const assetId = randomUUID();
      const storedPhotoAsset = await photoAssetStorage.upload({
        sessionId: currentSession.id,
        assetId,
        fileName,
        contentType: getContentTypeFromFileName(fileName),
        bytes: bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer,
      });

      const photoAsset: PhotoAsset = {
        id: assetId,
        sessionId: currentSession.id,
        storagePath: storedPhotoAsset.storagePath,
        originalFilename: fileName,
        relativePath,
        sourceFingerprint,
        sortOrder: nextSortOrder,
        contentType: getContentTypeFromFileName(fileName),
        sizeBytes: storedPhotoAsset.sizeBytes,
        width: storedPhotoAsset.width,
        height: storedPhotoAsset.height,
        organizationStatus: "unassigned",
        stockItemId: null,
        candidateClusterId: null,
        descriptor: null,
        createdAt: new Date().toISOString(),
      };

      existingPhotoAssets.push(photoAsset);
      importedPhotoAssetIds.push(photoAsset.id);
      existingFingerprints.add(sourceFingerprint);
      processedFingerprints.push(sourceFingerprint);
      importedCount += 1;
      nextSortOrder += 1;
    }

    if (importedCount === 0 && !shouldRegroupExistingLoose) {
      await writeScanState({
        health: "watching",
        lastScanAt: scanStartedAt,
        lastScanSummary: "No new images found.",
        lastError: null,
      });

      return {
        importedCount: 0,
        sessionId: currentSession.id,
        autoCommittedCount: 0,
        reviewClusterCount: 0,
        regroupedExistingLoose: false,
      };
    }

    await studioSessionRepository.attachPhotoAssets({
      sessionId: currentSession.id,
      photoAssets: existingPhotoAssets,
    });

    const groupingResult = await runSessionAutoGrouping(
      currentSession.id,
      importedPhotoAssetIds,
      {
        useVisualDescriptors: options?.useVisualDescriptors ?? false,
      }
    );

    const refreshedSession =
      (await studioSessionRepository.getById(currentSession.id)) ?? currentSession;
    const lastImportAt = importedCount > 0 ? new Date().toISOString() : null;
    const regroupedExistingLoose =
      importedCount === 0 && shouldRegroupExistingLoose;

    await writeScanState({
      health: "watching",
      lastScanAt: new Date().toISOString(),
      lastImportAt,
      lastScanSummary: buildScanSummary({
        importedCount,
        autoCommittedCount: groupingResult.autoCommittedCount,
        reviewClusterCount: groupingResult.reviewClusterCount,
        regroupedExistingLoose,
      }),
      lastError: null,
      importedFileCountDelta: importedCount,
      processedFingerprints,
      lastEventAt: importedCount > 0 ? lastImportAt : undefined,
    });

    return {
      importedCount,
      sessionId: refreshedSession.id,
      autoCommittedCount: groupingResult.autoCommittedCount,
      reviewClusterCount: groupingResult.reviewClusterCount,
      regroupedExistingLoose,
    };
  } finally {
    runtime.scanning = false;
  }
}

function scheduleScan(folderPath: string) {
  const runtime = getRuntimeState();

  if (runtime.scanTimer) {
    clearTimeout(runtime.scanTimer);
  }

  runtime.scanTimer = setTimeout(async () => {
    runtime.scanTimer = null;

    try {
      await importLooseAndGroupedFiles(folderPath);
    } catch (error) {
      await writeScanState({
        health: "error",
        lastScanAt: new Date().toISOString(),
        lastScanSummary: "Automatic event scan failed.",
        lastError:
          error instanceof Error ? error.message : "Unknown inbox watcher error.",
      });
    }
  }, 1200);
}

function clearPolling(runtime: RuntimeState) {
  if (runtime.pollTimer) {
    clearTimeout(runtime.pollTimer);
    runtime.pollTimer = null;
  }
}

function schedulePolling(folderPath: string) {
  const runtime = getRuntimeState();

  if (runtime.pollTimer) {
    return;
  }

  runtime.pollTimer = setTimeout(async () => {
    runtime.pollTimer = null;

    try {
      await importLooseAndGroupedFiles(folderPath);
    } catch (error) {
      await writeScanState({
        health: "error",
        lastScanAt: new Date().toISOString(),
        lastScanSummary: "Automatic polling scan failed.",
        lastError:
          error instanceof Error ? error.message : "Unknown inbox watcher error.",
      });
    } finally {
      const nextRuntime = getRuntimeState();

      if (nextRuntime.folderPath === folderPath && nextRuntime.watcher) {
        schedulePolling(folderPath);
      }
    }
  }, AUTO_SCAN_INTERVAL_MS);
}

function getContentTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".heic":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

export async function ensureInboxWatcherRunning() {
  const runtime = getRuntimeState();
  const watcherState = await readInboxWatcherState();
  const folderPath = path.resolve(
    watcherState.config.folderPath || defaultWatchedFolderPath
  );

  await ensureFolderExists(folderPath);

  if (!watcherState.config.enabled) {
    return getInboxWatcherStateSnapshot({
      running: false,
    });
  }

  if (runtime.watcher && runtime.folderPath === folderPath) {
    schedulePolling(folderPath);

    if (!watcherState.lastScanAt) {
      scheduleScan(folderPath);
    }

    return getInboxWatcherStateSnapshot({
      running: true,
    });
  }

  if (runtime.watcher) {
    runtime.watcher.close();
    runtime.watcher = null;
  }

  clearPolling(runtime);

  runtime.folderPath = folderPath;
  runtime.watcher = fs.watch(
    folderPath,
    { recursive: true },
    async () => {
      scheduleScan(folderPath);
    }
  );

  await updateInboxWatcherState((current) => ({
    ...current,
    config: {
      ...current.config,
      folderPath,
    },
    health: "watching",
    lastStartedAt: new Date().toISOString(),
    lastError: null,
  }));

  scheduleScan(folderPath);
  schedulePolling(folderPath);

  return getInboxWatcherStateSnapshot({
    running: true,
  });
}

export async function stopInboxWatcher() {
  const runtime = getRuntimeState();

  if (runtime.scanTimer) {
    clearTimeout(runtime.scanTimer);
    runtime.scanTimer = null;
  }

  if (runtime.watcher) {
    runtime.watcher.close();
    runtime.watcher = null;
  }

  clearPolling(runtime);

  runtime.folderPath = null;

  await updateInboxWatcherState((current) => ({
    ...current,
    health: current.lastError ? "error" : "idle",
  }));

  return getInboxWatcherStateSnapshot({
    running: false,
  });
}

export async function updateInboxWatcherConfig(input: {
  folderPath?: string | null;
  enabled?: boolean;
}) {
  const nextState = await updateInboxWatcherState((current) => ({
    ...current,
    config: {
      folderPath:
        typeof input.folderPath === "string" && input.folderPath.trim().length > 0
          ? path.resolve(input.folderPath)
          : current.config.folderPath,
      enabled:
        typeof input.enabled === "boolean" ? input.enabled : current.config.enabled,
    },
    lastError: null,
  }));

  if (!nextState.config.enabled) {
    await stopInboxWatcher();
  }

  return nextState;
}

export async function scanInboxWatcherNow() {
  const watcherState = await readInboxWatcherState();

  await ensureFolderExists(watcherState.config.folderPath);
  const result = await importLooseAndGroupedFiles(watcherState.config.folderPath, {
    forceRegroupExistingLoose: true,
    useVisualDescriptors: true,
  });

  return result;
}

export async function getInboxWatcherSnapshot() {
  const runtime = getRuntimeState();

  return getInboxWatcherStateSnapshot({
    running: Boolean(runtime.watcher),
  });
}
