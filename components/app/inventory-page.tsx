import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  ImageIcon,
  PackageIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";

import {
  generateStockItemDraftAction,
  setDraftStatusFromInventoryAction,
} from "@/app/actions";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  inventoryFilterOptions,
  inventoryNextActionLabelMap,
  inventorySortOptions,
  inventoryStatusLabelMap,
  isInventoryRowVisible,
  sortInventoryRows,
  type InventoryFilter,
  type InventoryRow,
  type InventorySort,
  type InventoryStatus,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface InventoryFilters {
  filter: InventoryFilter;
  searchTerm: string;
  sort: InventorySort;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusVariant(
  status: InventoryStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "needs-listing":
      return "secondary";
    case "needs-review":
      return "outline";
    case "ready-to-fill":
    case "filled-on-vinted":
      return "default";
    case "needs-manual-fix":
      return "destructive";
    case "listed":
    case "sold":
      return "outline";
  }
}

function getFilterHref({
  filter,
  searchTerm,
  sort,
}: {
  filter: InventoryFilter;
  searchTerm: string;
  sort: InventorySort;
}) {
  const url = new URL("/review", "http://localhost");
  url.searchParams.set("filter", filter);

  if (searchTerm.trim()) {
    url.searchParams.set("search", searchTerm.trim());
  }

  if (sort !== "updated-desc") {
    url.searchParams.set("sort", sort);
  }

  return `${url.pathname}${url.search}`;
}

function getDraftDetailHref(row: InventoryRow) {
  return row.draftId ? `/drafts/${row.draftId}` : "/review";
}

function getDraftReviewHref(row: InventoryRow) {
  return row.draftId ? `/drafts/${row.draftId}?focus=review` : "/review";
}

function getDraftExportHref(row: InventoryRow) {
  return row.draftId ? `/drafts/${row.draftId}?focus=export` : "/review";
}

function getFillOnVintedHref(row: InventoryRow) {
  return row.draftId ? `/api/drafts/${row.draftId}/fill-on-vinted` : "#";
}

function getStockItemHref(row: InventoryRow) {
  return row.sessionId && row.stockItemId ? `/stock#stock-${row.stockItemId}` : "/stock";
}

function getInventoryOpenHref(row: InventoryRow) {
  return row.draftId ? getDraftDetailHref(row) : getStockItemHref(row);
}

function getInventoryOpenLabel(row: InventoryRow) {
  return row.draftId ? "Open listing" : "Open item";
}

