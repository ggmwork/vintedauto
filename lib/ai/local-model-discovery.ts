import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { getDatabasePath } from "@/lib/data/database-root";
import { writeJsonFile } from "@/lib/data/json-store";
import {
  runLocalCliCommand,
  type LocalCliCommandResult,
} from "@/lib/ai/local-cli-command-runner";

export type LocalModelToolId = "ollama" | "codex" | "claude";
export type LocalModelSource = "detected" | "known";

export interface DiscoveredLocalModel {
  id: string;
  label: string;
  source: LocalModelSource;
  note: string | null;
}

export interface LocalModelDiscoveryTool {
  id: LocalModelToolId;
  label: string;
  available: boolean;
  version: string | null;
  models: DiscoveredLocalModel[];
  message: string;
}

export interface LocalModelDiscoveryCache {
  scannedAt: string | null;
  tools: Record<LocalModelToolId, LocalModelDiscoveryTool>;
}

const TOOL_LABELS: Record<LocalModelToolId, string> = {
  ollama: "Ollama",
  codex: "Codex CLI",
  claude: "Claude Code",
};

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

function getCacheFilePath() {
  return getDatabasePath("local-ai-model-cache.json");
}

function createTool(
  id: LocalModelToolId,
  input: Partial<Omit<LocalModelDiscoveryTool, "id" | "label">> = {}
): LocalModelDiscoveryTool {
  return {
    id,
    label: TOOL_LABELS[id],
    available: input.available ?? false,
    version: input.version ?? null,
    models: input.models ?? [],
    message: input.message ?? "Not scanned yet.",
  };
}

export function createEmptyLocalModelDiscoveryCache(): LocalModelDiscoveryCache {
  return {
    scannedAt: null,
    tools: {
      ollama: createTool("ollama"),
      codex: createTool("codex"),
      claude: createTool("claude"),
    },
  };
}

function normalizeModel(value: unknown): DiscoveredLocalModel | null {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<DiscoveredLocalModel>)
      : {};
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";

  if (!id) {
    return null;
  }

  return {
    id,
    label:
      typeof candidate.label === "string" && candidate.label.trim()
        ? candidate.label.trim()
        : id,
    source: candidate.source === "known" ? "known" : "detected",
    note:
      typeof candidate.note === "string" && candidate.note.trim()
        ? candidate.note.trim()
        : null,
  };
}

function normalizeTool(
  toolId: LocalModelToolId,
  value: unknown
): LocalModelDiscoveryTool {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<LocalModelDiscoveryTool>)
      : {};
  const models = Array.isArray(candidate.models)
    ? candidate.models
        .map(normalizeModel)
        .filter((model): model is DiscoveredLocalModel => Boolean(model))
    : [];

  return createTool(toolId, {
    available: candidate.available === true,
    version:
      typeof candidate.version === "string" && candidate.version.trim()
        ? candidate.version.trim()
        : null,
    models,
    message:
      typeof candidate.message === "string" && candidate.message.trim()
        ? candidate.message.trim()
        : "Not scanned yet.",
  });
}

export function normalizeLocalModelDiscoveryCache(
  value: unknown
): LocalModelDiscoveryCache {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<LocalModelDiscoveryCache>)
      : {};

  return {
    scannedAt:
      typeof candidate.scannedAt === "string" && candidate.scannedAt.trim()
        ? candidate.scannedAt.trim()
        : null,
    tools: {
      ollama: normalizeTool("ollama", candidate.tools?.ollama),
      codex: normalizeTool("codex", candidate.tools?.codex),
      claude: normalizeTool("claude", candidate.tools?.claude),
    },
  };
}

export function readLocalModelDiscoveryCacheSync() {
  try {
    const raw = readFileSync(getCacheFilePath(), "utf8");
    return normalizeLocalModelDiscoveryCache(JSON.parse(raw));
  } catch {
    return createEmptyLocalModelDiscoveryCache();
  }
}

export async function readLocalModelDiscoveryCache() {
  try {
    const raw = await readFile(getCacheFilePath(), "utf8");
    return normalizeLocalModelDiscoveryCache(JSON.parse(raw));
  } catch {
    return createEmptyLocalModelDiscoveryCache();
  }
}

async function writeLocalModelDiscoveryCache(cache: LocalModelDiscoveryCache) {
  await writeJsonFile(getCacheFilePath(), cache);
  return cache;
}

function uniqModels(models: DiscoveredLocalModel[]) {
  const seen = new Set<string>();
  const result: DiscoveredLocalModel[] = [];

  for (const model of models) {
    const key = model.id.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(model);
  }

  return result;
}

export function parseOllamaListOutput(output: string): DiscoveredLocalModel[] {
  return uniqModels(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("name "))
      .map((line) => line.split(/\s+/)[0])
      .filter((name) => name.includes(":"))
      .map((id) => ({
        id,
        label: id,
        source: "detected" as const,
        note: "Detected from ollama list.",
      }))
  );
}

