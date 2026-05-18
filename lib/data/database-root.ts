import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { writeJsonFile } from "@/lib/data/json-store";

export const DATABASE_APP_NAME = "vintedauto";
export const DATABASE_SCHEMA_VERSION = 1;

export interface DatabaseManifest {
  app: typeof DATABASE_APP_NAME;
  schemaVersion: number;
  databaseId: string;
  createdAt: string;
  updatedAt: string;
  label: string | null;
}

interface LocalDatabaseConfig {
  activeDatabaseRoot: string | null;
  updatedAt: string | null;
}

const localConfigFilePath = path.join(
  process.cwd(),
  ".local",
  "database-config.json"
);

export function getDefaultDatabaseRoot() {
  return path.join(process.cwd(), ".data");
}

function normalizeLocalConfig(value: unknown): LocalDatabaseConfig {
  const candidate = value && typeof value === "object"
    ? (value as Partial<LocalDatabaseConfig>)
    : {};

  return {
    activeDatabaseRoot:
      typeof candidate.activeDatabaseRoot === "string" &&
      candidate.activeDatabaseRoot.trim().length > 0
        ? path.resolve(candidate.activeDatabaseRoot)
        : null,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
}

function readLocalDatabaseConfigSync() {
  try {
    const raw = readFileSync(localConfigFilePath, "utf8");
    return normalizeLocalConfig(JSON.parse(raw));
  } catch {
    return {
      activeDatabaseRoot: null,
      updatedAt: null,
    } satisfies LocalDatabaseConfig;
  }
}

export function getDatabaseRoot() {
  const envRoot = process.env.VINTEDAUTO_DATA_DIR?.trim();

  if (envRoot) {
    return path.resolve(envRoot);
  }

  return readLocalDatabaseConfigSync().activeDatabaseRoot ?? getDefaultDatabaseRoot();
}

export function getDatabasePath(...segments: string[]) {
  return path.join(getDatabaseRoot(), ...segments);
}

export async function saveActiveDatabaseRoot(databaseRoot: string | null) {
  const now = new Date().toISOString();
  const config: LocalDatabaseConfig = {
    activeDatabaseRoot: databaseRoot ? path.resolve(databaseRoot) : null,
    updatedAt: now,
  };

  await writeJsonFile(localConfigFilePath, config);
  return config;
}

function createDefaultDatabaseManifest(label?: string | null): DatabaseManifest {
  const now = new Date().toISOString();

  return {
    app: DATABASE_APP_NAME,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    databaseId: randomUUID(),
    createdAt: now,
    updatedAt: now,
    label: label?.trim() || null,
  };
}

export function normalizeDatabaseManifest(
  value: unknown,
  label?: string | null
): DatabaseManifest {
  const fallback = createDefaultDatabaseManifest(label);
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<DatabaseManifest>)
      : {};

  return {
    app: DATABASE_APP_NAME,
    schemaVersion:
      typeof candidate.schemaVersion === "number"
        ? candidate.schemaVersion
        : DATABASE_SCHEMA_VERSION,
    databaseId:
      typeof candidate.databaseId === "string" &&
      candidate.databaseId.trim().length > 0
        ? candidate.databaseId
        : fallback.databaseId,
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : fallback.createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : fallback.updatedAt,
    label:
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label.trim()
        : (label?.trim() || null),
  };
}

export async function ensureDatabaseManifest(
  databaseRoot = getDatabaseRoot(),
  label?: string | null
) {
  const manifestPath = path.join(databaseRoot, "database-manifest.json");

  await mkdir(databaseRoot, { recursive: true });

  try {
    const raw = await readFile(manifestPath, "utf8");
    return normalizeDatabaseManifest(JSON.parse(raw), label);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  const manifest = createDefaultDatabaseManifest(label);
  await writeJsonFile(manifestPath, manifest);
  return manifest;
}

export function ensureLocalDatabaseConfigDirectorySync() {
  mkdirSync(path.dirname(localConfigFilePath), { recursive: true });
}

export function writeLocalDatabaseConfigSync(config: LocalDatabaseConfig) {
  ensureLocalDatabaseConfigDirectorySync();
  writeFileSync(localConfigFilePath, JSON.stringify(config, null, 2));
}

export function hasLocalDatabaseConfig() {
  return existsSync(localConfigFilePath);
}
