import { InboxPage } from "@/components/app/inbox-page";
import { getInboxViewModel } from "@/lib/inbox/inbox-service";
import { ensureInboxWatcherRunning } from "@/lib/watcher";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const watcher = await ensureInboxWatcherRunning();
  const inbox = await getInboxViewModel(watcher);
  const resolvedSearchParams = await searchParams;

  return (
    <InboxPage
      inbox={inbox}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
