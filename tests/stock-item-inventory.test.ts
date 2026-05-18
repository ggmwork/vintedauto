import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isInventoryStockItem,
  isQueuedStockItem,
} from "@/lib/intake/stock-item-inventory";

describe("stock item inventory stage", () => {
  it("keeps queued pre-items out of inventory", () => {
    const stockItem = {
      draftId: null,
      inventoryStatus: "queued" as const,
    };

    assert.equal(isQueuedStockItem(stockItem), true);
    assert.equal(isInventoryStockItem(stockItem), false);
  });

  it("treats promoted and drafted items as inventory items", () => {
    assert.equal(
      isInventoryStockItem({
        draftId: null,
        inventoryStatus: "inventoried",
      }),
      true
    );
    assert.equal(
      isInventoryStockItem({
        draftId: "draft-1",
        inventoryStatus: "queued",
      }),
      true
    );
  });
});
