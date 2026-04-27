import { notFound } from "next/navigation";

import { StudioSessionDetailPage } from "@/components/app/studio-session-detail-page";
import { studioSessionRepository } from "@/lib/intake";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function StudioSessionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <StudioSessionDetailPage
      session={session}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
