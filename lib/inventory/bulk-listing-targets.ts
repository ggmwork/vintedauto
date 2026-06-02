import { isInventoryStockItem } from "@/lib/intake/stock-item-inventory";
import type { StudioSessionDetail } from "@/types/intake";
import type { ListingGenerationJob } from "@/types/listing-generation-job";

const targetSeparator = "::";

export interface BulkListingTarget {
  key: string;
  sessionId: string;
  stockItemId: string;
  stockItemName: string;
}

export function buildBulkListingTargetKey(sessionId: string, stockItemId: string) {
  return `${sessionId}${targetSeparator}${stockItemId}`;
}

export function parseBulkListingTargetKey(value: string) {
  const [sessionId, stockItemId, extra] = value.split(targetSeparator);

  if (!sessionId || !stockItemId || extra !== undefined) {
    return null;
  }

  return {
    sessionId,
    stockItemId,
  };
}

function hasRunningStockItemGenerationJob(
  generationJobs: ListingGenerationJob[],
  sessionId: string,
  stockItemId: string
) {
  return generationJobs.some(
    (job) =>
      job.status === "running" &&
      job.targetType === "stock-item" &&
      job.sessionId === sessionId &&
      job.stockItemId === stockItemId
  );
}

export function getBulkListingTargets(input: {
  sessions: StudioSessionDetail[];
  generationJobs: ListingGenerationJob[];
  selectedTargetKeys: string[];
}) {
  const selectedKeys = new Set(input.selectedTargetKeys);
  const targets: BulkListingTarget[] = [];

  if (selectedKeys.size === 0) {
    return targets;
  }

  for (const session of input.sessions) {
    for (const stockItem of session.stockItems) {
      const key = buildBulkListingTargetKey(session.id, stockItem.id);

      if (!selectedKeys.has(key)) {
        continue;
      }

      if (
        !isInventoryStockItem(stockItem) ||
        stockItem.draftId !== null ||
        stockItem.photoAssetIds.length === 0 ||
        hasRunningStockItemGenerationJob(input.generationJobs, session.id, stockItem.id)
      ) {
        continue;
      }

      targets.push({
        key,
        sessionId: session.id,
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
      });
    }
  }

  return targets;
}
