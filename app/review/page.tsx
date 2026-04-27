import Link from "next/link";
import { FolderOpenDotIcon } from "lucide-react";

import { DraftDetailPage } from "@/components/app/draft-detail-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { draftRepository } from "@/lib/drafts";
import {
  buildReviewQueueUrl,
  getReviewQueueCounts,
  getReviewQueueDrafts,
  parseReviewQueueState,
  reviewQueueStateOptions,
} from "@/lib/drafts/review-queue";

export const dynamic = "force-dynamic";

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ReviewQueueRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const drafts = await draftRepository.list();
  const queueState = parseReviewQueueState(
    pickSearchParam(resolvedSearchParams.state) ?? null
  );
  const queueDrafts = getReviewQueueDrafts(drafts, queueState);
  const queueCounts = getReviewQueueCounts(drafts);

  if (queueDrafts.length === 0) {
    return (
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
          <section className="space-y-2">
            <Badge variant="secondary">Review</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              No drafts in this queue.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Switch queue state or return to Stock until new items are ready.
            </p>
          </section>

          <section className="flex flex-wrap gap-2">
            {reviewQueueStateOptions.map((option) => (
              <Link
                key={option.state}
                href={buildReviewQueueUrl({ state: option.state })}
                className={buttonVariants({
                  variant: option.state === queueState ? "default" : "outline",
                })}
              >
                {option.label} ({queueCounts[option.state]})
              </Link>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Queue empty</CardTitle>
              <CardDescription>
                The selected queue has no drafts right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                <FolderOpenDotIcon className="size-4" />
                Nothing to review in {reviewQueueStateOptions.find((option) => option.state === queueState)?.label.toLowerCase()}.
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <Link href="/stock" className={buttonVariants({ variant: "outline" })}>
                Open Stock
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const requestedDraftId = pickSearchParam(resolvedSearchParams.draftId) ?? null;
  const queueIndex = Math.max(
    queueDrafts.findIndex((draft) => draft.id === requestedDraftId),
    0
  );
  const currentDraftSummary = queueDrafts[queueIndex];
  const currentDraft = await draftRepository.getById(currentDraftSummary.id);

  if (!currentDraft) {
    throw new Error(`Draft not found for review queue: ${currentDraftSummary.id}`);
  }

  const previousDraft = queueIndex > 0 ? queueDrafts[queueIndex - 1] : null;
  const nextDraft =
    queueIndex < queueDrafts.length - 1 ? queueDrafts[queueIndex + 1] : null;

  return (
    <DraftDetailPage
      draft={currentDraft}
      focusSection={pickSearchParam(resolvedSearchParams.focus) ?? null}
      feedback={{
        flash: pickSearchParam(resolvedSearchParams.flash) ?? null,
        error: pickSearchParam(resolvedSearchParams.error) ?? null,
      }}
      queueContext={{
        state: queueState,
        position: queueIndex + 1,
        total: queueDrafts.length,
        counts: queueCounts,
        previousHref: previousDraft
          ? buildReviewQueueUrl({
              state: queueState,
              draftId: previousDraft.id,
            })
          : null,
        nextHref: nextDraft
          ? buildReviewQueueUrl({
              state: queueState,
              draftId: nextDraft.id,
            })
          : null,
        nextDraftId: nextDraft?.id ?? null,
        queueRootHref: buildReviewQueueUrl({
          state: queueState,
        }),
        stateLinks: reviewQueueStateOptions.map((option) => ({
          ...option,
          href: buildReviewQueueUrl({ state: option.state }),
        })),
      }}
    />
  );
}
