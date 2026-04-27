import { DraftListPage } from "@/components/app/draft-list-page";
import { draftRepository } from "@/lib/drafts";

export const dynamic = "force-dynamic";

export default async function DraftListRoute() {
  const drafts = await draftRepository.list();

  return <DraftListPage drafts={drafts} />;
}
