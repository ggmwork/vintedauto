import { StockWorkspacePage } from "@/components/app/stock-workspace-page";
import { listAllSessionDetails } from "@/lib/inbox/inbox-service";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function StockRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessionDetails = await listAllSessionDetails();
  const resolvedSearchParams = await searchParams;

  return (
    <StockWorkspacePage
      sessions={sessionDetails}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
