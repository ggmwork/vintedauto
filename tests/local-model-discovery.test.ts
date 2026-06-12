import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEmptyLocalModelDiscoveryCache,
  normalizeLocalModelDiscoveryCache,
  parseCodexConfigModels,
  parseOllamaListOutput,
} from "@/lib/ai/local-model-discovery";
import { assertAllowedLocalCliExecutable } from "@/lib/ai/local-cli-command-runner";

describe("local model discovery", () => {
  it("parses ollama list output", () => {
    const models = parseOllamaListOutput(`NAME              ID       SIZE      MODIFIED
qwen3-vl:8b       abc123   6.1 GB    2 days ago
qwen3.5:9b        def456   6.6 GB    2 days ago
qwen3-vl:8b       abc123   6.1 GB    2 days ago
`);

    assert.deepEqual(
      models.map((model) => model.id),
      ["qwen3-vl:8b", "qwen3.5:9b"]
    );
  });

  it("normalizes partial discovery cache", () => {
    const cache = normalizeLocalModelDiscoveryCache({
      scannedAt: "2026-05-18T12:00:00.000Z",
      tools: {
        codex: {
          available: true,
          version: "codex-cli 0.130.0-alpha.5",
          models: [{ id: "default", label: "", source: "known" }],
          message: "ok",
        },
      },
    });

    assert.equal(cache.scannedAt, "2026-05-18T12:00:00.000Z");
    assert.equal(cache.tools.codex.available, true);
    assert.equal(cache.tools.codex.models[0].label, "default");
    assert.equal(cache.tools.ollama.message, "Not scanned yet.");
  });

  it("parses codex config models from top level and profiles", () => {
    const models = parseCodexConfigModels(
      [
        '# codex config',
        'model = "gpt-5.5"  # default',
        'model_reasoning_effort = "xhigh"',
        '',
        '[profiles.fast]',
        "model = 'o4-mini'",
        '',
        '[profiles.deep]',
        'model = "o3"',
      ].join("\n")
    );

    assert.deepEqual(
      models.map((model) => model.id),
      ["gpt-5.5", "o4-mini", "o3"]
    );
    assert.equal(models[0].source, "detected");
    assert.equal(models[1].label, "o4-mini (fast)");
  });

  it("dedupes repeated codex config models", () => {
    const models = parseCodexConfigModels(
      ['model = "gpt-5.5"', '[profiles.x]', 'model = "gpt-5.5"'].join("\n")
    );

    assert.equal(models.length, 1);
    assert.equal(models[0].id, "gpt-5.5");
  });

  it("creates empty discovery cache", () => {
    const cache = createEmptyLocalModelDiscoveryCache();

    assert.equal(cache.scannedAt, null);
    assert.equal(cache.tools.ollama.available, false);
    assert.equal(cache.tools.codex.available, false);
    assert.equal(cache.tools.claude.available, false);
  });

  it("allows ollama model discovery command", () => {
    assert.doesNotThrow(() => assertAllowedLocalCliExecutable("ollama"));
  });

  it("allows codex model discovery command", () => {
    assert.doesNotThrow(() => assertAllowedLocalCliExecutable("codex"));
  });
});