async function runOptionalCommand(
  executable: LocalModelToolId,
  args: string[],
  timeoutMs = 8_000
): Promise<LocalCliCommandResult | null> {
  try {
    return await runLocalCliCommand({
      executable,
      args,
      timeoutMs,
    });
  } catch {
    return null;
  }
}

function commandText(result: LocalCliCommandResult | null) {
  return result ? `${result.stdout}\n${result.stderr}`.trim() : "";
}

function cleanVersion(value: string) {
  return value.split(/\r?\n/)[0]?.trim() || null;
}

function getDiscoveryOllamaBaseUrl() {
  const envUrl =
    process.env.OLLAMA_BASE_URL?.trim() ||
    process.env.VINTEDAUTO_OLLAMA_BASE_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  try {
    const raw = readFileSync(getDatabasePath("ai-settings.json"), "utf8");
    const parsed = JSON.parse(raw) as { ollamaBaseUrl?: unknown };
    const savedUrl = parsed.ollamaBaseUrl;

    return typeof savedUrl === "string" && savedUrl.trim()
      ? savedUrl.trim()
      : DEFAULT_OLLAMA_BASE_URL;
  } catch {
    return DEFAULT_OLLAMA_BASE_URL;
  }
}

async function discoverOllamaTool(): Promise<LocalModelDiscoveryTool> {
  const versionResult = await runOptionalCommand("ollama", ["--version"]);
  const version = cleanVersion(commandText(versionResult));
  const apiModels: DiscoveredLocalModel[] = [];
  let apiError: string | null = null;

  try {
    const response = await fetch(`${getDiscoveryOllamaBaseUrl()}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      apiError = `Ollama API failed (${response.status}).`;
    } else {
      const payload = (await response.json()) as {
        models?: Array<{ name?: string }>;
      };

      apiModels.push(
        ...uniqModels(
          (payload.models ?? [])
            .map((model) => model.name?.trim())
            .filter((name): name is string => Boolean(name))
            .map((id) => ({
              id,
              label: id,
              source: "detected" as const,
              note: "Detected from Ollama API.",
            }))
        )
      );
    }
  } catch (error) {
    apiError = error instanceof Error ? error.message : "Ollama API unavailable.";
  }

  if (apiModels.length > 0) {
    return createTool("ollama", {
      available: true,
      version,
      models: apiModels,
      message: `Detected ${apiModels.length} Ollama model${apiModels.length === 1 ? "" : "s"}.`,
    });
  }

  const listResult = await runOptionalCommand("ollama", ["list"]);
  const listModels =
    listResult?.exitCode === 0 ? parseOllamaListOutput(listResult.stdout) : [];

  if (listModels.length > 0) {
    return createTool("ollama", {
      available: true,
      version,
      models: listModels,
      message: `Detected ${listModels.length} Ollama model${listModels.length === 1 ? "" : "s"} from CLI.`,
    });
  }

  return createTool("ollama", {
    available: Boolean(version),
    version,
    models: [],
    message: version
      ? apiError ?? "Ollama installed, but no models were detected."
      : "Ollama not found or not running.",
  });
}

async function discoverCodexTool(): Promise<LocalModelDiscoveryTool> {
  const versionResult = await runOptionalCommand("codex", ["--version"]);

  if (versionResult?.exitCode !== 0) {
    return createTool("codex", {
      message: "Codex CLI not found.",
    });
  }

  const helpResult = await runOptionalCommand("codex", ["exec", "--help"]);
  const helpText = commandText(helpResult);
  const supportsModelFlag = helpText.includes("--model");
  const version = cleanVersion(commandText(versionResult));

  return createTool("codex", {
    available: true,
    version,
    models: [],
    message: supportsModelFlag
      ? "Codex CLI detected. It does not expose a model list, so normal routing needs manual override."
      : "Codex CLI detected, but model flag was not found in help output.",
  });
}

async function discoverClaudeTool(): Promise<LocalModelDiscoveryTool> {
  const versionResult = await runOptionalCommand("claude", ["--version"]);

  if (versionResult?.exitCode !== 0) {
    return createTool("claude", {
      message: "Claude Code CLI not found.",
    });
  }

  const version = cleanVersion(commandText(versionResult));

  return createTool("claude", {
    available: true,
    version,
    models: [],
    message:
      "Claude Code CLI detected. It does not expose a model list, so normal routing needs manual override.",
  });
}

export async function refreshLocalModelDiscovery() {
  const [ollama, codex, claude] = await Promise.all([
    discoverOllamaTool(),
    discoverCodexTool(),
    discoverClaudeTool(),
  ]);
  const cache: LocalModelDiscoveryCache = {
    scannedAt: new Date().toISOString(),
    tools: {
      ollama,
      codex,
      claude,
    },
  };

  return writeLocalModelDiscoveryCache(cache);
}
