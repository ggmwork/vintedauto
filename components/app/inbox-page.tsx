"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BoxIcon, FolderSyncIcon, ImagesIcon, PauseIcon, PlayIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  assignSelectedPhotoAssetsToStockItemAction,
  createStockItemFromSelectionAction,
  pauseInboxWatcherAction,
  resumeInboxWatcherAction,
  saveInboxWatcherSettingsAction,
  scanInboxWatcherNowAction,
} from "@/app/actions";
import { CopyTextButton } from "@/components/app/copy-text-button";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { StockItemStatusBadge } from "@/components/app/stock-item-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InboxViewModel } from "@/lib/inbox/inbox-service";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

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

export function InboxPage({
  inbox,
  feedback,
}: {
  inbox: InboxViewModel;
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const router = useRouter();
  const [selectedPhotoAssetIds, setSelectedPhotoAssetIds] = useState<string[]>([]);
  const watchedSession = inbox.watchedSession;
  const draftableStockItems = useMemo(
    () =>
      watchedSession?.stockItems.filter((stockItem) => stockItem.draftId === null) ?? [],
    [watchedSession]
  );

  useEffect(() => {
    if (!inbox.watcher.running || !inbox.watcher.config.enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [inbox.watcher.config.enabled, inbox.watcher.running, router]);

  function toggleSelection(photoAssetId: string) {
    setSelectedPhotoAssetIds((current) =>
      current.includes(photoAssetId)
        ? current.filter((entry) => entry !== photoAssetId)
        : [...current, photoAssetId]
    );
  }

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Inbox</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Paste photos into one folder. Let the app take it from there.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Top-level subfolders become stock items automatically. Loose files stay
              here until you group them.
            </p>
          </div>
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

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Watched folder</CardTitle>
              <CardDescription>
                The watcher runs while the app is open. Paste photos into this path.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={saveInboxWatcherSettingsAction} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Folder path
                  </label>
                  <input
                    type="text"
                    name="folderPath"
                    defaultValue={inbox.watcher.config.folderPath}
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <PendingSubmitButton type="submit" pendingLabel="Saving folder">
                    <FolderSyncIcon data-icon="inline-start" />
                    Save folder
                  </PendingSubmitButton>
                  <CopyTextButton value={inbox.watcher.config.folderPath} label="Copy path" />
                </div>
              </form>

              <div className="flex flex-wrap gap-3">
                <form action={resumeInboxWatcherAction}>
                  <PendingSubmitButton
                    type="submit"
                    pendingLabel="Resuming watcher"
                    variant={inbox.watcher.running ? "outline" : "default"}
                  >
                    <PlayIcon data-icon="inline-start" />
                    {inbox.watcher.running ? "Watching" : "Resume watcher"}
                  </PendingSubmitButton>
                </form>

                <form action={pauseInboxWatcherAction}>
                  <PendingSubmitButton
                    type="submit"
                    pendingLabel="Pausing watcher"
                    variant="outline"
                    disabled={!inbox.watcher.config.enabled}
                  >
                    <PauseIcon data-icon="inline-start" />
                    Pause
                  </PendingSubmitButton>
                </form>

                <form action={scanInboxWatcherNowAction}>
                  <PendingSubmitButton type="submit" pendingLabel="Scanning now" variant="outline">
                    <RefreshCwIcon data-icon="inline-start" />
                    Scan now
                  </PendingSubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watcher status</CardTitle>
              <CardDescription>
                Keep this operational. No large dashboard needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={inbox.watcher.running ? "default" : "secondary"}>
                  {inbox.watcher.running ? "watching" : inbox.watcher.health}
                </Badge>
                <Badge variant="outline">
                  {inbox.autoStockedItemsCount} stock items
                </Badge>
                <Badge variant="outline">
                  {inbox.loosePhotoAssets.length} loose photos
                </Badge>
                <Badge variant="outline">
                  {inbox.draftedStockItemsCount} drafted
                </Badge>
              </div>

              <dl className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last start</dt>
                  <dd>{formatDate(inbox.watcher.lastStartedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last event</dt>
                  <dd>{formatDate(inbox.watcher.lastEventAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last import</dt>
                  <dd>{formatDate(inbox.watcher.lastImportAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Imported files</dt>
                  <dd>{inbox.watcher.importedFileCount}</dd>
                </div>
              </dl>

              {inbox.watcher.lastError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {inbox.watcher.lastError}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Loose photos</CardTitle>
              <CardDescription>
                Files pasted into the watched root stay here until you group them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background px-4 py-4">
                <Badge variant="secondary">{selectedPhotoAssetIds.length} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {watchedSession?.intakeConfig.folderLabel ??
                    watchedSession?.intakeConfig.folderPath ??
                    "No imported photos yet"}
                </span>
              </div>

              {watchedSession ? (
                <form
                  action={createStockItemFromSelectionAction.bind(null, watchedSession.id, "inbox")}
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
                  <div className="flex justify-end">
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
              ) : null}

              {inbox.loosePhotoAssets.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <ImagesIcon className="size-4" />
                  No loose photos right now.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {inbox.loosePhotoAssets.map((photoAsset) => {
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
                            src={`/api/sessions/${photoAsset.sessionId}/photos/${photoAsset.id}`}
                            alt={photoAsset.originalFilename}
                            fill
                            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="space-y-3 px-4 py-4">
                          <div className="space-y-1">
                            <p className="truncate font-medium">{photoAsset.originalFilename}</p>
                            <p className="text-sm text-muted-foreground">
                              {photoAsset.relativePath ?? "Loose watched file"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{formatFileSize(photoAsset.sizeBytes)}</Badge>
                            {selected ? <Badge variant="secondary">selected</Badge> : null}
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
              <CardTitle>Existing stock items</CardTitle>
              <CardDescription>
                Add selected loose photos to an undrafted stock item when the watcher could
                not group them automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {draftableStockItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <BoxIcon className="size-4" />
                  No undrafted stock items available yet.
                </div>
              ) : (
                draftableStockItems.map((stockItem) => (
                  <div
                    key={stockItem.id}
                    className="rounded-xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{stockItem.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stockItem.photoAssetIds.length} photo
                          {stockItem.photoAssetIds.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <StockItemStatusBadge stockItem={stockItem} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form
                        action={assignSelectedPhotoAssetsToStockItemAction.bind(
                          null,
                          stockItem.sessionId,
                          stockItem.id,
                          "inbox"
                        )}
                      >
                        <HiddenPhotoAssetInputs photoAssetIds={selectedPhotoAssetIds} />
                        <PendingSubmitButton
                          type="submit"
                          variant="outline"
                          disabled={selectedPhotoAssetIds.length === 0}
                          pendingLabel="Assigning photos"
                        >
                          Add selected here
                        </PendingSubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
