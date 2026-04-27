import { Badge } from "@/components/ui/badge";
import { getStockItemState } from "@/lib/intake/stock-item-state";
import type { StockItem } from "@/types/intake";

export function StockItemStatusBadge({
  stockItem,
}: {
  stockItem: Pick<StockItem, "photoAssetIds" | "draftId">;
}) {
  const status = getStockItemState(stockItem);

  if (status === "drafted") {
    return <Badge>drafted</Badge>;
  }

  if (status === "ready") {
    return <Badge variant="secondary">ready</Badge>;
  }

  return <Badge variant="outline">grouping</Badge>;
}
