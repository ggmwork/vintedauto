import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildDatabaseExportArchive,
  validateDatabaseArchive,
} from "@/lib/data-portability/database-archive";
import {
  createStoreOnlyZip,
  readZipEntries,
} from "@/lib/data-portability/zip-archive";

async function createPortableFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "vintedauto-db-"));
  const sessionId = "session-1";
  const photoId = "photo-1";
  const draftId = "draft-1";
  const imageId = "image-1";

  await mkdir(path.join(root, "session-photo-assets", sessionId), {
    recursive: true,
  });
  await mkdir(path.join(root, "draft-images", draftId), { recursive: true });
  await writeFile(
    path.join(root, "session-photo-assets", sessionId, `${photoId}.jpg`),
    Buffer.from("photo")
  );
  await writeFile(
    path.join(root, "draft-images", draftId, `${imageId}.jpg`),
    Buffer.from("image")
  );
  await writeFile(
    path.join(root, "studio-sessions.json"),
    JSON.stringify(
      {
        sessions: [
          {
            id: sessionId,
            stockItems: [{ id: "stock-1" }],
            photoAssets: [
              {
                id: photoId,
                storagePath: `${sessionId}/${photoId}.jpg`,
              },
            ],
          },
        ],
      },
      null,
      2
    )
  );
  await writeFile(
    path.join(root, "drafts.json"),
    JSON.stringify(
      {
        drafts: [
          {
            id: draftId,
            images: [
              {
                id: imageId,
                storagePath: `${draftId}/${imageId}.jpg`,
              },
            ],
          },
        ],
      },
      null,
      2
    )
  );
  await writeFile(
    path.join(root, "ai-settings.json"),
    JSON.stringify(
      {
        listingProvider: "openai",
        openAiApiKey: "sk-secret",
        anthropicApiKey: "sk-ant-secret",
      },
      null,
      2
    )
  );

  return root;
}

describe("database portability", () => {
  it("exports metadata, images, and redacted AI settings", async () => {
    const root = await createPortableFixture();
    const archive = await buildDatabaseExportArchive({ databaseRoot: root });
    const entries = readZipEntries(archive.bytes);
    const aiSettings = JSON.parse(
      (entries.get("data/ai-settings.json") ?? Buffer.from("{}")).toString("utf8")
    ) as { openAiApiKey: unknown; anthropicApiKey: unknown };

    assert.equal(entries.has("data/drafts.json"), true);
    assert.equal(entries.has("data/studio-sessions.json"), true);
    assert.equal(entries.has("session-photo-assets/session-1/photo-1.jpg"), true);
    assert.equal(entries.has("draft-images/draft-1/image-1.jpg"), true);
    assert.equal(aiSettings.openAiApiKey, null);
    assert.equal(aiSettings.anthropicApiKey, null);

    const validation = validateDatabaseArchive(archive.bytes);

    assert.equal(validation.ok, true);
    assert.equal(validation.summary.stockItems, 1);
    assert.equal(validation.summary.drafts, 1);
  });

  it("rejects archives with missing referenced images", async () => {
    const archive = createStoreOnlyZip([
      {
        path: "export-manifest.json",
        data: Buffer.from(
          JSON.stringify({
            format: "vintedauto.database.export",
            formatVersion: 1,
            secrets: { apiKeysIncluded: false },
          })
        ),
      },
      {
        path: "data/database-manifest.json",
        data: Buffer.from(
          JSON.stringify({
            app: "vintedauto",
            schemaVersion: 1,
            databaseId: "db-1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            label: null,
          })
        ),
      },
      {
        path: "data/drafts.json",
        data: Buffer.from(
          JSON.stringify({
            drafts: [
              {
                id: "draft-1",
                images: [{ storagePath: "draft-1/missing.jpg" }],
              },
            ],
          })
        ),
      },
      {
        path: "data/studio-sessions.json",
        data: Buffer.from(JSON.stringify({ sessions: [] })),
      },
    ]);
    const validation = validateDatabaseArchive(archive);

    assert.equal(validation.ok, false);
    assert.match(validation.errors.join(" "), /Missing draft image asset/);
  });

  it("writes a readable ZIP archive", async () => {
    const zip = createStoreOnlyZip([
      { path: "folder/file.txt", data: Buffer.from("hello") },
    ]);
    const entries = readZipEntries(zip);

    assert.equal((entries.get("folder/file.txt") ?? Buffer.alloc(0)).toString(), "hello");
  });
});
