import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImagesIcon, SparklesIcon } from "lucide-react";

import { generateStockItemDraftAction } from "@/app/actions";
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
import { draftRepository } from "@/lib/drafts";
import { listAllSessionDetails } from "@/lib/inbox/inbox-service";
import { findActiveListingGenerationJob } from "@/lib/listing-generation-jobs";
import type { DraftDetail } from "@/types/draft";
import type { PhotoAsset, StockItem, StudioSessionDetail } from "@/types/intake";
import type { ListingGenerationJob } from "@/types/listing-generation-job";

export const dynamic = "force-dynamic";

interface StockItemDetail {
  session: StudioSessionDetail;
  stockItem: StockItem;
  photoAssets: PhotoAsset[];
}

function pickSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getPhotoAssetsForStockItem(
  session: StudioSessionDetail,
  stockItemId: string
) {
  return session.photoAssets
    .filter((photoAsset) => photoAsset.stockItemId === stockItemId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function findStockItem(stockItemId: string): Promise<StockItemDetail | null> {
  const sessions = await listAllSessionDetails();

  for (const session of sessions) {
    const stockItem = session.stockItems.find((entry) => entry.id === stockItemId);

    if (stockItem) {
      return {
        session,
        stockItem,
        photoAssets: getPhotoAssetsForStockItem(session, stockItem.id),
      };
    }
  }

  return null;
}

function getCoverPhotoAsset(
  stockItem: StockItem,
  photoAssets: PhotoAsset[]
) {
  return (
    photoAssets.find((photoAsset) => photoAsset.id === stockItem.coverPhotoAssetId) ??
    photoAssets[0] ??
    null
  );
}

function StockItemActions({
  detail,
  draft,
  activeJob,
}: {
  detail: StockItemDetail;
  draft: DraftDetail | null;
  activeJob: ListingGenerationJob | null;
}) {
  if (draft) {
    return (
      <Link href={`/drafts/${draft.id}`} className={buttonVariants()}>
        Open listing
      </Link>
    );
  }

  return (
    <form
      action={generateStockItemDraftAction.bind(
        null,
        detail.session.id,
        detail.stockItem.id,
        "inventory"
      )}
    >
      <PendingSubmitButton
        type="submit"
        disabled={detail.photoAssets.length === 0 || Boolean(activeJob)}
        pendingLabel="Generating listing"
      >
        <SparklesIcon data-icon="inline-start" />
        {activeJob ? "Generating listing" : "Generate listing"}
      </PendingSubmitButton>
    </form>
  );
}

export default async function StockItemRoute({
  params,
  searchParams,
}: {
  params: Promise<{ stockItemId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { stockItemId } = await params;
  const resolvedSearchParams = await searchParams;
  const detail = await findStockItem(stockItemId);

  if (!detail) {
    notFound();
  }

  const draft = detail.stockItem.draftId
    ? await draftRepository.getById(detail.stockItem.draftId)
    : null;
  const activeJob = await findActiveListingGenerationJob({
    targetType: "stock-item",
    sessionId: detail.session.id,
    stockItemId: detail.stockItem.id,
  });
  const coverPhotoAsset = getCoverPhotoAsset(detail.stockItem, detail.photoAssets);
  const title = draft?.title?.trim() || detail.stockItem.name;
  const flash = pickSearchParam(resolvedSearchParams.flash) ?? null;
  const error = pickSearchParam(resolvedSearchParams.error) ?? null;

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Inventory item</Badge>
              <StockItemStatusBadge stockItem={detail.stockItem} />
            </div>
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-semibold text-balance">
                {title}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {detail.session.intakeConfig.folderLabel ??
                  detail.session.intakeConfig.folderPath ??
                  detail.session.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/review" className={buttonVariants({ variant: "outline" })}>
              Back to Inventory
            </Link>
            <StockItemActions detail={detail} draft={draft} activeJob={activeJob} />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {flash ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">
            {flash}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          {coverPhotoAsset ? (
            <div className="relative aspect-[4/3] bg-muted">
              <Image
                src={`/api/sessions/${detail.session.id}/photos/${coverPhotoAsset.id}`}
                alt={coverPhotoAsset.originalFilename}
                fill
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}

          <CardHeader>
            <CardTitle>Item photos</CardTitle>
            <CardDescription>
              Photos grouped for this exact inventory item.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                <ImagesIcon data-icon="inline-start" />
                {detail.photoAssets.length} photo
                {detail.photoAssets.length === 1 ? "" : "s"}
              </Badge>
              {draft ? (
                <Badge variant="outline">listing linked</Badge>
              ) : activeJob ? (
                <Badge variant="secondary">generating listing</Badge>
              ) : (
                <Badge variant="outline">no listing yet</Badge>
              )}
            </div>

            {detail.photoAssets.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {detail.photoAssets.map((photoAsset) => (
                  <div
                    key={photoAsset.id}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <Image
                      src={`/api/sessions/${detail.session.id}/photos/${photoAsset.id}`}
                      alt={photoAsset.originalFilename}
                      fill
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                No photos grouped for this item.
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-3">
            <Link
              href={`/sessions/${detail.session.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Open source session
            </Link>
            <StockItemActions detail={detail} draft={draft} activeJob={activeJob} />
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
