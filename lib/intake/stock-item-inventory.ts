import type { StockItem } from "@/types/intake";

type StockItemInventoryFields = Pick<StockItem, "draftId" | "inventoryStatus">;

export function isInventoryStockItem(stockItem: StockItemInventoryFields) {
  return stockItem.inventoryStatus === "inventoried" || stockItem.draftId !== null;
}

export function isQueuedStockItem(stockItem: StockItemInventoryFields) {
  return stockItem.inventoryStatus === "queued" && stockItem.draftId === null;
}
