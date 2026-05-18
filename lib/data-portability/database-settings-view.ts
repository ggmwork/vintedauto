import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  ensureDatabaseManifest,
  getDatabaseRoot,
} from "@/lib/data/database-root";

async function readJsonOptional(filePath: string, fallback: unknown) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function countFiles(root: string): Promise<number> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const counts = await Promise.all(
      entries.map((entry) => {
        if (entry.isDirectory()) {
          return countFiles(path.join(root, entry.name));
        }

        return entry.isFile() ? 1 : 0;
      })
    );

    return counts.reduce((total, count) => total + count, 0);
  } catch {
    return 0;
  }
}

export async function getDatabaseSettingsViewModel() {
  const databaseRoot = getDatabaseRoot();
  const manifest = await ensureDatabaseManifest(databaseRoot);
  const drafts = await readJsonOptional(path.join(databaseRoot, "drafts.json"), {
    drafts: [],
  });
  const sessions = await readJsonOptional(
    path.join(databaseRoot, "studio-sessions.json"),
    { sessions: [] }
  );
  const draftEntries: unknown[] = Array.isArray((drafts as { drafts?: unknown }).drafts)
    ? (drafts as { drafts: unknown[] }).drafts
    : [];
  const sessionEntries: unknown[] = Array.isArray(
    (sessions as { sessions?: unknown }).sessions
  )
    ? (sessions as { sessions: unknown[] }).sessions
    : [];

  return {
    databaseRoot,
    manifest,
    counts: {
      sessions: sessionEntries.length,
      stockItems: sessionEntries.reduce<number>((total, session) => {
        const stockItems = (session as { stockItems?: unknown }).stockItems;
        return total + (Array.isArray(stockItems) ? stockItems.length : 0);
      }, 0),
      drafts: draftEntries.length,
      sessionPhotoFiles: await countFiles(
        path.join(databaseRoot, "session-photo-assets")
      ),
      draftImageFiles: await countFiles(path.join(databaseRoot, "draft-images")),
    },
  };
}
