import { Badge } from "@/components/ui/badge";
import type { DraftStatus } from "@/types/draft";

const statusVariantMap: Record<
  DraftStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  ready: "default",
  listed: "outline",
  sold: "destructive",
};

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  return <Badge variant={statusVariantMap[status]}>{status}</Badge>;
}
