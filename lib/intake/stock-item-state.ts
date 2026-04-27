import type { StockItem } from "@/types/intake";

export type StockItemState = "grouping" | "ready" | "drafted";

export function getStockItemState(
  stockItem: Pick<StockItem, "photoAssetIds" | "draftId">
): StockItemState {
  if (stockItem.draftId) {
    return "drafted";
  }

  if (stockItem.photoAssetIds.length > 0) {
    return "ready";
  }

  return "grouping";
}
