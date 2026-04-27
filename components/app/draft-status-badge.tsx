import { Badge } from "@/components/ui/badge";
import type { DraftStatus } from "@/types/draft";

const statusVariantMap: Record<
  DraftStatus,
  "default" | "secondary" | "outline"
> = {
  draft: "secondary",
  ready: "default",
  listed: "outline",
  sold: "outline",
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  return <Badge variant={statusVariantMap[status]}>{status}</Badge>;
}
