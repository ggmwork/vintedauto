import { DraftListPage } from "@/components/app/draft-list-page";
import { draftRepository } from "@/lib/drafts";

export default async function Home() {
  const drafts = await draftRepository.list();

  return <DraftListPage drafts={drafts} />;
}
