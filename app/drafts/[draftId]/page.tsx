import { notFound } from "next/navigation";

import { DraftDetailPage } from "@/components/app/draft-detail-page";
import { draftRepository } from "@/lib/drafts";

export default async function DraftDetailRoute({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    notFound();
  }

  return <DraftDetailPage draft={draft} />;
}
