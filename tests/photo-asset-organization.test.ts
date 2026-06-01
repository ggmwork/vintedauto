import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import type { PhotoAsset } from "@/types/intake";

async function withTempDatabase<T>(callback: () => Promise<T>) {
  const previousRoot = process.env.VINTEDAUTO_DATA_DIR;
  process.env.VINTEDAUTO_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "vintedauto-photo-organization-")
  );

  try {
    return await callback();
  } finally {
    if (previousRoot === undefined) {
      delete process.env.VINTEDAUTO_DATA_DIR;
    } else {
      process.env.VINTEDAUTO_DATA_DIR = previousRoot;
    }
  }
}

function createPhotoAsset(input: {
  sessionId: string;
  id: string;
  storagePath: string;
  originalFilename: string;
  sortOrder: number;
  sizeBytes: number | null;
}): PhotoAsset {
  return {
    id: input.id,
    sessionId: input.sessionId,
    storagePath: input.storagePath,
    originalFilename: input.originalFilename,
    relativePath: input.originalFilename,
    sourceFingerprint: null,
    sortOrder: input.sortOrder,
    contentType: "image/jpeg",
    sizeBytes: input.sizeBytes,
    width: null,
    height: null,
    organizationStatus: "unassigned",
    stockItemId: null,
    candidateClusterId: null,
    descriptor: null,
    createdAt: "2026-06-01T10:00:00.000Z",
  };
}

