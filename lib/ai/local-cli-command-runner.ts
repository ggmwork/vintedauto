import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ALLOWED_LOCAL_CLI_EXECUTABLES = new Set(["codex", "claude", "ollama"]);
const DEFAULT_OUTPUT_LIMIT_BYTES = 64 * 1024;
const IMPORTANT_LOCAL_CLI_DETAIL_PATTERN =
  /reading prompt from stdin|error|warn|failed|timeout|timed out|denied|not found|quota|limit|login|required|invalid/i;

const SAFE_ENV_KEYS = [
  "APPDATA",
  "CODEX_HOME",
  "COMSPEC",
  "HOME",
  "LOCALAPPDATA",
  "Path",
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "TEMP",
  "TMP",
  "USERDOMAIN",
  "USERNAME",
  "USERPROFILE",
  "WINDIR",
];

export interface LocalCliCommandResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface LocalCliCommandInput {
  executable: string;
  args: string[];
  cwd?: string;
  stdin?: string;
  timeoutMs: number;
  outputLimitBytes?: number;
}

export class LocalCliCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalCliCommandError";
  }
}

function getNonEmptyLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getLocalCliFailureDetails(
  result: LocalCliCommandResult,
  maxLength = 1_200
) {
  const lines = [...getNonEmptyLines(result.stderr), ...getNonEmptyLines(result.stdout)];
  const relevantLines = lines.filter((line) =>
    IMPORTANT_LOCAL_CLI_DETAIL_PATTERN.test(line)
  );
  const details = (relevantLines.length > 0 ? relevantLines : lines).join("\n");

  return details.slice(0, maxLength);
}

export function isTransientCodexCliFailure(result: LocalCliCommandResult) {
  const text = `${result.stderr}\n${result.stdout}`.toLowerCase();

  return (
    text.includes("failed to refresh available models") ||
    text.includes("timeout waiting for child process to exit")
  );
}

export function createLocalCliEnvironment(
  source: Record<string, string | undefined> = process.env
) {
  const env: Record<string, string> = {};

  for (const key of SAFE_ENV_KEYS) {
    const value = source[key];

    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }

  return env;
}

function appendLimited(
  current: string,
  chunk: Buffer,
  limitBytes: number
): { value: string; truncated: boolean } {
  const next = current + chunk.toString("utf8");

  if (Buffer.byteLength(next, "utf8") <= limitBytes) {
    return {
      value: next,
      truncated: false,
    };
  }

  return {
    value: Buffer.from(next, "utf8").subarray(0, limitBytes).toString("utf8"),
    truncated: true,
  };
}

export function assertAllowedLocalCliExecutable(executable: string) {
  if (!ALLOWED_LOCAL_CLI_EXECUTABLES.has(executable)) {
    throw new LocalCliCommandError(`Unsupported local CLI executable: ${executable}`);
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getNpmRoots(env: Record<string, string | undefined>) {
  const pathEntries = unique(
    [env.PATH, env.Path]
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.split(path.delimiter))
  );

  return unique([
    env.APPDATA ? path.join(env.APPDATA, "npm") : "",
    env.USERPROFILE ? path.join(env.USERPROFILE, "AppData", "Roaming", "npm") : "",
    ...pathEntries,
  ]);
}

function getCodexNpmLauncherCandidates(env: Record<string, string | undefined>) {
  return getNpmRoots(env).map((npmRoot) =>
    path.join(npmRoot, "node_modules", "@openai", "codex", "bin", "codex.js")
  );
}

function getCodexNativeBinaryCandidates(env: Record<string, string | undefined>) {
  return unique([
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "OpenAI", "Codex", "bin", "codex.exe") : "",
    env.USERPROFILE
      ? path.join(env.USERPROFILE, "AppData", "Local", "OpenAI", "Codex", "bin", "codex.exe")
      : "",
  ]);
}

function getClaudeNativeBinaryCandidates(env: Record<string, string | undefined>) {
  return getNpmRoots(env).map((npmRoot) =>
    path.join(
      npmRoot,
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "bin",
      "claude.exe"
    )
  );
}

interface ResolveLocalCliCommandInput {
  executable: string;
  args: string[];
  env?: Record<string, string | undefined>;
  fileExists?: (filePath: string) => boolean;
  nodePath?: string;
  platform?: NodeJS.Platform;
}

export function resolveLocalCliCommand(input: ResolveLocalCliCommandInput) {
  assertAllowedLocalCliExecutable(input.executable);

  const platform = input.platform ?? process.platform;
  const env = input.env ?? process.env;
  const fileExists = input.fileExists ?? existsSync;

  if (input.executable === "codex" && platform === "win32") {
    for (const codexBinary of getCodexNativeBinaryCandidates(env)) {
      if (!fileExists(codexBinary)) {
        continue;
      }

      return {
        executable: codexBinary,
        args: input.args,
      };
    }

    for (const npmCodexLauncher of getCodexNpmLauncherCandidates(env)) {
      if (!fileExists(npmCodexLauncher)) {
        continue;
      }

      return {
        executable: input.nodePath ?? process.execPath,
        args: [npmCodexLauncher, ...input.args],
      };
    }
  }

  // The npm shims for Claude Code (claude.cmd/.ps1) are not spawnable with
  // shell:false, so resolve the bundled native binary directly on Windows.
  if (input.executable === "claude" && platform === "win32") {
    for (const claudeBinary of getClaudeNativeBinaryCandidates(env)) {
      if (!fileExists(claudeBinary)) {
        continue;
      }

      return {
        executable: claudeBinary,
        args: input.args,
      };
    }
  }

  return {
    executable: input.executable,
    args: input.args,
  };
}

export function runLocalCliCommand(
  input: LocalCliCommandInput
): Promise<LocalCliCommandResult> {
  const command = resolveLocalCliCommand({
    executable: input.executable,
    args: input.args,
  });

  const outputLimitBytes = input.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT_BYTES;

  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: input.cwd,
      env: createLocalCliEnvironment() as NodeJS.ProcessEnv,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams;
    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, input.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const result = appendLimited(stdout, chunk, outputLimitBytes);
      stdout = result.value;
      stdoutTruncated = stdoutTruncated || result.truncated;
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const result = appendLimited(stderr, chunk, outputLimitBytes);
      stderr = result.value;
      stderrTruncated = stderrTruncated || result.truncated;
    });

    child.on("error", (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(
          new LocalCliCommandError(
            `${input.executable} timed out after ${input.timeoutMs} ms.`
          )
        );
        return;
      }

      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated,
      });
    });

    child.stdin.end(input.stdin ?? "");
  });
}
