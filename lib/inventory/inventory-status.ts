import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import type { Draft } from "@/types/draft";

export type InventoryStatus =
  | "needs-listing"
  | "needs-review"
  | "ready-to-fill"
  | "filled-on-vinted"
  | "needs-manual-fix"
  | "listed"
  | "sold";

export type InventoryNextAction =
  | "generate-listing"
  | "review-listing"
  | "fill-on-vinted"
  | "fix-vinted-fill"
  | "mark-listed"
  | "open-listing";

export type InventoryFilter =
  | "action-needed"
  | "needs-listing"
  | "needs-review"
  | "ready-to-fill"
  | "filled-or-fix-needed"
  | "listed"
  | "all";

export const inventoryFilterOptions: Array<{
  filter: InventoryFilter;
  label: string;
}> = [
  { filter: "action-needed", label: "Action needed" },
  { filter: "needs-listing", label: "Needs listing" },
  { filter: "needs-review", label: "Needs review" },
  { filter: "ready-to-fill", label: "Ready to fill" },
  { filter: "filled-or-fix-needed", label: "Filled / fix needed" },
  { filter: "listed", label: "Listed" },
  { filter: "all", label: "All" },
];

export const inventoryStatusLabelMap: Record<InventoryStatus, string> = {
  "needs-listing": "Needs listing",
  "needs-review": "Needs review",
  "ready-to-fill": "Ready to fill",
  "filled-on-vinted": "Filled on Vinted",
  "needs-manual-fix": "Needs manual fix",
  listed: "Listed",
  sold: "Sold",
};

export const inventoryNextActionLabelMap: Record<
  InventoryNextAction,
  string
> = {
  "generate-listing": "Generate listing",
  "review-listing": "Review listing",
  "fill-on-vinted": "Fill on Vinted",
  "fix-vinted-fill": "Fix Vinted fill",
  "mark-listed": "Mark listed",
  "open-listing": "Open listing",
};

export function parseInventoryFilter(value: string | null | undefined) {
  return inventoryFilterOptions.some((option) => option.filter === value)
    ? (value as InventoryFilter)
    : "action-needed";
}
export function deriveInventoryStatus(draft: Draft | null): InventoryStatus {
  if (!draft) {
    return "needs-listing";
  }

  if (draft.status === "sold") {
    return "sold";
  }

  if (draft.status === "listed") {
    return "listed";
  }

  if (
    draft.vintedHandoff.status === "needs_manual_fix" ||
    draft.vintedHandoff.status === "fill_failed"
  ) {
    return "needs-manual-fix";
  }

  if (draft.vintedHandoff.status === "filled_on_vinted") {
    return "filled-on-vinted";
  }

  return getDraftReadiness(draft).ready ? "ready-to-fill" : "needs-review";
}

export function deriveInventoryNextAction(
  status: InventoryStatus
): InventoryNextAction {
  switch (status) {
    case "needs-listing":
      return "generate-listing";
    case "needs-review":
      return "review-listing";
    case "ready-to-fill":
      return "fill-on-vinted";
    case "needs-manual-fix":
      return "fix-vinted-fill";
    case "filled-on-vinted":
      return "mark-listed";
    case "listed":
    case "sold":
      return "open-listing";
  }
}

export function isInventoryRowVisible(
  status: InventoryStatus,
  filter: InventoryFilter
) {
  switch (filter) {
    case "action-needed":
      return (
        status === "needs-listing" ||
        status === "needs-review" ||
        status === "ready-to-fill" ||
        status === "needs-manual-fix" ||
        status === "filled-on-vinted"
      );
    case "needs-listing":
      return status === "needs-listing";
    case "needs-review":
      return status === "needs-review";
    case "ready-to-fill":
      return status === "ready-to-fill";
    case "filled-or-fix-needed":
      return status === "filled-on-vinted" || status === "needs-manual-fix";
    case "listed":
      return status === "listed";
    case "all":
      return true;
  }
}

export function getInventoryStatusSortWeight(status: InventoryStatus) {
  switch (status) {
    case "needs-manual-fix":
      return 0;
    case "filled-on-vinted":
      return 1;
    case "ready-to-fill":
      return 2;
    case "needs-review":
      return 3;
    case "needs-listing":
      return 4;
    case "listed":
      return 5;
    case "sold":
      return 6;
  }
}
