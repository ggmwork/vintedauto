import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { mutateJsonFile, readJsonFile } from "@/lib/data/json-store";

interface CounterStore {
  count: number;
  values: number[];
}

function normalizeCounterStore(value: unknown): CounterStore {
  const candidate = value && typeof value === "object"
    ? (value as Partial<CounterStore>)
    : {};

  return {
    count: typeof candidate.count === "number" ? candidate.count : 0,
    values: Array.isArray(candidate.values)
      ? candidate.values.filter((entry): entry is number => typeof entry === "number")
      : [],
  };
}

describe("json store", () => {
  it("serializes read-modify-write mutations for the same file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vintedauto-json-"));
    const filePath = path.join(root, "counter.json");
    const createFallback = () => ({ count: 0, values: [] });

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        mutateJsonFile(
          filePath,
          createFallback,
          normalizeCounterStore,
          async (store) => {
            await new Promise((resolve) => {
              setTimeout(resolve, index % 3);
            });

            return {
              count: store.count + 1,
              values: [...store.values, index],
            };
          }
        )
      )
    );

    const store = await readJsonFile(
      filePath,
      createFallback,
      normalizeCounterStore
    );

    assert.equal(store.count, 20);
    assert.equal(new Set(store.values).size, 20);
  });
});
