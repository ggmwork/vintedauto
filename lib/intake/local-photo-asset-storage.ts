import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  PhotoAssetStorage,
  StoredPhotoAsset,
  UploadPhotoAssetInput,
} from "@/lib/intake/photo-asset-storage";

const sessionPhotoAssetsDirectory = path.join(
  process.cwd(),
  ".data",
  "session-photo-assets"
);

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
  const absolutePath = path.resolve(sessionPhotoAssetsDirectory, storagePath);
  const normalizedRoot = path.resolve(sessionPhotoAssetsDirectory);

  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new Error("Invalid photo asset storage path.");
  }

  return absolutePath;
}

class LocalPhotoAssetStorage implements PhotoAssetStorage {
  async upload(input: UploadPhotoAssetInput): Promise<StoredPhotoAsset> {
    const extension = getFileExtension(input.fileName, input.contentType);
    const relativeDirectory = input.sessionId;
    const relativePath = path.posix.join(
      relativeDirectory,
      `${input.assetId}${extension}`
    );
    const absoluteDirectory = path.join(
      sessionPhotoAssetsDirectory,
      input.sessionId
    );
    const absolutePath = resolveStoredPath(relativePath);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, new Uint8Array(input.bytes));

    return {
      storagePath: relativePath,
      publicUrl: `/api/sessions/${input.sessionId}/photos/${input.assetId}`,
      width: null,
      height: null,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async read(storagePath: string): Promise<Uint8Array> {
    return readFile(resolveStoredPath(storagePath));
  }
}

export const localPhotoAssetStorage = new LocalPhotoAssetStorage();
