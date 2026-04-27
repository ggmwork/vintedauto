"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FolderSyncIcon,
  ImagesIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import {
  generateAllReadyStockDraftsAction,
  generateStockItemDraftAction,
  releasePhotoAssetsFromStockItemAction,
  removeStockItemAction,
  renameStockItemAction,
  setStockItemCoverPhotoAction,
} from "@/app/actions";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
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
import { cn } from "@/lib/utils";
import type { PhotoAsset, StockItem, StudioSessionDetail } from "@/types/intake";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface StockEntry {
  sessionId: string;
  sourceLabel: string;
  sourceType: StudioSessionDetail["intakeConfig"]["sourceType"];
  loosePhotoCount: number;
  stockItem: StockItem;
  photoAssets: PhotoAsset[];
}

function HiddenPhotoAssetInputs({ photoAssetIds }: { photoAssetIds: string[] }) {
  return (
    <>
      {photoAssetIds.map((photoAssetId) => (
        <input
          key={photoAssetId}
          type="hidden"
          name="photoAssetIds"
          value={photoAssetId}
        />
      ))}
    </>
  );
}

function getPhotoAssetsForStockItem(
  session: StudioSessionDetail,
  stockItemId: string
) {
  return session.photoAssets
    .filter((photoAsset) => photoAsset.stockItemId === stockItemId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function getSourceLabel(session: StudioSessionDetail) {
  return (
    session.intakeConfig.folderLabel ??
    session.intakeConfig.folderPath ??
    session.name
  );
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
  const [selectedPhotoAssetIdsByItem, setSelectedPhotoAssetIdsByItem] = useState<
    Record<string, string[]>
  >({});

  const stockEntries = useMemo<StockEntry[]>(() => {
    return sessions
      .flatMap((session) =>
        session.stockItems.map((stockItem) => ({
          sessionId: session.id,
          sourceLabel: getSourceLabel(session),
          sourceType: session.intakeConfig.sourceType,
          loosePhotoCount: session.unassignedPhotoCount,
          stockItem,
          photoAssets: getPhotoAssetsForStockItem(session, stockItem.id),
        }))
      )
      .sort(
        (left, right) =>
          new Date(right.stockItem.updatedAt).getTime() -
          new Date(left.stockItem.updatedAt).getTime()
      );
  }, [sessions]);

  const readyEntries = useMemo(
    () => stockEntries.filter((entry) => entry.stockItem.draftId === null),
    [stockEntries]
  );
  const draftedEntries = useMemo(
    () => stockEntries.filter((entry) => entry.stockItem.draftId !== null),
    [stockEntries]
  );
  const loosePhotoCount = useMemo(
    () => sessions.reduce((total, session) => total + session.unassignedPhotoCount, 0),
    [sessions]
  );

  function togglePhotoSelection(stockItemId: string, photoAssetId: string) {
    setSelectedPhotoAssetIdsByItem((current) => {
      const currentSelection = current[stockItemId] ?? [];
      const nextSelection = currentSelection.includes(photoAssetId)
        ? currentSelection.filter((entry) => entry !== photoAssetId)
        : [...currentSelection, photoAssetId];

      return {
        ...current,
        [stockItemId]: nextSelection,
      };
    });
  }

  function getSelectedPhotoAssetIds(stockItemId: string) {
    return selectedPhotoAssetIdsByItem[stockItemId] ?? [];
  }

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Stock</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Grouped items ready for generation or review.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Inbox collects photos. Stock is where items become stable enough to
              generate or reopen.
            </p>
          </div>

          <form action={generateAllReadyStockDraftsAction}>
            <PendingSubmitButton
              type="submit"
              size="lg"
              disabled={readyEntries.length === 0}
              pendingLabel="Generating drafts"
            >
              <SparklesIcon data-icon="inline-start" />
              Generate all ready
            </PendingSubmitButton>
          </form>
        </section>

        {feedback.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {feedback.error}
          </div>
        ) : null}

        {feedback.flash ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {feedback.flash}
          </div>
        ) : null}

        <section className="flex flex-wrap gap-2">
          <Badge variant="outline">{stockEntries.length} stock items</Badge>
          <Badge variant="outline">{readyEntries.length} ready to generate</Badge>
          <Badge variant="outline">{draftedEntries.length} drafted</Badge>
          <Badge variant="outline">{loosePhotoCount} photos still in Inbox</Badge>
        </section>

        {loosePhotoCount > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Inbox still has loose photos</CardTitle>
              <CardDescription>
                Files in the watched folder root could not be grouped automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="secondary">{loosePhotoCount} loose photo{loosePhotoCount === 1 ? "" : "s"}</Badge>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                <FolderSyncIcon data-icon="inline-start" />
                Open Inbox
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {stockEntries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No stock items yet</CardTitle>
              <CardDescription>
                Paste photos into the watched folder or group loose Inbox files first.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {readyEntries.length > 0 ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-semibold">Ready to generate</h2>
              <p className="text-sm text-muted-foreground">
                These items already have grouped photos and no linked draft yet.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {readyEntries.map((entry) => {
                const selectedPhotoAssetIds = getSelectedPhotoAssetIds(entry.stockItem.id);

                return (
                  <StockEntryCard
                    key={entry.stockItem.id}
                    entry={entry}
                    selectedPhotoAssetIds={selectedPhotoAssetIds}
                    onTogglePhotoSelection={togglePhotoSelection}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {draftedEntries.length > 0 ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-semibold">Linked drafts</h2>
              <p className="text-sm text-muted-foreground">
                These items already have a generated draft. Open the draft or keep the
                stock label tidy here.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {draftedEntries.map((entry) => (
                <StockEntryCard
                  key={entry.stockItem.id}
                  entry={entry}
                  selectedPhotoAssetIds={[]}
                  onTogglePhotoSelection={togglePhotoSelection}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StockEntryCard({
  entry,
  selectedPhotoAssetIds,
  onTogglePhotoSelection,
}: {
  entry: StockEntry;
  selectedPhotoAssetIds: string[];
  onTogglePhotoSelection: (stockItemId: string, photoAssetId: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      {entry.stockItem.coverPhotoAssetId ? (
        <div className="relative aspect-[4/3] bg-muted">
          <Image
            src={`/api/sessions/${entry.sessionId}/photos/${entry.stockItem.coverPhotoAssetId}`}
            alt={entry.stockItem.name}
            fill
            sizes="(min-width: 1280px) 35vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="truncate">{entry.stockItem.name}</CardTitle>
            <CardDescription>
              {entry.sourceType === "watched-folder" ? "Watched folder" : "Manual import"}:{" "}
              {entry.sourceLabel}
            </CardDescription>
          </div>
          <StockItemStatusBadge stockItem={entry.stockItem} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form
          action={renameStockItemAction.bind(
            null,
            entry.sessionId,
            entry.stockItem.id,
            "stock"
          )}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            name="stockItemName"
            defaultValue={entry.stockItem.name}
            className={inputClassName}
          />
          <PendingSubmitButton
            type="submit"
            variant="outline"
            pendingLabel="Saving name"
          >
            Save
          </PendingSubmitButton>
        </form>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <ImagesIcon data-icon="inline-start" />
            {entry.photoAssets.length} photo{entry.photoAssets.length === 1 ? "" : "s"}
          </Badge>
          {entry.stockItem.draftId ? (
            <Badge variant="outline">draft linked</Badge>
          ) : (
            <Badge variant="secondary">ready</Badge>
          )}
          {entry.loosePhotoCount > 0 ? (
            <Badge variant="outline">{entry.loosePhotoCount} still in Inbox</Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {entry.photoAssets.map((photoAsset) => {
            const selected = selectedPhotoAssetIds.includes(photoAsset.id);
            const isCover = entry.stockItem.coverPhotoAssetId === photoAsset.id;

            return (
              <div key={photoAsset.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    entry.stockItem.draftId
                      ? undefined
                      : onTogglePhotoSelection(entry.stockItem.id, photoAsset.id)
                  }
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-lg border bg-muted transition",
                    entry.stockItem.draftId
                      ? "cursor-default border-border"
                      : selected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                  )}
                >
                  <Image
                    src={`/api/sessions/${entry.sessionId}/photos/${photoAsset.id}`}
                    alt={photoAsset.originalFilename}
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-x-0 top-0 flex justify-between p-2 text-[11px] font-medium">
                    {isCover ? (
                      <span className="rounded-full bg-background/90 px-2 py-1 text-foreground">
                        cover
                      </span>
                    ) : (
                      <span />
                    )}
                    {!entry.stockItem.draftId && selected ? (
                      <span className="rounded-full bg-primary px-2 py-1 text-primary-foreground">
                        selected
                      </span>
                    ) : null}
                  </div>
                </button>

                {!entry.stockItem.draftId && !isCover ? (
                  <form
                    action={setStockItemCoverPhotoAction.bind(
                      null,
                      entry.sessionId,
                      entry.stockItem.id,
                      photoAsset.id,
                      "stock"
                    )}
                  >
                    <PendingSubmitButton
                      type="submit"
                      variant="outline"
                      className="w-full"
                      pendingLabel="Saving"
                    >
                      Set cover
                    </PendingSubmitButton>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-border/70 bg-muted/10">
        <div className="flex flex-wrap gap-3">
          {entry.stockItem.draftId ? (
            <Link
              href={`/drafts/${entry.stockItem.draftId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open draft
            </Link>
          ) : (
            <>
              <form
                action={generateStockItemDraftAction.bind(
                  null,
                  entry.sessionId,
                  entry.stockItem.id,
                  "stock"
                )}
              >
                <PendingSubmitButton type="submit" pendingLabel="Generating draft">
                  <SparklesIcon data-icon="inline-start" />
                  Generate draft
                </PendingSubmitButton>
              </form>

              <form
                action={releasePhotoAssetsFromStockItemAction.bind(
                  null,
                  entry.sessionId,
                  entry.stockItem.id,
                  "stock"
                )}
              >
                <HiddenPhotoAssetInputs photoAssetIds={selectedPhotoAssetIds} />
                <PendingSubmitButton
                  type="submit"
                  variant="outline"
                  disabled={selectedPhotoAssetIds.length === 0}
                  pendingLabel="Moving photos"
                >
                  Move selected to Inbox
                </PendingSubmitButton>
              </form>
            </>
          )}
        </div>

        {!entry.stockItem.draftId ? (
          <form
            action={removeStockItemAction.bind(
              null,
              entry.sessionId,
              entry.stockItem.id,
              "stock"
            )}
          >
            <PendingSubmitButton
              type="submit"
              variant="outline"
              pendingLabel="Removing item"
            >
              <Trash2Icon data-icon="inline-start" />
              Remove item
            </PendingSubmitButton>
          </form>
        ) : null}
      </CardFooter>
    </Card>
  );
}
