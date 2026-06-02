import { access, mkdir, rename } from "node:fs/promises";
import path from "node:path";

import { isPathInsideDirectory } from "@/lib/data/path-containment";
import type { PhotoAsset, StudioSessionDetail } from "@/types/intake";

function toPosixPath(value: string) {
  return value.split(/[\\/]+/).filter(Boolean).join("/");
}

function getProcessedRoot(folderPath: string) {
  return `${path.resolve(folderPath)}-processed`;
}

function getDeletedRoot(folderPath: string) {
  return `${path.resolve(folderPath)}-deleted`;
}

function getSourceRelativePath(photoAsset: PhotoAsset) {
  const relativePath = photoAsset.relativePath?.trim();

  if (relativePath) {
    return toPosixPath(relativePath);
  }

  return photoAsset.originalFilename;
}

function resolveInside(root: string, relativePath: string) {
  const normalizedRoot = path.resolve(root);
  const resolvedPath = path.resolve(normalizedRoot, relativePath);

  if (!isPathInsideDirectory(normalizedRoot, resolvedPath)) {
    throw new Error("Invalid watched source photo path.");
  }

  return resolvedPath;
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createTargetRelativePath(photoAsset: PhotoAsset) {
  if (!photoAsset.stockItemId) {
    return null;
  }

  return toPosixPath(
    path.posix.join(
      "stock-items",
      photoAsset.stockItemId,
      getSourceRelativePath(photoAsset)
    )
  );
}

function createFallbackRelativePath(relativePath: string, photoAssetId: string) {
  const extension = path.posix.extname(relativePath);
  const withoutExtension = extension
    ? relativePath.slice(0, -extension.length)
    : relativePath;

  return `${withoutExtension}-${photoAssetId}${extension}`;
}

async function moveSourceFile(input: {
  watchedFolderPath: string;
  processedRoot: string;
  photoAsset: PhotoAsset;
}) {
  const currentRelativePath = input.photoAsset.sourceProcessedPath
    ? toPosixPath(input.photoAsset.sourceProcessedPath)
    : getSourceRelativePath(input.photoAsset);
  const sourceRoot = input.photoAsset.sourceProcessedPath
    ? input.processedRoot
    : input.watchedFolderPath;
  const sourcePath = resolveInside(sourceRoot, currentRelativePath);
  let targetRelativePath = createTargetRelativePath(input.photoAsset);

  if (!targetRelativePath) {
    return input.photoAsset.sourceProcessedPath ?? null;
  }

  let targetPath = resolveInside(input.processedRoot, targetRelativePath);

  if (path.resolve(sourcePath) === path.resolve(targetPath)) {
    return targetRelativePath;
  }

  if (!(await pathExists(sourcePath))) {
    return input.photoAsset.sourceProcessedPath ?? null;
  }

  if (await pathExists(targetPath)) {
    targetRelativePath = createFallbackRelativePath(
      targetRelativePath,
      input.photoAsset.id
    );
    targetPath = resolveInside(input.processedRoot, targetRelativePath);
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await rename(sourcePath, targetPath);

  return targetRelativePath;
}

async function moveSourceFileToDeleted(input: {
  watchedFolderPath: string;
  processedRoot: string;
  deletedRoot: string;
  photoAsset: PhotoAsset;
}) {
  const currentRelativePath = input.photoAsset.sourceProcessedPath
    ? toPosixPath(input.photoAsset.sourceProcessedPath)
    : getSourceRelativePath(input.photoAsset);
  const sourceRoot = input.photoAsset.sourceProcessedPath
    ? input.processedRoot
    : input.watchedFolderPath;
  const sourcePath = resolveInside(sourceRoot, currentRelativePath);
  let targetRelativePath = getSourceRelativePath(input.photoAsset);
  let targetPath = resolveInside(input.deletedRoot, targetRelativePath);

  if (!(await pathExists(sourcePath))) {
    return;
  }

  if (await pathExists(targetPath)) {
    targetRelativePath = createFallbackRelativePath(
      targetRelativePath,
      input.photoAsset.id
    );
    targetPath = resolveInside(input.deletedRoot, targetRelativePath);
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await rename(sourcePath, targetPath);
}

export async function moveWatchedSourceFilesToOrganizationTargets(
  session: StudioSessionDetail,
  photoAssetIds: string[]
) {
  if (
    session.intakeConfig.sourceType !== "watched-folder" ||
    !session.intakeConfig.folderPath
  ) {
    return session;
  }

  const selectedIds = new Set(photoAssetIds);

  if (selectedIds.size === 0) {
    return session;
  }

  const watchedFolderPath = path.resolve(session.intakeConfig.folderPath);
  const processedRoot = getProcessedRoot(watchedFolderPath);
  let moved = false;
  const photoAssets = await Promise.all(
    session.photoAssets.map(async (photoAsset) => {
      if (!selectedIds.has(photoAsset.id)) {
        return photoAsset;
      }

      const sourceProcessedPath = await moveSourceFile({
        watchedFolderPath,
        processedRoot,
        photoAsset,
      });

      if (sourceProcessedPath === (photoAsset.sourceProcessedPath ?? null)) {
        return photoAsset;
      }

      moved = true;
      return {
        ...photoAsset,
        sourceProcessedPath,
      };
    })
  );

  return moved
    ? {
        ...session,
        photoAssets,
      }
    : session;
}

export async function moveWatchedSourceFilesToDeletedArchive(
  session: StudioSessionDetail,
  photoAssetIds: string[]
) {
  if (
    session.intakeConfig.sourceType !== "watched-folder" ||
    !session.intakeConfig.folderPath
  ) {
    return;
  }

  const selectedIds = new Set(photoAssetIds);

  if (selectedIds.size === 0) {
    return;
  }

  const watchedFolderPath = path.resolve(session.intakeConfig.folderPath);
  const processedRoot = getProcessedRoot(watchedFolderPath);
  const deletedRoot = getDeletedRoot(watchedFolderPath);

  await Promise.all(
    session.photoAssets
      .filter((photoAsset) => selectedIds.has(photoAsset.id))
      .map((photoAsset) =>
        moveSourceFileToDeleted({
          watchedFolderPath,
          processedRoot,
          deletedRoot,
          photoAsset,
        })
      )
  );
}
