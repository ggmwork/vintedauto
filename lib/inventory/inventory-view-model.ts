import {
  deriveInventoryNextAction,
  deriveInventoryStatus,
  getInventoryStatusSortWeight,
  type InventoryNextAction,
  type InventoryStatus,
} from "@/lib/inventory/inventory-status";
import { isInventoryStockItem } from "@/lib/intake/stock-item-inventory";
import type { Draft } from "@/types/draft";
import type { PhotoAsset, StockItem, StudioSessionDetail } from "@/types/intake";
import type { PriceSuggestion } from "@/types/pricing";

export type InventorySourceType = "stock-item" | "manual-draft";

export interface InventoryRow {
  id: string;
  sourceType: InventorySourceType;
  sessionId: string | null;
  stockItemId: string | null;
  draftId: string | null;
  title: string;
  subtitle: string;
  coverImageHref: string | null;
  photoCount: number;
  status: InventoryStatus;
  statusDetail: string;
  nextAction: InventoryNextAction;
  priceLabel: string;
  categoryLabel: string;
  sizeLabel: string;
  updatedAt: string;
  createdAt: string;
  searchText: string;
}

export type InventorySort =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "title-asc";

export const inventorySortOptions: Array<{
  sort: InventorySort;
  label: string;
}> = [
  { sort: "updated-desc", label: "Recently updated" },
  { sort: "updated-asc", label: "Oldest updated" },
  { sort: "created-desc", label: "Newest created" },
  { sort: "title-asc", label: "Title A-Z" },
];

export function parseInventorySort(value: string | null | undefined) {
  return inventorySortOptions.some((option) => option.sort === value)
    ? (value as InventorySort)
    : "updated-desc";
}

