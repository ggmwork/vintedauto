import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertAllowedLocalCliExecutable,
  createLocalCliEnvironment,
  LocalCliCommandError,
  resolveLocalCliCommand,
} from "@/lib/ai/local-cli-command-runner";
import { buildCodexListingArgs } from "@/lib/ai/local-cli-codex";
import { parseLocalCliJsonPayload } from "@/lib/ai/local-cli-output";

describe("local CLI provider", () => {
  it("keeps local CLI command environment narrow", () => {
    const env = createLocalCliEnvironment({
      PATH: "C:\\bin",
      OPENAI_API_KEY: "secret-openai",
      ANTHROPIC_API_KEY: "secret-anthropic",
      USERPROFILE: "C:\\Users\\USER",
    });

    assert.equal(env.PATH, "C:\\bin");
    assert.equal(env.USERPROFILE, "C:\\Users\\USER");
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
  });

  it("rejects local CLI executables outside the allowlist", () => {
    assert.throws(
      () => assertAllowedLocalCliExecutable("powershell"),
      LocalCliCommandError
    );
  });

  it("uses the npm Codex launcher on Windows", () => {
    const command = resolveLocalCliCommand({
      executable: "codex",
      args: ["--version"],
      env: {
        APPDATA: "C:\\Users\\Seller\\AppData\\Roaming",
      },
      fileExists: (filePath) =>
        filePath.endsWith(
          "AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js"
        ),
      nodePath: "C:\\Program Files\\nodejs\\node.exe",
      platform: "win32",
    });

    assert.equal(command.executable, "C:\\Program Files\\nodejs\\node.exe");
    assert.deepEqual(command.args, [
      "C:\\Users\\Seller\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
      "--version",
    ]);
  });

  it("finds Codex from USERPROFILE when APPDATA points elsewhere", () => {
    const command = resolveLocalCliCommand({
      executable: "codex",
      args: ["exec", "--help"],
      env: {
        APPDATA: "C:\\Users\\Sandbox\\AppData\\Roaming",
        USERPROFILE: "C:\\Users\\Seller",
      },
      fileExists: (filePath) =>
        filePath ===
        "C:\\Users\\Seller\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
      nodePath: "node.exe",
      platform: "win32",
    });

    assert.deepEqual(command, {
      executable: "node.exe",
      args: [
        "C:\\Users\\Seller\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
        "exec",
        "--help",
      ],
    });
  });

  it("finds Codex from PATH npm roots on Windows", () => {
    const command = resolveLocalCliCommand({
      executable: "codex",
      args: ["--version"],
      env: {
        Path: [
          "C:\\Windows\\System32",
          "C:\\Users\\Seller\\AppData\\Roaming\\npm",
        ].join(";"),
      },
      fileExists: (filePath) =>
        filePath ===
        "C:\\Users\\Seller\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js",
      nodePath: "node.exe",
      platform: "win32",
    });

    assert.equal(command.executable, "node.exe");
    assert.equal(
      command.args[0],
      "C:\\Users\\Seller\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js"
    );
  });

  it("builds a locked down Codex exec command", () => {
    const args = buildCodexListingArgs({
      runDir: "C:\\tmp\\run",
      schemaPath: "C:\\tmp\\run\\schema.json",
      resultPath: "C:\\tmp\\run\\result.json",
      imagePaths: ["C:\\tmp\\run\\image-01.jpg", "C:\\tmp\\run\\image-02.jpg"],
      model: "gpt-5.4",
    });

    assert.deepEqual(args.slice(0, 10), [
      "exec",
      "--cd",
      "C:\\tmp\\run",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--ignore-rules",
      "--output-schema",
      "C:\\tmp\\run\\schema.json",
      "--output-last-message",
    ]);
    assert.equal(args.includes("--ask-for-approval"), false);
    assert.ok(args.includes("--model"));
    assert.ok(args.includes("gpt-5.4"));
    assert.equal(args.filter((entry) => entry === "--image").length, 2);
    assert.equal(args.at(-1), "-");
  });

  it("omits Codex model flag when default model is requested", () => {
    const args = buildCodexListingArgs({
      runDir: "C:\\tmp\\run",
      schemaPath: "C:\\tmp\\run\\schema.json",
      resultPath: "C:\\tmp\\run\\result.json",
      imagePaths: ["C:\\tmp\\run\\image-01.jpg"],
      model: "default",
    });

    assert.equal(args.includes("--model"), false);
  });

  it("parses exact, fenced, and wrapped JSON output", () => {
    assert.deepEqual(parseLocalCliJsonPayload('{"title":"Shirt"}'), {
      title: "Shirt",
    });
    assert.deepEqual(parseLocalCliJsonPayload('```json\n{"title":"Coat"}\n```'), {
      title: "Coat",
    });
    assert.deepEqual(parseLocalCliJsonPayload('Result:\n{"title":"Bag"}\nDone.'), {
      title: "Bag",
    });
  });

  it("rejects local CLI output without JSON", () => {
    assert.throws(
      () => parseLocalCliJsonPayload("no structured payload"),
      /no JSON object/
    );
  });
});
