interface CodexListingArgsInput {
  runDir: string;
  schemaPath: string;
  resultPath: string;
  imagePaths: string[];
  model: string;
}

export function buildCodexListingArgs(input: CodexListingArgsInput) {
  const args = [
    "exec",
    "--cd",
    input.runDir,
    "--sandbox",
    "read-only",
    "--ephemeral",
    "--ignore-rules",
    "--output-schema",
    input.schemaPath,
    "--output-last-message",
    input.resultPath,
  ];

  if (input.model !== "default") {
    args.push("--model", input.model);
  }

  for (const imagePath of input.imagePaths) {
    args.push("--image", imagePath);
  }

  args.push("-");

  return args;
}
