import { StockWorkspacePage } from "@/components/app/stock-workspace-page";
import { studioSessionRepository } from "@/lib/intake";

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
  const sessions = await studioSessionRepository.list();
  const sessionDetails = (
    await Promise.all(sessions.map((session) => studioSessionRepository.getById(session.id)))
  ).filter((session) => session !== null);
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
