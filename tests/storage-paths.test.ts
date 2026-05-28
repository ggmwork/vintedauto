import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { photoAssetStorage } from "@/lib/intake";
import { draftImageStorage } from "@/lib/storage";

async function withTempDatabase<T>(callback: () => Promise<T>) {
  const previousRoot = process.env.VINTEDAUTO_DATA_DIR;
  process.env.VINTEDAUTO_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "vintedauto-storage-")
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

describe("local storage path containment", () => {
  it("rejects draft image paths outside the image root", async () => {
    await withTempDatabase(async () => {
      await assert.rejects(
        () => draftImageStorage.read("../draft-images2/secret.jpg"),
        /Invalid image storage path/
      );
      await assert.rejects(
        () =>
          draftImageStorage.upload({
            draftId: "../draft-images2",
            imageId: "secret",
            fileName: "secret.jpg",
            contentType: "image/jpeg",
            bytes: new Uint8Array([1]).buffer,
          }),
        /Invalid image storage path/
      );
    });
  });

  it("rejects photo asset paths outside the asset root", async () => {
    await withTempDatabase(async () => {
      await assert.rejects(
        () => photoAssetStorage.read("../session-photo-assets2/secret.jpg"),
        /Invalid photo asset storage path/
      );
      await assert.rejects(
        () =>
          photoAssetStorage.upload({
            sessionId: "../session-photo-assets2",
            assetId: "secret",
            fileName: "secret.jpg",
            contentType: "image/jpeg",
            bytes: new Uint8Array([1]).buffer,
          }),
        /Invalid photo asset storage path/
      );
    });
  });
});
