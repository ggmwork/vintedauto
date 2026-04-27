import { Badge } from "@/components/ui/badge";
import type { StudioSessionStatus } from "@/types/intake";

const statusVariantMap: Record<
  StudioSessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  needs_stocking: "secondary",
  stocked: "default",
};

function formatStatusLabel(status: StudioSessionStatus) {
  switch (status) {
    case "needs_stocking":
      return "needs stock";
    case "stocked":
      return "stocked";
  }
}

export function SessionStatusBadge({ status }: { status: StudioSessionStatus }) {
  return <Badge variant={statusVariantMap[status]}>{formatStatusLabel(status)}</Badge>;
}
