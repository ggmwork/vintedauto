import { InventoryPage } from "@/components/app/inventory-page";
import { draftRepository } from "@/lib/drafts";
import { listAllSessionDetails } from "@/lib/inbox/inbox-service";
import {
  buildInventoryRows,
  parseInventoryFilter,
  parseInventorySort,
} from "@/lib/inventory";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function InventoryRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [sessions, drafts] = await Promise.all([
    listAllSessionDetails(),
    draftRepository.list(),
  ]);
  const rows = buildInventoryRows({
    sessions,
    drafts,
  });

  return (
    <InventoryPage
      rows={rows}
      filters={{
        filter: parseInventoryFilter(pickSearchParam(resolvedSearchParams.filter)),
        searchTerm: pickSearchParam(resolvedSearchParams.search) ?? "",
        sort: parseInventorySort(pickSearchParam(resolvedSearchParams.sort)),
      }}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
