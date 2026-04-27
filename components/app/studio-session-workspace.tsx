"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BoxIcon,
  FolderInputIcon,
  ImagePlusIcon,
  ImagesIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import {
  assignSelectedPhotoAssetsToStockItemAction,
  createStockItemFromSelectionAction,
  generateSessionStockDraftsAction,
  removeStockItemAction,
  renameStockItemAction,
} from "@/app/actions";
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
import { cn } from "@/lib/utils";
import type { PhotoAsset, StudioSessionDetail } from "@/types/intake";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (value === null || value <= 0) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function findPhotoAsset(
  session: StudioSessionDetail,
  photoAssetId: string | null
): PhotoAsset | null {
  if (!photoAssetId) {
    return null;
  }

  return session.photoAssets.find((photoAsset) => photoAsset.id === photoAssetId) ?? null;
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

export function StudioSessionWorkspace({
  session,
  feedback,
}: {
  session: StudioSessionDetail;
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const [selectedPhotoAssetIds, setSelectedPhotoAssetIds] = useState<string[]>([]);

  const unassignedPhotoAssets = useMemo(
    () =>
      session.photoAssets.filter((photoAsset) => photoAsset.stockItemId === null),
    [session.photoAssets]
  );
  const readyStockItems = useMemo(
    () =>
      session.stockItems.filter(
        (stockItem) => stockItem.photoAssetIds.length > 0 && stockItem.draftId === null
      ),
    [session.stockItems]
  );

  function toggleSelection(photoAssetId: string) {
    setSelectedPhotoAssetIds((current) =>
      current.includes(photoAssetId)
        ? current.filter((entry) => entry !== photoAssetId)
        : [...current, photoAssetId]
    );
  }

  function clearSelection() {
    setSelectedPhotoAssetIds([]);
  }

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Internal session view</Badge>
              <SessionStatusBadge status={session.status} />
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-semibold text-balance">
                {session.name}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Secondary debug view for one import record. Main workflow now lives in Inbox, Stock, and Review.
              </p>
            </div>
          </div>

          <form
            action={generateSessionStockDraftsAction.bind(
              null,
              session.id,
              "session"
            )}
          >
            <PendingSubmitButton
              type="submit"
              size="lg"
              disabled={readyStockItems.length === 0}
              pendingLabel="Generating drafts"
            >
              <SparklesIcon data-icon="inline-start" />
              Generate drafts from stock
            </PendingSubmitButton>
          </form>
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
          <Badge variant="outline">{session.photoCount} photos</Badge>
          <Badge variant="outline">{session.unassignedPhotoCount} unassigned</Badge>
          <Badge variant="outline">{session.stockItemCount} stock items</Badge>
          <Badge variant="outline">{session.draftedStockItemCount} drafted</Badge>
          <Badge variant="outline">Updated {formatDate(session.updatedAt)}</Badge>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned photos</CardTitle>
              <CardDescription>
                Select photos, then create a new stock item or add them to an
                existing one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background px-4 py-4">
                <Badge variant="secondary">{selectedPhotoAssetIds.length} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {session.intakeConfig.folderLabel ?? "Local import"}
                </span>
                {selectedPhotoAssetIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>

              <form
                action={createStockItemFromSelectionAction.bind(
                  null,
                  session.id,
                  "session"
                )}
                className="grid gap-4 rounded-lg border border-border/70 bg-background px-4 py-4"
              >
                <HiddenPhotoAssetInputs photoAssetIds={selectedPhotoAssetIds} />
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">
                    New stock item name
                  </label>
                  <input
                    type="text"
                    name="stockItemName"
                    placeholder="Blue Nike hoodie"
                    className={inputClassName}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Start with one grouped item per product. Rename later if needed.
                  </p>
                  <PendingSubmitButton
                    type="submit"
                    disabled={selectedPhotoAssetIds.length === 0}
                    pendingLabel="Creating stock item"
                  >
                    <BoxIcon data-icon="inline-start" />
                    Create stock item
                  </PendingSubmitButton>
                </div>
              </form>

              {unassignedPhotoAssets.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <FolderInputIcon className="size-4" />
                  All imported photos are already assigned to stock items.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {unassignedPhotoAssets.map((photoAsset) => {
                    const selected = selectedPhotoAssetIds.includes(photoAsset.id);

                    return (
                      <button
                        key={photoAsset.id}
                        type="button"
                        onClick={() => toggleSelection(photoAsset.id)}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-card text-left transition",
                          selected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="relative aspect-square bg-muted">
                          <Image
                            src={`/api/sessions/${session.id}/photos/${photoAsset.id}`}
                            alt={photoAsset.originalFilename}
                            fill
                            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute top-3 right-3 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground">
                            {selected ? "selected" : "pick"}
                          </div>
                        </div>
                        <div className="space-y-3 px-4 py-4">
                          <div className="space-y-1">
                            <p className="truncate font-medium">
                              {photoAsset.originalFilename}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {photoAsset.relativePath ?? "Relative folder path unavailable"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              <ImagesIcon data-icon="inline-start" />
                              photo {photoAsset.sortOrder + 1}
                            </Badge>
                            <Badge variant="outline">
                              {formatFileSize(photoAsset.sizeBytes)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock items</CardTitle>
              <CardDescription>
                Once a product has its photos grouped, it becomes a stock item
                and can generate one linked draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.stockItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <BoxIcon className="size-4" />
                  No stock items yet. Create the first one from the unassigned queue.
                </div>
              ) : (
                session.stockItems.map((stockItem) => {
                  const coverPhotoAsset = findPhotoAsset(
                    session,
                    stockItem.coverPhotoAssetId
                  );
                  const stockPhotoAssets = getStockPhotoAssets(session, stockItem.id);
                  const canAssignSelection =
                    selectedPhotoAssetIds.length > 0 && stockItem.draftId === null;

                  return (
                    <Card key={stockItem.id} className="overflow-hidden">
                      {coverPhotoAsset ? (
                        <div className="relative aspect-[4/3] bg-muted">
                          <Image
                            src={`/api/sessions/${session.id}/photos/${coverPhotoAsset.id}`}
                            alt={coverPhotoAsset.originalFilename}
                            fill
                            sizes="(min-width: 1024px) 40vw, 100vw"
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
                            ? "Draft already linked. Keep stock grouping stable and continue in the draft."
                            : "Keep grouping here, then generate a linked draft from this stock item."}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <form
                          action={renameStockItemAction.bind(
                            null,
                            session.id,
                            stockItem.id,
                            "session"
                          )}
                          className="flex flex-col gap-3 sm:flex-row"
                        >
                          <input
                            type="text"
                            name="stockItemName"
                            defaultValue={stockItem.name}
                            className={inputClassName}
                          />
                          <PendingSubmitButton
                            type="submit"
                            variant="outline"
                            pendingLabel="Saving name"
                          >
                            Save name
                          </PendingSubmitButton>
                        </form>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            <ImagesIcon data-icon="inline-start" />
                            {stockPhotoAssets.length} photo
                            {stockPhotoAssets.length === 1 ? "" : "s"}
                          </Badge>
                          {stockItem.draftId ? (
                            <Badge variant="outline">draft linked</Badge>
                          ) : (
                            <Badge variant="outline">no draft yet</Badge>
                          )}
                        </div>

                        {stockPhotoAssets.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                            {stockPhotoAssets.slice(0, 8).map((photoAsset) => (
                              <div
                                key={photoAsset.id}
                                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                              >
                                <Image
                                  src={`/api/sessions/${session.id}/photos/${photoAsset.id}`}
                                  alt={photoAsset.originalFilename}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>

                      <CardFooter className="flex flex-wrap justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <form
                            action={assignSelectedPhotoAssetsToStockItemAction.bind(
                              null,
                              session.id,
                              stockItem.id,
                              "session"
                            )}
                          >
                            <HiddenPhotoAssetInputs
                              photoAssetIds={selectedPhotoAssetIds}
                            />
                            <PendingSubmitButton
                              type="submit"
                              variant="outline"
                              disabled={!canAssignSelection}
                              pendingLabel="Assigning photos"
                            >
                              <ImagePlusIcon data-icon="inline-start" />
                              Assign selected
                            </PendingSubmitButton>
                          </form>

                          {stockItem.draftId ? (
                            <Link
                              href={`/drafts/${stockItem.draftId}`}
                              className={buttonVariants({ variant: "outline" })}
                            >
                              Open draft
                            </Link>
                          ) : null}
                        </div>

                        <form
                          action={removeStockItemAction.bind(
                            null,
                            session.id,
                            stockItem.id,
                            "session"
                          )}
                        >
                          <PendingSubmitButton
                            type="submit"
                            variant="outline"
                            disabled={stockItem.draftId !== null}
                            pendingLabel="Removing stock item"
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Remove item
                          </PendingSubmitButton>
                        </form>
                      </CardFooter>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function getStockPhotoAssets(session: StudioSessionDetail, stockItemId: string) {
  return session.photoAssets
    .filter((photoAsset) => photoAsset.stockItemId === stockItemId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}
