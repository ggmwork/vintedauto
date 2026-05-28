import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { studioSessionRepository } from "@/lib/intake";
import type { PhotoAsset } from "@/types/intake";

async function withTempDatabase<T>(callback: () => Promise<T>) {
  const previousRoot = process.env.VINTEDAUTO_DATA_DIR;
  process.env.VINTEDAUTO_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "vintedauto-grouping-")
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

function createPhotoAsset(
  sessionId: string,
  id: string,
  originalFilename: string,
  sortOrder: number
): PhotoAsset {
  return {
    id,
    sessionId,
    storagePath: `${sessionId}/${id}.jpg`,
    originalFilename,
    relativePath: originalFilename,
    sourceFingerprint: null,
    sortOrder,
    contentType: "image/jpeg",
    sizeBytes: 100,
    width: 100,
    height: 100,
    organizationStatus: "unassigned",
    stockItemId: null,
    candidateClusterId: null,
    descriptor: null,
    createdAt: "2026-05-28T10:00:00.000Z",
  };
}

async function loadAutoGroupingService() {
  const stubDirectory = path.join(
    process.cwd(),
    ".test-build",
    "node_modules",
    "server-only"
  );

  await mkdir(stubDirectory, { recursive: true });
  await writeFile(path.join(stubDirectory, "index.js"), "", "utf8");
  return import("../lib/grouping/auto-grouping-service");
}

describe("auto grouping", () => {
  it("leaves isolated loose photos in the inbox instead of review clusters", async () => {
    await withTempDatabase(async () => {
      const { runSessionAutoGrouping } = await loadAutoGroupingService();
      const session = await studioSessionRepository.create({
        name: "Grouping",
      });
      const photos = [
        createPhotoAsset(session.id, "photo-1", "red-shirt-front.jpg", 0),
        createPhotoAsset(session.id, "photo-2", "blue-jeans-front.jpg", 1),
      ];

      await studioSessionRepository.attachPhotoAssets({
        sessionId: session.id,
        photoAssets: photos,
      });

      const result = await runSessionAutoGrouping(
        session.id,
        photos.map((photo) => photo.id),
        {
          useVisualDescriptors: false,
          clusterLoosePhotos: true,
        }
      );
      const savedSession = await studioSessionRepository.getById(session.id);

      assert.equal(result.reviewClusterCount, 0);
      assert.equal(savedSession?.candidateClusters.length, 0);
      assert.equal(savedSession?.unassignedPhotoCount, 2);
    });
  });
});
