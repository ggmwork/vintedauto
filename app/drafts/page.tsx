import {
  DraftListPage,
  type DraftListFilters,
  type DraftListSort,
  type DraftListStatusFilter,
} from "@/components/app/draft-list-page";
import { draftRepository } from "@/lib/drafts";

export const dynamic = "force-dynamic";

function pickSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseStatusFilter(value: string): DraftListStatusFilter {
  return value === "draft" || value === "ready" || value === "listed" || value === "sold"
    ? value
    : "all";
}

function parseSort(value: string): DraftListSort {
  return value === "updated-asc" ||
    value === "created-desc" ||
    value === "created-asc" ||
    value === "title-asc" ||
    value === "generation-desc"
    ? value
    : "updated-desc";
}

export default async function DraftListRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const drafts = await draftRepository.list();
  const resolvedSearchParams = await searchParams;
  const filters: DraftListFilters = {
    searchTerm: pickSearchParam(resolvedSearchParams.search),
    statusFilter: parseStatusFilter(pickSearchParam(resolvedSearchParams.status)),
    sortBy: parseSort(pickSearchParam(resolvedSearchParams.sort)),
  };

  return <DraftListPage drafts={drafts} filters={filters} />;
}
