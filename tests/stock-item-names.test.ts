import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createStockItemName,
  isDefaultStockItemName,
} from "@/lib/intake/stock-item-names";

describe("stock item names", () => {
  it("keeps explicit seller names", () => {
    assert.equal(createStockItemName("  Linen shirt  ", []), "Linen shirt");
  });

  it("uses the next generic item name when no name is provided", () => {
    assert.equal(createStockItemName(null, []), "Item 1");
    assert.equal(createStockItemName("", ["Item 1", "Item 2"]), "Item 3");
  });

  it("avoids reusing generic item numbers after custom names or gaps", () => {
    assert.equal(
      createStockItemName(null, ["Blue hoodie", "Item 4"]),
      "Item 5"
    );
  });

  it("detects temporary item names", () => {
    assert.equal(isDefaultStockItemName("Item 1"), true);
    assert.equal(isDefaultStockItemName("Linen shirt"), false);
  });
});
