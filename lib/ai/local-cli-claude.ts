interface ClaudeListingArgsInput {
  runDir: string;
  model: string;
}

export function buildClaudeListingArgs(input: ClaudeListingArgsInput) {
  const args = [
    "--print",
    "--output-format",
    "json",
    "--add-dir",
    input.runDir,
    "--permission-mode",
    "default",
    "--allowedTools",
    "Read",
  ];

  if (input.model !== "default") {
    args.push("--model", input.model);
  }

  return args;
}

interface ClaudeResultEnvelope {
  is_error?: unknown;
  result?: unknown;
}

export function extractClaudeResultText(stdout: string): string {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new Error("Claude Code CLI returned no output.");
  }

  let envelope: ClaudeResultEnvelope;

  try {
    envelope = JSON.parse(trimmed) as ClaudeResultEnvelope;
  } catch {
    // Not the JSON envelope (e.g. text output). Hand the raw text downstream
    // so the shared JSON extractor can still locate the listing object.
    return trimmed;
  }

  if (envelope.is_error === true) {
    const detail =
      typeof envelope.result === "string" && envelope.result.trim()
        ? envelope.result.trim()
        : "unknown error";

    throw new Error(`Claude Code CLI reported an error: ${detail}`);
  }

  if (typeof envelope.result === "string") {
    return envelope.result;
  }

  return trimmed;
}
