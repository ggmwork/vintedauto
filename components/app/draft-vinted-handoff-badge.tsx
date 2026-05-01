import { Badge } from "@/components/ui/badge";
import type { DraftVintedHandoffStatus } from "@/types/draft";

const statusVariantMap: Record<
  DraftVintedHandoffStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  not_started: "outline",
  handed_off: "secondary",
  filled_on_vinted: "default",
  needs_manual_fix: "outline",
  fill_failed: "destructive",
};

const statusLabelMap: Record<DraftVintedHandoffStatus, string> = {
  not_started: "not started",
  handed_off: "handed off",
  filled_on_vinted: "filled on Vinted",
  needs_manual_fix: "needs manual fix",
  fill_failed: "fill failed",
};

export function DraftVintedHandoffBadge({
  status,
}: {
  status: DraftVintedHandoffStatus;
}) {
  return <Badge variant={statusVariantMap[status]}>{statusLabelMap[status]}</Badge>;
}
