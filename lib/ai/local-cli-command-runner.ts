import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const ALLOWED_LOCAL_CLI_EXECUTABLES = new Set(["codex", "claude", "ollama"]);
const DEFAULT_OUTPUT_LIMIT_BYTES = 64 * 1024;

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

export function runLocalCliCommand(
  input: LocalCliCommandInput
): Promise<LocalCliCommandResult> {
  assertAllowedLocalCliExecutable(input.executable);

  const outputLimitBytes = input.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT_BYTES;

  return new Promise((resolve, reject) => {
    const child = spawn(input.executable, input.args, {
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
