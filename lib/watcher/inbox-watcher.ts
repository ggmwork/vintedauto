import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import {
  defaultWatchedFolderPath,
  getInboxWatcherStateSnapshot,
  updateInboxWatcherState,
} from "@/lib/watcher/local-inbox-watcher-store";
import type { PhotoAsset } from "@/types/intake";

interface RuntimeState {
  watcher: fs.FSWatcher | null;
  folderPath: string | null;
  scanTimer: NodeJS.Timeout | null;
  scanning: boolean;
}

declare global {
  var __vintedautoInboxWatcherRuntime: RuntimeState | undefined;
}

function getRuntimeState() {
  if (!globalThis.__vintedautoInboxWatcherRuntime) {
    globalThis.__vintedautoInboxWatcherRuntime = {
      watcher: null,
      folderPath: null,
      scanTimer: null,
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

async function getOrCreateWatchedSession(folderPath: string) {
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

async function importLooseAndGroupedFiles(folderPath: string) {
  const watcherState = await updateInboxWatcherState((current) => current);
  const runtime = getRuntimeState();

  if (runtime.scanning) {
    return {
      importedCount: 0,
      sessionId: null as string | null,
    };
  }

  runtime.scanning = true;

  try {
    const session = await getOrCreateWatchedSession(folderPath);
    const files = await walkImageFiles(folderPath);
    const currentSession = (await studioSessionRepository.getById(session.id)) ?? session;
    const existingFingerprints = new Set(watcherState.processedFingerprints);
    const existingPhotoAssets = currentSession.photoAssets.slice();
    const importedGroups = new Map<string, string[]>();
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
        createdAt: new Date().toISOString(),
      };

      existingPhotoAssets.push(photoAsset);
      existingFingerprints.add(sourceFingerprint);
      processedFingerprints.push(sourceFingerprint);
      importedCount += 1;
      nextSortOrder += 1;

      const topLevelFolder = relativePath.includes("/")
        ? relativePath.split("/")[0]
        : null;

      if (topLevelFolder) {
        const group = importedGroups.get(topLevelFolder) ?? [];
        group.push(photoAsset.id);
        importedGroups.set(topLevelFolder, group);
      }
    }

    if (importedCount === 0) {
      return {
        importedCount: 0,
        sessionId: currentSession.id,
      };
    }

    await studioSessionRepository.attachPhotoAssets({
      sessionId: currentSession.id,
      photoAssets: existingPhotoAssets,
    });

    let refreshedSession =
      (await studioSessionRepository.getById(currentSession.id)) ?? currentSession;

    for (const [stockName, photoAssetIds] of importedGroups.entries()) {
      const existingStockItem = refreshedSession.stockItems.find(
        (stockItem) => stockItem.name === stockName && stockItem.draftId === null
      );

      if (existingStockItem) {
        await studioSessionRepository.assignPhotoAssetsToStockItem({
          sessionId: refreshedSession.id,
          stockItemId: existingStockItem.id,
          photoAssetIds,
        });
      } else {
        await studioSessionRepository.createStockItem({
          sessionId: refreshedSession.id,
          name: stockName,
          photoAssetIds,
        });
      }

      refreshedSession =
        (await studioSessionRepository.getById(refreshedSession.id)) ?? refreshedSession;
    }

    await updateInboxWatcherState((current) => ({
      ...current,
      health: "watching",
      lastImportAt: new Date().toISOString(),
      lastError: null,
      importedFileCount: current.importedFileCount + importedCount,
      processedFingerprints,
    }));

    return {
      importedCount,
      sessionId: refreshedSession.id,
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
      await updateInboxWatcherState((current) => ({
        ...current,
        health: "error",
        lastError:
          error instanceof Error ? error.message : "Unknown inbox watcher error.",
      }));
    }
  }, 1200);
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
  const watcherState = await updateInboxWatcherState((current) => current);
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
    return getInboxWatcherStateSnapshot({
      running: true,
    });
  }

  if (runtime.watcher) {
    runtime.watcher.close();
    runtime.watcher = null;
  }

  runtime.folderPath = folderPath;
  runtime.watcher = fs.watch(
    folderPath,
    { recursive: true },
    async () => {
      await updateInboxWatcherState((current) => ({
        ...current,
        health: "watching",
        lastEventAt: new Date().toISOString(),
        lastError: null,
      }));
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
  const watcherState = await updateInboxWatcherState((current) => current);

  await ensureFolderExists(watcherState.config.folderPath);
  const result = await importLooseAndGroupedFiles(watcherState.config.folderPath);

  return result;
}

export async function getInboxWatcherSnapshot() {
  const runtime = getRuntimeState();

  return getInboxWatcherStateSnapshot({
    running: Boolean(runtime.watcher),
  });
}