function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <Badge variant={getStatusVariant(status)}>
      {inventoryStatusLabelMap[status]}
    </Badge>
  );
}
function InventoryThumbnail({ row }: { row: InventoryRow }) {
  if (!row.coverImageHref) {
    return (
      <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
        <ImageIcon className="size-5" />
      </div>
    );
  }

  return (
    <div className="relative size-16 overflow-hidden rounded-lg bg-muted">
      <Image
        src={row.coverImageHref}
        alt={row.title}
        fill
        sizes="64px"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function InventoryOpenLink({ row }: { row: InventoryRow }) {
  return (
    <Link
      href={getInventoryOpenHref(row)}
      className={buttonVariants({ variant: "outline" })}
    >
      {getInventoryOpenLabel(row)}
    </Link>
  );
}

function InventoryActionGroup({
  row,
  children,
}: {
  row: InventoryRow;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
      {children}
      <InventoryOpenLink row={row} />
    </div>
  );
}

function InventoryRowAction({ row }: { row: InventoryRow }) {
  switch (row.nextAction) {
    case "generate-listing":
      if (!row.sessionId || !row.stockItemId) {
        return (
          <Link
            href={getDraftDetailHref(row)}
            className={buttonVariants({ variant: "outline" })}
          >
            Open listing
          </Link>
        );
      }

      return (
        <InventoryActionGroup row={row}>
          <form
            action={generateStockItemDraftAction.bind(
              null,
              row.sessionId,
              row.stockItemId,
              "inventory"
            )}
          >
            <PendingSubmitButton type="submit" pendingLabel="Generating">
              <SparklesIcon data-icon="inline-start" />
              {inventoryNextActionLabelMap[row.nextAction]}
            </PendingSubmitButton>
          </form>
        </InventoryActionGroup>
      );
    case "review-listing":
      return (
        <InventoryActionGroup row={row}>
          <Link href={getDraftReviewHref(row)} className={buttonVariants()}>
            {inventoryNextActionLabelMap[row.nextAction]}
          </Link>
        </InventoryActionGroup>
      );
    case "fill-on-vinted":
      return (
        <InventoryActionGroup row={row}>
          <a
            href={getFillOnVintedHref(row)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {inventoryNextActionLabelMap[row.nextAction]}
          </a>
        </InventoryActionGroup>
      );
    case "fix-vinted-fill":
      return (
        <InventoryActionGroup row={row}>
          <Link href={getDraftExportHref(row)} className={buttonVariants()}>
            <AlertTriangleIcon data-icon="inline-start" />
            {inventoryNextActionLabelMap[row.nextAction]}
          </Link>
        </InventoryActionGroup>
      );
    case "mark-listed":
      if (!row.draftId) {
        return (
          <Link
            href={getDraftDetailHref(row)}
            className={buttonVariants({ variant: "outline" })}
          >
            Open listing
          </Link>
        );
      }

      return (
        <InventoryActionGroup row={row}>
          <form
            action={setDraftStatusFromInventoryAction.bind(
              null,
              row.draftId,
              "listed"
            )}
          >
            <PendingSubmitButton type="submit" pendingLabel="Marking listed">
              <CheckCircle2Icon data-icon="inline-start" />
              {inventoryNextActionLabelMap[row.nextAction]}
            </PendingSubmitButton>
          </form>
        </InventoryActionGroup>
      );
    case "open-listing":
      return <InventoryOpenLink row={row} />;
  }
}

function InventoryEmptyState({
  hasRows,
  filters,
}: {
  hasRows: boolean;
  filters: InventoryFilters;
}) {
  if (!hasRows) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No items yet</CardTitle>
          <CardDescription>
            Add photos in Workbench, then create your first item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={buttonVariants()}>
            Open Workbench
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nothing in this view</CardTitle>
        <CardDescription>
          Try another filter or clear search to see more inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link
          href={getFilterHref({
            filter: "all",
            searchTerm: filters.searchTerm,
            sort: filters.sort,
          })}
          className={buttonVariants()}
        >
          Show all
        </Link>
        <Link href="/review" className={buttonVariants({ variant: "outline" })}>
          Clear filters
        </Link>
      </CardContent>
    </Card>
  );
}

function InventoryMobileCard({ row }: { row: InventoryRow }) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex gap-4">
          <InventoryThumbnail row={row} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <h3 className="truncate font-medium text-foreground">{row.title}</h3>
              <p className="text-sm text-muted-foreground">{row.subtitle}</p>
            </div>
            <InventoryStatusBadge status={row.status} />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{row.statusDetail}</p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Price</dt>
            <dd>{row.priceLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Category / size</dt>
            <dd>
              {row.categoryLabel} / {row.sizeLabel}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Photos</dt>
            <dd>{row.photoCount}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{formatDate(row.updatedAt)}</dd>
          </div>
        </dl>

        <InventoryRowAction row={row} />
      </CardContent>
    </Card>
  );
}

function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Photo</th>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Category / size</th>
            <th className="px-4 py-3 font-medium">Photos</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="align-middle">
              <td className="px-4 py-4">
                <InventoryThumbnail row={row} />
              </td>
              <td className="max-w-72 px-4 py-4">
                <div className="space-y-1">
                  <p className="truncate font-medium text-foreground">{row.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.subtitle}
                  </p>
                </div>
              </td>
              <td className="max-w-72 px-4 py-4">
                <div className="space-y-2">
                  <InventoryStatusBadge status={row.status} />
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {row.statusDetail}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4">{row.priceLabel}</td>
              <td className="max-w-56 px-4 py-4">
                <div className="space-y-1">
                  <p className="truncate">{row.categoryLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.sizeLabel}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4">{row.photoCount}</td>
              <td className="px-4 py-4 text-muted-foreground">
                {formatDate(row.updatedAt)}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end">
                  <InventoryRowAction row={row} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InventoryPage({
  rows,
  filters,
  feedback,
}: {
  rows: InventoryRow[];
  filters: InventoryFilters;
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase();
  const searchedRows = rows.filter((row) =>
    normalizedSearch ? row.searchText.includes(normalizedSearch) : true
  );
  const visibleRows = sortInventoryRows(
    searchedRows.filter((row) => isInventoryRowVisible(row.status, filters.filter)),
    filters.sort
  );
  const counts = Object.fromEntries(
    inventoryFilterOptions.map((option) => [
      option.filter,
      searchedRows.filter((row) => isInventoryRowVisible(row.status, option.filter))
        .length,
    ])
  ) as Record<InventoryFilter, number>;
  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Inventory
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Track each item from photos to Vinted.
            </p>
          </div>

          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <PackageIcon data-icon="inline-start" />
            Open Workbench
          </Link>
        </section>

        {feedback.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {feedback.error}
          </div>
        ) : null}

        {feedback.flash ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {feedback.flash}
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap gap-2">
              {inventoryFilterOptions.map((option) => (
                <Link
                  key={option.filter}
                  href={getFilterHref({
                    filter: option.filter,
                    searchTerm: filters.searchTerm,
                    sort: filters.sort,
                  })}
                  className={cn(
                    buttonVariants({
                      variant:
                        filters.filter === option.filter ? "default" : "outline",
                      size: "sm",
                    })
                  )}
                >
                  {option.label} ({counts[option.filter]})
                </Link>
              ))}
            </div>

            <form
              action="/review"
              method="get"
              className="grid gap-4 md:grid-cols-[1.5fr_0.8fr_auto]"
            >
              <input type="hidden" name="filter" value={filters.filter} />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">
                  Search
                </span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    name="search"
                    defaultValue={filters.searchTerm}
                    placeholder="Item, brand, category, size, keywords"
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Sort</span>
                <select
                  name="sort"
                  defaultValue={filters.sort}
                  className={inputClassName}
                >
                  {inventorySortOptions.map((option) => (
                    <option key={option.sort} value={option.sort}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-end gap-3">
                <Button type="submit" variant="outline">
                  Apply
                </Button>
                <Link
                  href="/review"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Clear
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {visibleRows.length === 0 ? (
          <InventoryEmptyState hasRows={rows.length > 0} filters={filters} />
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {visibleRows.length} of {rows.length} item
                {rows.length === 1 ? "" : "s"}.
              </p>
            </div>

            <InventoryTable rows={visibleRows} />

            <div className="grid gap-4 lg:hidden">
              {visibleRows.map((row) => (
                <InventoryMobileCard key={row.id} row={row} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
