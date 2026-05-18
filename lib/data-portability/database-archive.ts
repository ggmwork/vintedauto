import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DATABASE_APP_NAME,
  DATABASE_SCHEMA_VERSION,
  ensureDatabaseManifest,
  getDatabaseRoot,
  normalizeDatabaseManifest,
  saveActiveDatabaseRoot,
} from "@/lib/data/database-root";
import { writeJsonFile } from "@/lib/data/json-store";
import {
  createStoreOnlyZip,
  readZipEntries,
  type ZipArchiveEntry,
} from "@/lib/data-portability/zip-archive";

const EXPORT_FORMAT = "vintedauto.database.export";
const EXPORT_FORMAT_VERSION = 1;

interface ExportManifest {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  createdAt: string;
  createdBy: {
    app: typeof DATABASE_APP_NAME;
    appVersion: string;
  };
  database: {
    databaseId: string;
    schemaVersion: number;
    label: string | null;
  };
  contents: DatabaseArchiveSummary;
  secrets: {
    aiSettingsIncluded: boolean;
    apiKeysIncluded: boolean;
  };
  files: Array<{
    path: string;
    sha256: string;
  }>;
}

export interface DatabaseArchiveSummary {
  sessions: number;
  stockItems: number;
  drafts: number;
  sessionPhotoAssets: number;
  draftImages: number;
}

export interface DatabaseImportValidation {
  ok: boolean;
  summary: DatabaseArchiveSummary;
  errors: string[];
  warnings: string[];
  manifest: ExportManifest | null;
}

