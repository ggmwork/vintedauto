import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeListingGenerationJob } from "@/lib/listing-generation-jobs";

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
});
