import Image from "next/image";
import Link from "next/link";
import { BoxIcon, ImagesIcon, SparklesIcon } from "lucide-react";

import { generateSessionStockDraftsAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { SessionStatusBadge } from "@/components/app/session-status-badge";
import { StockItemStatusBadge } from "@/components/app/stock-item-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StudioSessionDetail } from "@/types/intake";

function getSessionReadyStockItemCount(session: StudioSessionDetail) {
  return session.stockItems.filter(
    (stockItem) => stockItem.photoAssetIds.length > 0 && stockItem.draftId === null
  ).length;
}

function getCoverPhotoAsset(session: StudioSessionDetail, photoAssetId: string | null) {
  if (!photoAssetId) {
    return null;
  }

  return session.photoAssets.find((photoAsset) => photoAsset.id === photoAssetId) ?? null;
}

export function StockWorkspacePage({
  sessions,
  feedback,
}: {
  sessions: StudioSessionDetail[];
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const totalStockItems = sessions.reduce(
    (accumulator, session) => accumulator + session.stockItems.length,
    0
  );
  const totalReadyStockItems = sessions.reduce(
    (accumulator, session) => accumulator + getSessionReadyStockItemCount(session),
    0
  );
  const totalDraftedStockItems = sessions.reduce(
    (accumulator, session) =>
      accumulator + session.stockItems.filter((stockItem) => stockItem.draftId).length,
    0
  );

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">Stock workspace</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Stock items sit between intake and drafts.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Group imported photos into products, see which items are ready,
              and batch-generate drafts from the stocked sessions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Intake home
            </Link>
            <Link href="/drafts" className={buttonVariants({ variant: "outline" })}>
              Drafts
            </Link>
          </div>
        </section>

        {feedback.error ? (
          <section>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {feedback.error}
            </div>
          </section>
        ) : null}

        {feedback.flash ? (
          <section>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
              {feedback.flash}
            </div>
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          <Badge variant="outline">{sessions.length} sessions</Badge>
          <Badge variant="outline">{totalStockItems} stock items</Badge>
          <Badge variant="outline">{totalReadyStockItems} ready to draft</Badge>
          <Badge variant="outline">{totalDraftedStockItems} drafted</Badge>
        </section>

        {sessions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No sessions yet</CardTitle>
              <CardDescription>
                Import a folder first. Stock organization starts after intake.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => {
              const readyStockItemCount = getSessionReadyStockItemCount(session);

              return (
                <Card key={session.id}>
                  <CardHeader className="gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <CardTitle>{session.name}</CardTitle>
                          <SessionStatusBadge status={session.status} />
                        </div>
                        <CardDescription>
                          {session.intakeConfig.folderLabel
                            ? `Imported from ${session.intakeConfig.folderLabel}.`
                            : "Imported from a local folder."}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/sessions/${session.id}`}
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Open session
                        </Link>
                        <form
                          action={generateSessionStockDraftsAction.bind(
                            null,
                            session.id,
                            "stock"
                          )}
                        >
                          <PendingSubmitButton
                            type="submit"
                            disabled={readyStockItemCount === 0}
                            pendingLabel="Generating drafts"
                          >
                            <SparklesIcon data-icon="inline-start" />
                            Generate session drafts
                          </PendingSubmitButton>
                        </form>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{session.stockItems.length} stock items</Badge>
                      <Badge variant="outline">{readyStockItemCount} ready</Badge>
                      <Badge variant="outline">{session.draftedStockItemCount} drafted</Badge>
                      <Badge variant="outline">{session.unassignedPhotoCount} unassigned</Badge>
                    </div>

                    {session.stockItems.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                        <BoxIcon className="size-4" />
                        No stock items grouped in this session yet.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {session.stockItems.map((stockItem) => {
                          const coverPhotoAsset = getCoverPhotoAsset(
                            session,
                            stockItem.coverPhotoAssetId
                          );

                          return (
                            <Card key={stockItem.id} className="overflow-hidden">
                              {coverPhotoAsset ? (
                                <div className="relative aspect-[4/3] bg-muted">
                                  <Image
                                    src={`/api/sessions/${session.id}/photos/${coverPhotoAsset.id}`}
                                    alt={coverPhotoAsset.originalFilename}
                                    fill
                                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <CardHeader className="gap-3">
                                <div className="flex items-center justify-between gap-3">
                                  <CardTitle className="truncate">{stockItem.name}</CardTitle>
                                  <StockItemStatusBadge stockItem={stockItem} />
                                </div>
                                <CardDescription>
                                  {stockItem.draftId
                                    ? "Draft linked."
                                    : "Ready to turn into one linked draft."}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">
                                    <ImagesIcon data-icon="inline-start" />
                                    {stockItem.photoAssetIds.length} photo
                                    {stockItem.photoAssetIds.length === 1 ? "" : "s"}
                                  </Badge>
                                  {stockItem.draftId ? (
                                    <Badge variant="outline">draft linked</Badge>
                                  ) : null}
                                </div>
                              </CardContent>
                              <CardFooter className="justify-end gap-3">
                                {stockItem.draftId ? (
                                  <Link
                                    href={`/drafts/${stockItem.draftId}`}
                                    className={buttonVariants({ variant: "outline" })}
                                  >
                                    Open draft
                                  </Link>
                                ) : null}
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
