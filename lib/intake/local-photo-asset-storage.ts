import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDatabasePath } from "@/lib/data/database-root";
import { isPathInsideDirectory } from "@/lib/data/path-containment";
import type {
  PhotoAssetStorage,
  MovePhotoAssetInput,
  StoredPhotoAsset,
  UploadPhotoAssetInput,
} from "@/lib/intake/photo-asset-storage";

function getSessionPhotoAssetsDirectory() {
  return getDatabasePath("session-photo-assets");
}

const contentTypeToExtension = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/heic", ".heic"],
]);

function getFileExtension(fileName: string, contentType: string) {
  const originalExtension = path.extname(fileName).toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  return contentTypeToExtension.get(contentType) ?? ".bin";
}

function resolveStoredPath(storagePath: string) {
  const sessionPhotoAssetsDirectory = getSessionPhotoAssetsDirectory();
  const absolutePath = path.resolve(sessionPhotoAssetsDirectory, storagePath);
  const normalizedRoot = path.resolve(sessionPhotoAssetsDirectory);

  if (!isPathInsideDirectory(normalizedRoot, absolutePath)) {
    throw new Error("Invalid photo asset storage path.");
  }

  return absolutePath;
}

function getStorageExtension(storagePath: string) {
  return path.posix.extname(storagePath) || ".bin";
}

function getPhotoAssetRelativePath(input: {
  sessionId: string;
  assetId: string;
  storagePath?: string;
  stockItemId: string | null;
}) {
  const extension = input.storagePath
    ? getStorageExtension(input.storagePath)
    : ".bin";
  const relativeDirectory = input.stockItemId
    ? path.posix.join(input.sessionId, "stock-items", input.stockItemId)
    : path.posix.join(input.sessionId, "unassigned");

  return path.posix.join(relativeDirectory, `${input.assetId}${extension}`);
}

class LocalPhotoAssetStorage implements PhotoAssetStorage {
  async upload(input: UploadPhotoAssetInput): Promise<StoredPhotoAsset> {
    const extension = getFileExtension(input.fileName, input.contentType);
    const relativePath = path.posix.join(
      input.sessionId,
      "unassigned",
      `${input.assetId}${extension}`
    );
    const absolutePath = resolveStoredPath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, new Uint8Array(input.bytes));

    return {
      storagePath: relativePath,
      publicUrl: `/api/sessions/${input.sessionId}/photos/${input.assetId}`,
      width: null,
      height: null,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async move(input: MovePhotoAssetInput): Promise<StoredPhotoAsset> {
    const relativePath = getPhotoAssetRelativePath(input);

    if (input.storagePath === relativePath) {
      return {
        storagePath: relativePath,
        publicUrl: `/api/sessions/${input.sessionId}/photos/${input.assetId}`,
        width: null,
        height: null,
        sizeBytes: null,
      };
    }

    const sourcePath = resolveStoredPath(input.storagePath);
    const targetPath = resolveStoredPath(relativePath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await rename(sourcePath, targetPath);

    return {
      storagePath: relativePath,
      publicUrl: `/api/sessions/${input.sessionId}/photos/${input.assetId}`,
      width: null,
      height: null,
      sizeBytes: null,
    };
  }

  async read(storagePath: string): Promise<Uint8Array> {
    return readFile(resolveStoredPath(storagePath));
  }
}

export const localPhotoAssetStorage = new LocalPhotoAssetStorage();
