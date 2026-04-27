import { notFound } from "next/navigation";

import { DraftDetailPage } from "@/components/app/draft-detail-page";
import { draftRepository } from "@/lib/drafts";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function DraftDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ draftId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { draftId } = await params;
  const resolvedSearchParams = await searchParams;
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    notFound();
  }

  return (
    <DraftDetailPage
      draft={draft}
      focusSection={pickSearchParam(resolvedSearchParams.focus) ?? null}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
