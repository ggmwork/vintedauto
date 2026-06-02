import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBulkListingTargetKey,
  getBulkListingTargets,
  parseBulkListingTargetKey,
} from "@/lib/inventory/bulk-listing-targets";
import type { StudioSessionDetail, StockItem } from "@/types/intake";
import type { ListingGenerationJob } from "@/types/listing-generation-job";

function createStockItem(input: Partial<StockItem> & Pick<StockItem, "id">): StockItem {
  return {
    id: input.id,
    sessionId: input.sessionId ?? "session-a",
    name: input.name ?? input.id,
    coverPhotoAssetId: null,
    photoAssetIds: input.photoAssetIds ?? ["photo-a"],
    draftId: input.draftId ?? null,
    inventoryStatus: input.inventoryStatus ?? "inventoried",
    sourceMethod: input.sourceMethod ?? "manual",
    confidence: input.confidence ?? "high",
    linkedCandidateClusterId: null,
    createdAt: input.createdAt ?? "2026-06-01T10:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-06-01T10:00:00.000Z",
  };
}

function createSession(stockItems: StockItem[]): StudioSessionDetail {
  return {
    id: "session-a",
    name: "Session A",
    status: "needs_stocking",
    intakeConfig: {
      sourceType: "watched-folder",
      startMode: "automatic",
      folderLabel: "watched",
      folderPath: "watched-inbox",
    },
    photoCount: 0,
    unassignedPhotoCount: 0,
    stockItemCount: stockItems.length,
    draftedStockItemCount: stockItems.filter((stockItem) => stockItem.draftId).length,
    pendingClusterCount: 0,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    photoAssets: [],
    stockItems,
    candidateClusters: [],
    groupingRuns: [],
  };
}

function createRunningJob(stockItemId: string): ListingGenerationJob {
  return {
    id: `job-${stockItemId}`,
    targetType: "stock-item",
    sessionId: "session-a",
    stockItemId,
    draftId: null,
    resultDraftId: null,
    label: stockItemId,
    status: "running",
    message: "Generating listing.",
    error: null,
    provider: null,
    model: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    startedAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    finishedAt: null,
  };
}

describe("bulk listing targets", () => {
  it("round-trips bulk listing target keys", () => {
    const key = buildBulkListingTargetKey("session-a", "stock-a");

    assert.deepEqual(parseBulkListingTargetKey(key), {
      sessionId: "session-a",
      stockItemId: "stock-a",
    });
    assert.equal(parseBulkListingTargetKey("bad-key"), null);
  });

  it("selects only ready inventory stock items", () => {
    const ready = createStockItem({ id: "ready" });
    const queued = createStockItem({
      id: "queued",
      inventoryStatus: "queued",
    });
    const drafted = createStockItem({
      id: "drafted",
      draftId: "draft-a",
    });
    const empty = createStockItem({
      id: "empty",
      photoAssetIds: [],
    });
    const running = createStockItem({ id: "running" });
    const targets = getBulkListingTargets({
      sessions: [createSession([ready, queued, drafted, empty, running])],
      generationJobs: [createRunningJob("running")],
      selectedTargetKeys: [ready, queued, drafted, empty, running].map((stockItem) =>
        buildBulkListingTargetKey("session-a", stockItem.id)
      ),
    });

    assert.deepEqual(
      targets.map((target) => target.stockItemId),
      ["ready"]
    );
  });
});
