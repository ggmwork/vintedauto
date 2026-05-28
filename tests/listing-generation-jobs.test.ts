import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  createListingGenerationJob,
  listListingGenerationJobs,
  normalizeListingGenerationJob,
} from "@/lib/listing-generation-jobs";

async function withTempDatabase<T>(callback: () => Promise<T>) {
  const previousRoot = process.env.VINTEDAUTO_DATA_DIR;
  process.env.VINTEDAUTO_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "vintedauto-jobs-")
  );

  try {
    return await callback();
  } finally {
    if (previousRoot === undefined) {
      delete process.env.VINTEDAUTO_DATA_DIR;
    } else {
      process.env.VINTEDAUTO_DATA_DIR = previousRoot;
    }
  }
}

describe("listing generation jobs", () => {
  it("normalizes a running stock item job", () => {
    const job = normalizeListingGenerationJob({
      id: "job-1",
      targetType: "stock-item",
      sessionId: "session-1",
      stockItemId: "stock-1",
      label: "Item 1",
      status: "running",
      message: "Generating.",
      createdAt: "2026-05-19T10:00:00.000Z",
      startedAt: "2026-05-19T10:00:00.000Z",
      updatedAt: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(job?.id, "job-1");
    assert.equal(job?.targetType, "stock-item");
    assert.equal(job?.status, "running");
    assert.equal(job?.error, null);
  });

  it("rejects jobs without a valid target", () => {
    assert.equal(
      normalizeListingGenerationJob({
        id: "job-1",
        targetType: "bad",
      }),
      null
    );
  });

  it("deduplicates concurrent active jobs for the same target", async () => {
    await withTempDatabase(async () => {
      const [first, second] = await Promise.all([
        createListingGenerationJob({
          targetType: "stock-item",
          sessionId: "session-1",
          stockItemId: "stock-1",
          label: "Stock 1",
        }),
        createListingGenerationJob({
          targetType: "stock-item",
          sessionId: "session-1",
          stockItemId: "stock-1",
          label: "Stock 1",
        }),
      ]);
      const jobs = await listListingGenerationJobs();

      assert.equal(first.created, true);
      assert.equal(second.created, false);
      assert.equal(first.job.id, second.job.id);
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].status, "running");
    });
  });
});