function toArchiveTimestamp(value = new Date()) {
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`;
}

function safeJsonParse(value: Buffer, fallback: unknown) {
  try {
    return JSON.parse(value.toString("utf8"));
  } catch {
    return fallback;
  }
}

function sanitizeAiSettings(value: unknown) {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    ...candidate,
    openAiApiKey: null,
    anthropicApiKey: null,
  };
}

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { version?: unknown };

    return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

async function readOptionalFile(filePath: string, fallback: unknown) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return Buffer.from(JSON.stringify(fallback, null, 2));
    }

    throw error;
  }
}

async function listFilesRecursive(root: string, prefix = ""): Promise<ZipArchiveEntry[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = path.join(root, entry.name);
        const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;

        if (entry.isDirectory()) {
          return listFilesRecursive(absolutePath, relativePath);
        }

        if (!entry.isFile()) {
          return [];
        }

        return [
          {
            path: relativePath,
            data: await readFile(absolutePath),
          },
        ];
      })
    );

    return files.flat();
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

function summarizeStores(studioSessions: unknown, drafts: unknown): DatabaseArchiveSummary {
  const sessions: unknown[] = Array.isArray((studioSessions as { sessions?: unknown }).sessions)
    ? ((studioSessions as { sessions: unknown[] }).sessions)
    : [];
  const draftEntries: unknown[] = Array.isArray((drafts as { drafts?: unknown }).drafts)
    ? ((drafts as { drafts: unknown[] }).drafts)
    : [];

  return {
    sessions: sessions.length,
    stockItems: sessions.reduce<number>((total, session) => {
      const stockItems = (session as { stockItems?: unknown }).stockItems;
      return total + (Array.isArray(stockItems) ? stockItems.length : 0);
    }, 0),
    drafts: draftEntries.length,
    sessionPhotoAssets: sessions.reduce<number>((total, session) => {
      const photoAssets = (session as { photoAssets?: unknown }).photoAssets;
      return total + (Array.isArray(photoAssets) ? photoAssets.length : 0);
    }, 0),
    draftImages: draftEntries.reduce<number>((total, draft) => {
      const images = (draft as { images?: unknown }).images;
      return total + (Array.isArray(images) ? images.length : 0);
    }, 0),
  };
}

function collectReferencedImagePaths(studioSessions: unknown, drafts: unknown) {
  const sessionPhotoPaths = new Set<string>();
  const draftImagePaths = new Set<string>();
  const sessions: unknown[] = Array.isArray((studioSessions as { sessions?: unknown }).sessions)
    ? ((studioSessions as { sessions: unknown[] }).sessions)
    : [];
  const draftEntries: unknown[] = Array.isArray((drafts as { drafts?: unknown }).drafts)
    ? ((drafts as { drafts: unknown[] }).drafts)
    : [];

  for (const session of sessions) {
    const photoAssets = (session as { photoAssets?: unknown }).photoAssets;

    if (!Array.isArray(photoAssets)) {
      continue;
    }

    for (const photoAsset of photoAssets) {
      const storagePath = (photoAsset as { storagePath?: unknown }).storagePath;

      if (typeof storagePath === "string" && storagePath.trim()) {
        sessionPhotoPaths.add(storagePath.replace(/\\/g, "/"));
      }
    }
  }

  for (const draft of draftEntries) {
    const images = (draft as { images?: unknown }).images;

    if (!Array.isArray(images)) {
      continue;
    }

    for (const image of images) {
      const storagePath = (image as { storagePath?: unknown }).storagePath;

      if (typeof storagePath === "string" && storagePath.trim()) {
        draftImagePaths.add(storagePath.replace(/\\/g, "/"));
      }
    }
  }

  return { sessionPhotoPaths, draftImagePaths };
}

function hasInvalidStoragePath(value: string) {
  return (
    value.includes("\0") ||
    value.startsWith("/") ||
    value.startsWith("../") ||
    value.includes("/../") ||
    /^[a-zA-Z]:/.test(value)
  );
}

function normalizeImportedWatcher(value: unknown) {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const config =
    candidate.config && typeof candidate.config === "object"
      ? (candidate.config as Record<string, unknown>)
      : {};

  return {
    ...candidate,
    config: {
      ...config,
      enabled: false,
    },
    health: "idle",
    lastStartedAt: null,
    lastError: null,
  };
}

function requiredBuffer(entries: Map<string, Buffer>, name: string, errors: string[]) {
  const entry = entries.get(name);

  if (!entry) {
    errors.push(`Missing ${name}.`);
    return Buffer.from("{}");
  }

  return entry;
}

export async function buildDatabaseExportArchive({
  databaseRoot = getDatabaseRoot(),
  includeSecrets = false,
}: {
  databaseRoot?: string;
  includeSecrets?: boolean;
} = {}) {
  const manifest = await ensureDatabaseManifest(databaseRoot);
  const studioSessionsBuffer = await readOptionalFile(
    path.join(databaseRoot, "studio-sessions.json"),
    { sessions: [] }
  );
  const draftsBuffer = await readOptionalFile(path.join(databaseRoot, "drafts.json"), {
    drafts: [],
  });
  const watcherBuffer = await readOptionalFile(
    path.join(databaseRoot, "inbox-watcher.json"),
    {}
  );
  const rawAiSettingsBuffer = await readOptionalFile(
    path.join(databaseRoot, "ai-settings.json"),
    {}
  );
  const aiSettings = includeSecrets
    ? safeJsonParse(rawAiSettingsBuffer, {})
    : sanitizeAiSettings(safeJsonParse(rawAiSettingsBuffer, {}));
  const aiSettingsBuffer = Buffer.from(JSON.stringify(aiSettings, null, 2));
  const studioSessions = safeJsonParse(studioSessionsBuffer, { sessions: [] });
  const drafts = safeJsonParse(draftsBuffer, { drafts: [] });
  const summary = summarizeStores(studioSessions, drafts);
  const entries: ZipArchiveEntry[] = [
    {
      path: "data/database-manifest.json",
      data: Buffer.from(JSON.stringify(manifest, null, 2)),
    },
    { path: "data/drafts.json", data: draftsBuffer },
    { path: "data/studio-sessions.json", data: studioSessionsBuffer },
    { path: "data/inbox-watcher.json", data: watcherBuffer },
    { path: "data/ai-settings.json", data: aiSettingsBuffer },
    ...(await listFilesRecursive(
      path.join(databaseRoot, "session-photo-assets"),
      "session-photo-assets"
    )),
    ...(await listFilesRecursive(path.join(databaseRoot, "draft-images"), "draft-images")),
  ];
  const exportManifest: ExportManifest = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    createdBy: {
      app: DATABASE_APP_NAME,
      appVersion: getPackageVersion(),
    },
    database: {
      databaseId: manifest.databaseId,
      schemaVersion: manifest.schemaVersion,
      label: manifest.label,
    },
    contents: summary,
    secrets: {
      aiSettingsIncluded: true,
      apiKeysIncluded: includeSecrets,
    },
    files: entries.map((entry) => ({
      path: entry.path,
      sha256: sha256(entry.data),
    })),
  };
  const zipEntries = [
    {
      path: "export-manifest.json",
      data: Buffer.from(JSON.stringify(exportManifest, null, 2)),
    },
    ...entries,
  ];

  return {
    bytes: createStoreOnlyZip(zipEntries),
    fileName: `vintedauto-export-${toArchiveTimestamp()}.vintedauto.zip`,
    manifest: exportManifest,
    summary,
  };
}

export function validateDatabaseArchive(buffer: Buffer): DatabaseImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let entries: Map<string, Buffer>;

  try {
    entries = readZipEntries(buffer);
  } catch (error) {
    return {
      ok: false,
      summary: {
        sessions: 0,
        stockItems: 0,
        drafts: 0,
        sessionPhotoAssets: 0,
        draftImages: 0,
      },
      errors: [error instanceof Error ? error.message : "Archive could not be read."],
      warnings: [],
      manifest: null,
    };
  }

  const rawManifest = entries.get("export-manifest.json");
  let manifest: ExportManifest | null = null;

  if (!rawManifest) {
    errors.push("Missing export-manifest.json.");
  } else {
    try {
      const parsed = JSON.parse(rawManifest.toString("utf8")) as ExportManifest;

      if (
        parsed.format !== EXPORT_FORMAT ||
        parsed.formatVersion !== EXPORT_FORMAT_VERSION
      ) {
        errors.push("Archive export format is not supported.");
      }

      manifest = parsed;
    } catch {
      errors.push("Archive export manifest is invalid JSON.");
    }
  }

  const draftsBuffer = requiredBuffer(entries, "data/drafts.json", errors);
  const studioSessionsBuffer = requiredBuffer(
    entries,
    "data/studio-sessions.json",
    errors
  );
  const databaseManifestBuffer = requiredBuffer(
    entries,
    "data/database-manifest.json",
    errors
  );
  const drafts = safeJsonParse(draftsBuffer, null);
  const studioSessions = safeJsonParse(studioSessionsBuffer, null);
  const databaseManifest = safeJsonParse(databaseManifestBuffer, null);

  if (!drafts) {
    errors.push("data/drafts.json is invalid JSON.");
  }

  if (!studioSessions) {
    errors.push("data/studio-sessions.json is invalid JSON.");
  }

  if (!databaseManifest) {
    errors.push("data/database-manifest.json is invalid JSON.");
  } else {
    const normalizedManifest = normalizeDatabaseManifest(databaseManifest);

    if (normalizedManifest.schemaVersion > DATABASE_SCHEMA_VERSION) {
      errors.push("Archive database schema is newer than this app supports.");
    }
  }

  const summary = summarizeStores(
    studioSessions ?? { sessions: [] },
    drafts ?? { drafts: [] }
  );
  const { sessionPhotoPaths, draftImagePaths } = collectReferencedImagePaths(
    studioSessions ?? { sessions: [] },
    drafts ?? { drafts: [] }
  );

  for (const storagePath of sessionPhotoPaths) {
    if (hasInvalidStoragePath(storagePath)) {
      errors.push(`Invalid session photo path: ${storagePath}.`);
      continue;
    }

    if (!entries.has(`session-photo-assets/${storagePath}`)) {
      errors.push(`Missing session photo asset: ${storagePath}.`);
    }
  }

  for (const storagePath of draftImagePaths) {
    if (hasInvalidStoragePath(storagePath)) {
      errors.push(`Invalid draft image path: ${storagePath}.`);
      continue;
    }

    if (!entries.has(`draft-images/${storagePath}`)) {
      errors.push(`Missing draft image asset: ${storagePath}.`);
    }
  }

  if (manifest?.secrets.apiKeysIncluded) {
    warnings.push("Archive includes API keys.");
  } else {
    warnings.push("AI API keys are not included and must be configured on this computer.");
  }

  return {
    ok: errors.length === 0,
    summary,
    errors,
    warnings,
    manifest,
  };
}

async function extractArchiveToDatabaseRoot(entries: Map<string, Buffer>, targetRoot: string) {
  await mkdir(targetRoot, { recursive: true });

  for (const [entryPath, data] of entries) {
    if (entryPath === "export-manifest.json") {
      continue;
    }

    const targetRelativePath = entryPath.startsWith("data/")
      ? entryPath.slice("data/".length)
      : entryPath;

    if (!targetRelativePath) {
      continue;
    }

    const targetPath = path.resolve(targetRoot, targetRelativePath);
    const normalizedRoot = path.resolve(targetRoot);

    if (!targetPath.startsWith(normalizedRoot)) {
      throw new Error(`Archive path escapes database root: ${entryPath}`);
    }

    await mkdir(path.dirname(targetPath), { recursive: true });

    if (targetRelativePath === "inbox-watcher.json") {
      await writeJsonFile(targetPath, normalizeImportedWatcher(safeJsonParse(data, {})));
    } else {
      await writeFile(targetPath, data);
    }
  }
}

export async function replaceDatabaseFromArchive({
  archive,
  databaseRoot = getDatabaseRoot(),
}: {
  archive: Buffer;
  databaseRoot?: string;
}) {
  const validation = validateDatabaseArchive(archive);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const entries = readZipEntries(archive);
  const backup = await buildDatabaseExportArchive({ databaseRoot });
  const backupDirectory = path.join(process.cwd(), ".data-backups");
  const backupPath = path.join(backupDirectory, backup.fileName);
  const parentDirectory = path.dirname(databaseRoot);
  const tempRoot = path.join(parentDirectory, `.vintedauto-import-${randomUUID()}`);
  const rollbackRoot = path.join(parentDirectory, `.vintedauto-rollback-${randomUUID()}`);

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, backup.bytes);
  await extractArchiveToDatabaseRoot(entries, tempRoot);

  try {
    await rm(rollbackRoot, { recursive: true, force: true });

    try {
      await rename(databaseRoot, rollbackRoot);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }

    await rename(tempRoot, databaseRoot);
    await rm(rollbackRoot, { recursive: true, force: true });
  } catch (error) {
    await rm(databaseRoot, { recursive: true, force: true });

    try {
      await rename(rollbackRoot, databaseRoot);
    } catch {
      await rm(tempRoot, { recursive: true, force: true });
    }

    throw error;
  }

  await saveActiveDatabaseRoot(databaseRoot);

  return {
    backupPath,
    validation,
  };
}

export async function createDatabaseFolder({
  databaseRoot,
  label,
}: {
  databaseRoot: string;
  label?: string | null;
}) {
  const resolvedRoot = path.resolve(databaseRoot);

  await mkdir(resolvedRoot, { recursive: true });
  await ensureDatabaseManifest(resolvedRoot, label);
  await writeJsonFile(path.join(resolvedRoot, "drafts.json"), { drafts: [] });
  await writeJsonFile(path.join(resolvedRoot, "studio-sessions.json"), {
    sessions: [],
  });
  await mkdir(path.join(resolvedRoot, "draft-images"), { recursive: true });
  await mkdir(path.join(resolvedRoot, "session-photo-assets"), { recursive: true });
  await saveActiveDatabaseRoot(resolvedRoot);

  return resolvedRoot;
}

export async function openDatabaseFolder(databaseRoot: string) {
  const resolvedRoot = path.resolve(databaseRoot);
  const manifest = await ensureDatabaseManifest(resolvedRoot);

  await readOptionalFile(path.join(resolvedRoot, "drafts.json"), { drafts: [] });
  await readOptionalFile(path.join(resolvedRoot, "studio-sessions.json"), {
    sessions: [],
  });
  await saveActiveDatabaseRoot(resolvedRoot);

  return {
    databaseRoot: resolvedRoot,
    manifest,
  };
}