describe("photo asset organization", () => {
  it("moves stock item photos into item folders and back to unassigned", async () => {
    await withTempDatabase(async () => {
      const session = await studioSessionRepository.create({
        name: "Photo organization",
      });
      const firstUpload = await photoAssetStorage.upload({
        sessionId: session.id,
        assetId: "photo-a",
        fileName: "front.jpg",
        contentType: "image/jpeg",
        bytes: new Uint8Array([1, 2, 3]).buffer,
      });
      const secondUpload = await photoAssetStorage.upload({
        sessionId: session.id,
        assetId: "photo-b",
        fileName: "back.jpg",
        contentType: "image/jpeg",
        bytes: new Uint8Array([4, 5, 6]).buffer,
      });

      assert.equal(
        firstUpload.storagePath,
        `${session.id}/unassigned/photo-a.jpg`
      );

      await studioSessionRepository.attachPhotoAssets({
        sessionId: session.id,
        photoAssets: [
          createPhotoAsset({
            sessionId: session.id,
            id: "photo-a",
            storagePath: firstUpload.storagePath,
            originalFilename: "front.jpg",
            sortOrder: 0,
            sizeBytes: firstUpload.sizeBytes,
          }),
          createPhotoAsset({
            sessionId: session.id,
            id: "photo-b",
            storagePath: secondUpload.storagePath,
            originalFilename: "back.jpg",
            sortOrder: 1,
            sizeBytes: secondUpload.sizeBytes,
          }),
        ],
      });

      const firstStockItem = await studioSessionRepository.createStockItem({
        sessionId: session.id,
        name: "First item",
        photoAssetIds: ["photo-a"],
      });
      let savedSession = await studioSessionRepository.getById(session.id);
      let firstPhoto = savedSession?.photoAssets.find(
        (photoAsset) => photoAsset.id === "photo-a"
      );

      assert.equal(
        firstPhoto?.storagePath,
        `${session.id}/stock-items/${firstStockItem.id}/photo-a.jpg`
      );
      assert.deepEqual(
        Array.from(await photoAssetStorage.read(firstPhoto?.storagePath ?? "")),
        [1, 2, 3]
      );
      await assert.rejects(
        () => photoAssetStorage.read(firstUpload.storagePath),
        /ENOENT/
      );

      const secondStockItem = await studioSessionRepository.createStockItem({
        sessionId: session.id,
        name: "Second item",
        photoAssetIds: ["photo-b"],
      });

      savedSession = await studioSessionRepository.assignPhotoAssetsToStockItem({
        sessionId: session.id,
        stockItemId: secondStockItem.id,
        photoAssetIds: ["photo-a"],
      });
      firstPhoto = savedSession.photoAssets.find(
        (photoAsset) => photoAsset.id === "photo-a"
      );

      assert.equal(
        firstPhoto?.storagePath,
        `${session.id}/stock-items/${secondStockItem.id}/photo-a.jpg`
      );

      savedSession = await studioSessionRepository.releasePhotoAssetsFromStockItem({
        sessionId: session.id,
        stockItemId: secondStockItem.id,
        photoAssetIds: ["photo-a"],
      });
      firstPhoto = savedSession.photoAssets.find(
        (photoAsset) => photoAsset.id === "photo-a"
      );

      assert.equal(
        firstPhoto?.storagePath,
        `${session.id}/unassigned/photo-a.jpg`
      );
      assert.deepEqual(
        Array.from(await photoAssetStorage.read(firstPhoto?.storagePath ?? "")),
        [1, 2, 3]
      );

      savedSession = await studioSessionRepository.removeStockItem({
        sessionId: session.id,
        stockItemId: secondStockItem.id,
      });
      const secondPhoto = savedSession.photoAssets.find(
        (photoAsset) => photoAsset.id === "photo-b"
      );

      assert.equal(
        secondPhoto?.storagePath,
        `${session.id}/unassigned/photo-b.jpg`
      );
      assert.deepEqual(
        Array.from(await photoAssetStorage.read(secondPhoto?.storagePath ?? "")),
        [4, 5, 6]
      );
    });
  });

  it("moves watched source files out of the watched inbox", async () => {
    await withTempDatabase(async () => {
      const watchedFolderPath = await mkdtemp(
        path.join(os.tmpdir(), "vintedauto-watched-inbox-")
      );
      const sourcePath = path.join(watchedFolderPath, "front.jpg");

      await writeFile(sourcePath, new Uint8Array([7, 8, 9]));

      const session = await studioSessionRepository.create({
        name: "Watched organization",
        intakeConfig: {
          sourceType: "watched-folder",
          startMode: "automatic",
          folderLabel: "watched",
          folderPath: watchedFolderPath,
        },
      });
      const upload = await photoAssetStorage.upload({
        sessionId: session.id,
        assetId: "watched-photo",
        fileName: "front.jpg",
        contentType: "image/jpeg",
        bytes: new Uint8Array([7, 8, 9]).buffer,
      });

      let savedSession = await studioSessionRepository.attachPhotoAssets({
        sessionId: session.id,
        photoAssets: [
          createPhotoAsset({
            sessionId: session.id,
            id: "watched-photo",
            storagePath: upload.storagePath,
            originalFilename: "front.jpg",
            sortOrder: 0,
            sizeBytes: upload.sizeBytes,
          }),
        ],
      });
      let photoAsset = savedSession.photoAssets[0];
      const processedRoot = `${watchedFolderPath}-processed`;
      const unassignedSourcePath = path.join(
        processedRoot,
        "unassigned",
        "front.jpg"
      );

      assert.equal(photoAsset.sourceProcessedPath, "unassigned/front.jpg");
      await assert.rejects(() => readFile(sourcePath), /ENOENT/);
      assert.deepEqual(Array.from(await readFile(unassignedSourcePath)), [7, 8, 9]);

      const stockItem = await studioSessionRepository.createStockItem({
        sessionId: session.id,
        name: "Watched item",
        photoAssetIds: ["watched-photo"],
      });

      savedSession = (await studioSessionRepository.getById(session.id)) ?? savedSession;
      photoAsset = savedSession.photoAssets[0];
      const stockSourcePath = path.join(
        processedRoot,
        "stock-items",
        stockItem.id,
        "front.jpg"
      );

      assert.equal(
        photoAsset.sourceProcessedPath,
        `stock-items/${stockItem.id}/front.jpg`
      );
      await assert.rejects(() => readFile(unassignedSourcePath), /ENOENT/);
      assert.deepEqual(Array.from(await readFile(stockSourcePath)), [7, 8, 9]);

      savedSession = await studioSessionRepository.releasePhotoAssetsFromStockItem({
        sessionId: session.id,
        stockItemId: stockItem.id,
        photoAssetIds: ["watched-photo"],
      });
      photoAsset = savedSession.photoAssets[0];

      assert.equal(photoAsset.sourceProcessedPath, "unassigned/front.jpg");
      assert.deepEqual(Array.from(await readFile(unassignedSourcePath)), [7, 8, 9]);
      await assert.rejects(() => readFile(sourcePath), /ENOENT/);
    });
  });
});