function getPhotoAssetsForStockItem(
  session: StudioSessionDetail,
  stockItem: StockItem
) {
  return session.photoAssets
    .filter((photoAsset) => photoAsset.stockItemId === stockItem.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildStockCoverHref(
  sessionId: string,
  stockItem: StockItem,
  photoAssets: PhotoAsset[]
) {
  const coverPhotoAssetId =
    stockItem.coverPhotoAssetId ?? photoAssets[0]?.id ?? null;

  return coverPhotoAssetId
    ? `/api/sessions/${sessionId}/photos/${coverPhotoAssetId}`
    : null;
}

function getSourceLabel(session: StudioSessionDetail) {
  if (session.intakeConfig.sourceType === "watched-folder") {
    return "Watched folder";
  }

  return "Manual import";
}

function formatPrice(priceSuggestion: PriceSuggestion | null) {
  if (!priceSuggestion) {
    return "No price";
  }

  if (priceSuggestion.amount !== null) {
    return `${priceSuggestion.amount.toFixed(2)} ${priceSuggestion.currency}`;
  }

  if (
    priceSuggestion.minAmount !== null ||
    priceSuggestion.maxAmount !== null
  ) {
    return `${priceSuggestion.minAmount?.toFixed(2) ?? "?"} - ${
      priceSuggestion.maxAmount?.toFixed(2) ?? "?"
    } ${priceSuggestion.currency}`;
  }

  return `No price (${priceSuggestion.currency})`;
}

function formatStatusDetail(draft: Draft | null, status: InventoryStatus) {
  if (!draft) {
    return "Photos are grouped. Generate the listing text next.";
  }

  switch (status) {
    case "needs-listing":
      return "Generate a listing from this item.";
    case "needs-review":
      return "Open the listing and complete required fields.";
    case "ready-to-fill":
      return draft.vintedHandoff.status === "handed_off"
        ? "Launch sent. Fill again if the Vinted tab needs another attempt."
        : "Listing is ready for the Vinted form.";
    case "filled-on-vinted":
      return "Review the Vinted page, submit manually, then mark listed.";
    case "needs-manual-fix":
      return draft.vintedHandoff.lastResult?.message ?? "Vinted fill needs a fix.";
    case "listed":
      return "Listed on Vinted.";
    case "sold":
      return "Sold item.";
  }
}
function buildSearchText(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function buildDraftSearchValues(draft: Draft | null) {
  if (!draft) {
    return [];
  }

  return [
    draft.id,
    draft.title,
    draft.description,
    draft.metadata.brand,
    draft.metadata.category,
    draft.metadata.size,
    draft.metadata.condition,
    draft.metadata.color,
    draft.metadata.material,
    draft.metadata.notes,
    ...draft.keywords,
  ];
}

function getRowUpdatedAt(stockItem: StockItem | null, draft: Draft | null) {
  const timestamps = [stockItem?.updatedAt, draft?.updatedAt]
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function buildStockRow(
  session: StudioSessionDetail,
  stockItem: StockItem,
  draft: Draft | null
): InventoryRow {
  const photoAssets = getPhotoAssetsForStockItem(session, stockItem);
  const status = deriveInventoryStatus(draft);
  const title = draft?.title?.trim() || stockItem.name;
  const subtitle = draft
    ? `${getSourceLabel(session)} / linked listing`
    : `${getSourceLabel(session)} / ${photoAssets.length} photo${
        photoAssets.length === 1 ? "" : "s"
      } grouped`;

  return {
    id: `stock:${stockItem.id}`,
    sourceType: "stock-item",
    sessionId: session.id,
    stockItemId: stockItem.id,
    draftId: draft?.id ?? null,
    title,
    subtitle,
    coverImageHref: buildStockCoverHref(session.id, stockItem, photoAssets),
    photoCount: photoAssets.length,
    status,
    statusDetail: formatStatusDetail(draft, status),
    nextAction: deriveInventoryNextAction(status),
    priceLabel: formatPrice(draft?.priceSuggestion ?? null),
    categoryLabel: draft?.metadata.category?.trim() || "No category",
    sizeLabel: draft?.metadata.size?.trim() || "No size",
    updatedAt: getRowUpdatedAt(stockItem, draft),
    createdAt: stockItem.createdAt,
    searchText: buildSearchText([
      stockItem.id,
      stockItem.name,
      session.name,
      session.intakeConfig.folderLabel,
      session.intakeConfig.folderPath,
      ...buildDraftSearchValues(draft),
    ]),
  };
}

function buildManualDraftRow(draft: Draft): InventoryRow {
  const status = deriveInventoryStatus(draft);
  const title = draft.title?.trim() || "Untitled listing";

  return {
    id: `draft:${draft.id}`,
    sourceType: "manual-draft",
    sessionId: null,
    stockItemId: null,
    draftId: draft.id,
    title,
    subtitle: "Manual listing",
    coverImageHref: null,
    photoCount: draft.imageCount,
    status,
    statusDetail: formatStatusDetail(draft, status),
    nextAction: deriveInventoryNextAction(status),
    priceLabel: formatPrice(draft.priceSuggestion),
    categoryLabel: draft.metadata.category?.trim() || "No category",
    sizeLabel: draft.metadata.size?.trim() || "No size",
    updatedAt: draft.updatedAt,
    createdAt: draft.createdAt,
    searchText: buildSearchText(buildDraftSearchValues(draft)),
  };
}

export function buildInventoryRows({
  sessions,
  drafts,
}: {
  sessions: StudioSessionDetail[];
  drafts: Draft[];
}) {
  const draftsById = new Map(drafts.map((draft) => [draft.id, draft]));
  const linkedDraftIds = new Set<string>();
  const stockRows = sessions.flatMap((session) =>
    session.stockItems
      .filter((stockItem) => isInventoryStockItem(stockItem))
      .map((stockItem) => {
        const draft = stockItem.draftId
          ? draftsById.get(stockItem.draftId) ?? null
          : null;

        if (draft) {
          linkedDraftIds.add(draft.id);
        }

        return buildStockRow(session, stockItem, draft);
      })
  );
  const manualRows = drafts
    .filter((draft) => !linkedDraftIds.has(draft.id))
    .map(buildManualDraftRow);

  return [...stockRows, ...manualRows];
}

export function sortInventoryRows(
  rows: InventoryRow[],
  sort: InventorySort
) {
  const sortedRows = rows.slice();

  switch (sort) {
    case "updated-asc":
      return sortedRows.sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      );
    case "created-desc":
      return sortedRows.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    case "title-asc":
      return sortedRows.sort((left, right) =>
        left.title.localeCompare(right.title)
      );
    case "updated-desc":
      return sortedRows.sort((left, right) => {
        const statusDifference =
          getInventoryStatusSortWeight(left.status) -
          getInventoryStatusSortWeight(right.status);

        if (statusDifference !== 0) {
          return statusDifference;
        }

        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      });
  }
}
