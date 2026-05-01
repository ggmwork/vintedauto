"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BoxIcon,
  FolderSyncIcon,
  ImagesIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
  SplitSquareVerticalIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  assignSelectedPhotoAssetsToStockItemAction,
  clearInboxSuggestionsAction,
  commitCandidateClusterAction,
  createStockItemFromSelectionAction,
  dissolveCandidateClusterAction,
  pauseInboxWatcherAction,
  resumeInboxWatcherAction,
  saveInboxWatcherSettingsAction,
  scanInboxWatcherNowAction,
  suggestInboxGroupsAction,
  suggestSelectedInboxGroupsAction,
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
import type { InboxReviewCluster, InboxViewModel } from "@/lib/inbox/inbox-service";
import { cn } from "@/lib/utils";
import type { GroupingConfidence, PhotoAsset } from "@/types/intake";

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

function getWatcherStatusLabel(health: string, running: boolean) {
  if (health === "scanning") {
    return "scanning";
  }

  if (running) {
    return "watching";
  }

  return health;
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

function getConfidenceBadgeVariant(confidence: GroupingConfidence) {
  if (confidence === "high") {
    return "default";
  }

  if (confidence === "medium") {
    return "secondary";
  }

  return "outline";
}

function buildPhotoDescriptorLabel(photoAsset: PhotoAsset) {
  const descriptor = photoAsset.descriptor;

  if (!descriptor) {
    return "No descriptor yet";
  }

  const parts = [
    descriptor.visibleBrand,
    descriptor.primaryColor,
    descriptor.garmentType,
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return "Low-confidence descriptor";
  }

  return parts.join(" ");
}

function buildClusterLabel(clusterEntry: InboxReviewCluster) {
  if (clusterEntry.cluster.name) {
    return clusterEntry.cluster.name;
  }

  const firstPhotoAsset = clusterEntry.photoAssets[0];

  if (!firstPhotoAsset) {
    return "Suggested stock item";
  }

  return buildPhotoDescriptorLabel(firstPhotoAsset);
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
  const latestGroupingRun = watchedSession?.groupingRuns[0] ?? null;
  const loosePhotoAssetIds = useMemo(
    () => new Set(inbox.loosePhotoAssets.map((photoAsset) => photoAsset.id)),
    [inbox.loosePhotoAssets]
  );
  const selectedLoosePhotoAssetIds = useMemo(
    () =>
      selectedPhotoAssetIds.filter((photoAssetId) => loosePhotoAssetIds.has(photoAssetId)),
    [loosePhotoAssetIds, selectedPhotoAssetIds]
  );
  const draftableStockItems = useMemo(
    () =>
      watchedSession?.stockItems.filter((stockItem) => stockItem.draftId === null) ?? [],
    [watchedSession]
  );

  useEffect(() => {
    if (
      !inbox.watcher.running ||
      !inbox.watcher.config.enabled ||
      selectedLoosePhotoAssetIds.length > 0
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    inbox.watcher.config.enabled,
    inbox.watcher.running,
    router,
    selectedLoosePhotoAssetIds.length,
  ]);

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
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Inbox</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Drop photos in one folder. Group the item here.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Import is automatic. Manual grouping is the default. Suggestions stay optional.
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
                Keep one desktop folder as the intake inbox. New photos land here while
                the app is open.
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
                  <CopyTextButton
                    value={inbox.watcher.config.folderPath}
                    label="Copy path"
                  />
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
                  <PendingSubmitButton
                    type="submit"
                    pendingLabel="Scanning now"
                    variant="outline"
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    Scan now
                  </PendingSubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Watcher</CardTitle>
              <CardDescription>
                Auto import runs here. Grouping stays manual unless you ask for a suggestion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    inbox.watcher.health === "error"
                      ? "destructive"
                      : inbox.watcher.health === "scanning" || inbox.watcher.running
                        ? "default"
                        : "secondary"
                  }
                >
                  {getWatcherStatusLabel(inbox.watcher.health, inbox.watcher.running)}
                </Badge>
                <Badge variant="outline">{inbox.autoStockedItemsCount} stock</Badge>
                <Badge variant="outline">
                  {inbox.pendingReviewClusterCount} review cluster
                  {inbox.pendingReviewClusterCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">
                  {inbox.loosePhotoAssets.length} loose photo
                  {inbox.loosePhotoAssets.length === 1 ? "" : "s"}
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
                  <dt className="text-muted-foreground">Last scan</dt>
                  <dd>{formatDate(inbox.watcher.lastScanAt)}</dd>
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

              {inbox.watcher.lastScanSummary ? (
                <div className="rounded-lg border border-border/70 bg-background px-4 py-3">
                  <p className="font-medium text-foreground">Last scan result</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {inbox.watcher.lastScanSummary}
                  </p>
                </div>
              ) : null}

              {latestGroupingRun?.notes ? (
                <div className="rounded-lg border border-border/70 bg-background px-4 py-3">
                  <p className="font-medium text-foreground">Last grouping run</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestGroupingRun.notes}
                  </p>
                </div>
              ) : null}

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
              <CardTitle>Ungrouped photos</CardTitle>
              <CardDescription>
                Select matching photos and create an item. Use suggestions only when you
                want help.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background px-4 py-4">
                <Badge variant="secondary">{selectedLoosePhotoAssetIds.length} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {watchedSession?.intakeConfig.folderLabel ??
                    watchedSession?.intakeConfig.folderPath ??
                    "No imported photos yet"}
                </span>
                {selectedLoosePhotoAssetIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>

              {watchedSession ? (
                <div className="grid gap-4 rounded-lg border border-border/70 bg-background px-4 py-4">
                  <form
                    action={createStockItemFromSelectionAction.bind(
                      null,
                      watchedSession.id,
                      "inbox"
                    )}
                    className="grid gap-4"
                  >
                    <HiddenPhotoAssetInputs photoAssetIds={selectedLoosePhotoAssetIds} />
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        New item name
                      </label>
                      <input
                        type="text"
                        name="stockItemName"
                        placeholder="Blue Nike hoodie"
                        className={inputClassName}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Click the matching photos below, then group them into one stock item
                      here. Auto-refresh pauses while you have a selection.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <PendingSubmitButton
                        type="submit"
                        disabled={selectedLoosePhotoAssetIds.length === 0}
                        pendingLabel="Grouping photos"
                      >
                        <BoxIcon data-icon="inline-start" />
                        Group selected into item
                      </PendingSubmitButton>
                    </div>
                  </form>

                  <div className="flex flex-wrap gap-3 border-t border-border/70 pt-4">
                    <form action={suggestInboxGroupsAction.bind(null, watchedSession.id)}>
                      <PendingSubmitButton
                        type="submit"
                        variant="outline"
                        disabled={inbox.loosePhotoAssets.length < 2}
                        pendingLabel="Suggesting groups"
                      >
                        <SparklesIcon data-icon="inline-start" />
                        Suggest groups
                      </PendingSubmitButton>
                    </form>

                    <form
                      action={suggestSelectedInboxGroupsAction.bind(
                        null,
                        watchedSession.id
                      )}
                    >
                      <HiddenPhotoAssetInputs photoAssetIds={selectedLoosePhotoAssetIds} />
                      <PendingSubmitButton
                        type="submit"
                        variant="outline"
                        disabled={selectedLoosePhotoAssetIds.length < 2}
                        pendingLabel="Suggesting selection"
                      >
                        <SparklesIcon data-icon="inline-start" />
                        Suggest selected
                      </PendingSubmitButton>
                    </form>
                  </div>
                </div>
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
                        aria-pressed={selected}
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
                          <div className="absolute top-3 right-3 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground">
                            {selected ? "selected" : "pick"}
                          </div>
                        </div>
                        <div className="space-y-3 px-4 py-4">
                          <div className="space-y-1">
                            <p className="truncate font-medium">{photoAsset.originalFilename}</p>
                            <p className="text-sm text-muted-foreground">
                              {buildPhotoDescriptorLabel(photoAsset)}
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
                Use this when selected photos belong to an item that already exists.
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {stockItem.sourceMethod === "folder_rule"
                          ? "folder"
                          : stockItem.sourceMethod === "auto_cluster"
                            ? "auto"
                            : "manual"}
                      </Badge>
                      <Badge variant={getConfidenceBadgeVariant(stockItem.confidence)}>
                        {stockItem.confidence} confidence
                      </Badge>
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
                        <HiddenPhotoAssetInputs photoAssetIds={selectedLoosePhotoAssetIds} />
                        <PendingSubmitButton
                          type="submit"
                          variant="outline"
                          disabled={selectedLoosePhotoAssetIds.length === 0}
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

        {inbox.reviewClusters.length > 0 ? (
          <section>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Suggested groups</CardTitle>
                    <CardDescription>
                      Optional auto-grouping help. Review the suggestion, then create the
                      item or send the photos back to Inbox.
                    </CardDescription>
                  </div>
                  {watchedSession ? (
                    <form action={clearInboxSuggestionsAction.bind(null, watchedSession.id)}>
                      <PendingSubmitButton
                        type="submit"
                        variant="outline"
                        pendingLabel="Clearing suggestions"
                      >
                        <SplitSquareVerticalIcon data-icon="inline-start" />
                        Clear suggestions
                      </PendingSubmitButton>
                    </form>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-2">
                {inbox.reviewClusters.map((clusterEntry) => (
                  <ReviewClusterCard
                    key={clusterEntry.cluster.id}
                    clusterEntry={clusterEntry}
                    sessionId={watchedSession?.id ?? ""}
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ReviewClusterCard({
  clusterEntry,
  sessionId,
}: {
  clusterEntry: InboxReviewCluster;
  sessionId: string;
}) {
  const suggestion = buildClusterLabel(clusterEntry);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{suggestion}</p>
          <p className="text-sm text-muted-foreground">
            {clusterEntry.cluster.reason ?? "Clustered from watched-folder intake."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={getConfidenceBadgeVariant(clusterEntry.cluster.confidence)}>
            {clusterEntry.cluster.confidence} confidence
          </Badge>
          <Badge variant="outline">
            {clusterEntry.cluster.sourceMethod === "folder_rule" ? "folder" : "cluster"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {clusterEntry.photoAssets.slice(0, 8).map((photoAsset) => (
          <div key={photoAsset.id} className="space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                src={`/api/sessions/${photoAsset.sessionId}/photos/${photoAsset.id}`}
                alt={photoAsset.originalFilename}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {buildPhotoDescriptorLabel(photoAsset)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <form
          action={commitCandidateClusterAction.bind(
            null,
            sessionId,
            clusterEntry.cluster.id,
            "inbox"
          )}
          className="grid gap-3"
        >
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground">
            Item name
          </label>
          <input
            type="text"
            name="stockItemName"
            defaultValue={clusterEntry.cluster.name ?? ""}
            placeholder="Optional rename before commit"
            className={inputClassName}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <PendingSubmitButton type="submit" pendingLabel="Committing cluster">
            <SparklesIcon data-icon="inline-start" />
            Create item from suggestion
          </PendingSubmitButton>
        </div>
        </form>

        <form
          action={dissolveCandidateClusterAction.bind(
            null,
            sessionId,
            clusterEntry.cluster.id,
            "inbox"
          )}
        >
          <PendingSubmitButton
            type="submit"
            variant="outline"
            pendingLabel="Dissolving cluster"
          >
            <SplitSquareVerticalIcon data-icon="inline-start" />
            Send back to Inbox
          </PendingSubmitButton>
        </form>
      </div>
    </div>
  );
}
