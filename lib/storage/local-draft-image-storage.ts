import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  DraftImageStorage,
  StoredImageAsset,
  UploadDraftImageInput,
} from "@/lib/storage/image-storage";

const draftImagesDirectory = path.join(process.cwd(), ".data", "draft-images");

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
  const absolutePath = path.resolve(draftImagesDirectory, storagePath);
  const normalizedRoot = path.resolve(draftImagesDirectory);

  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new Error("Invalid image storage path.");
  }

  return absolutePath;
}

class LocalDraftImageStorage implements DraftImageStorage {
  async upload(input: UploadDraftImageInput): Promise<StoredImageAsset> {
    const extension = getFileExtension(input.fileName, input.contentType);
    const relativeDirectory = input.draftId;
    const relativePath = path.posix.join(
      relativeDirectory,
      `${input.imageId}${extension}`
    );
    const absoluteDirectory = path.join(draftImagesDirectory, input.draftId);
    const absolutePath = resolveStoredPath(relativePath);

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, new Uint8Array(input.bytes));

    return {
      storagePath: relativePath,
      publicUrl: `/api/drafts/${input.draftId}/images/${input.imageId}`,
      width: null,
      height: null,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async remove(storagePath: string): Promise<void> {
    try {
      await unlink(resolveStoredPath(storagePath));
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  async listPaths(draftId: string): Promise<string[]> {
    const draftDirectory = path.join(draftImagesDirectory, draftId);

    try {
      const entries = await readdir(draftDirectory, { withFileTypes: true });

      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.posix.join(draftId, entry.name))
        .sort((left, right) => left.localeCompare(right));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }

      throw error;
    }
  }

  async read(storagePath: string): Promise<Uint8Array> {
    return readFile(resolveStoredPath(storagePath));
  }
}

export const localDraftImageStorage = new LocalDraftImageStorage();
