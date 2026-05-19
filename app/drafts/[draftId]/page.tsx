import { notFound } from "next/navigation";

import { DraftDetailPage } from "@/components/app/draft-detail-page";
import { draftRepository } from "@/lib/drafts";
import { findActiveListingGenerationJob } from "@/lib/listing-generation-jobs";

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

  const activeGenerationJob = await findActiveListingGenerationJob({
    targetType: "draft",
    draftId,
  });

  return (
    <DraftDetailPage
      draft={draft}
      activeGenerationJob={activeGenerationJob}
      focusSection={pickSearchParam(resolvedSearchParams.focus) ?? null}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
    />
  );
}
