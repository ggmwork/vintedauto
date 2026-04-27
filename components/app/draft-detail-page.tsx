import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ImageIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import {
  removeDraftImageAction,
  uploadDraftImagesAction,
} from "@/app/actions";
import { DraftStatusBadge } from "@/components/app/draft-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DraftDetail } from "@/types/draft";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderValue(value: string | null) {
  return value ?? "Not set yet";
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

function formatDimensions(width: number | null, height: number | null) {
  if (!width || !height) {
    return "Dimensions pending";
  }

  return `${width} x ${height}`;
}

export function DraftDetailPage({ draft }: { draft: DraftDetail }) {
  const uploadAction = uploadDraftImagesAction.bind(null, draft.id);

  return (
    <main className="flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to drafts
            </Link>
            <Badge variant="secondary">Draft detail</Badge>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-3xl flex-col gap-3">
              <h1 className="font-heading text-4xl leading-tight font-semibold text-balance">
                {draft.title ?? "Untitled draft"}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Local draft persists, accepts desktop images, and stays
                reopenable. Next phases add AI generation and editable listing
                review.
              </p>
            </div>

            <DraftStatusBadge status={draft.status} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Draft identity</CardTitle>
              <CardDescription>
                Stable record that image and generation flows attach to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Draft ID</dt>
                  <dd className="break-all">{draft.id}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(draft.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{formatDate(draft.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image state</CardTitle>
              <CardDescription>Desktop upload flow is active now.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                <ImageIcon className="size-4" />
                {draft.imageCount === 0
                  ? "No images attached yet."
                  : `${draft.imageCount} image${draft.imageCount === 1 ? "" : "s"} stored and reopenable.`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation state</CardTitle>
              <CardDescription>
                Phase 3 will generate text and pricing from uploaded images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                <SparklesIcon className="size-4" />
                {draft.title || draft.description || draft.priceSuggestion
                  ? "Draft already contains generation-related fields."
                  : "No generated listing content yet."}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Structured metadata</CardTitle>
              <CardDescription>
                These fields are already part of the draft model and are ready
                for forms next.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Brand</dt>
                  <dd>{renderValue(draft.metadata.brand)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{renderValue(draft.metadata.category)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{renderValue(draft.metadata.size)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Condition</dt>
                  <dd>{renderValue(draft.metadata.condition)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Color</dt>
                  <dd>{renderValue(draft.metadata.color)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Material</dt>
                  <dd>{renderValue(draft.metadata.material)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{renderValue(draft.metadata.notes)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What this route unlocks</CardTitle>
              <CardDescription>
                This draft detail route is now the stable home for the rest of
                the product loop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Phase 2: image upload</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Done. This draft now accepts desktop image uploads and keeps
                    them attached across reloads.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Phase 3: AI generation</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Generate title, description, keywords, and price suggestion
                    from uploaded images.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Phase 4: review UI</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Show and edit the generated result in one screen.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Current draft route is persistent and reopenable.
              </span>
            </CardFooter>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Images attached
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload desktop images, review previews, and remove anything you
                do not want in the draft.
              </p>
            </div>
            <Badge variant="outline">{draft.imageCount} images</Badge>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Upload images</CardTitle>
              <CardDescription>
                Add multiple desktop images now. They attach to this draft in
                selected order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={uploadAction} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    Choose images
                  </span>
                  <input
                    className="block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
                    type="file"
                    name="images"
                    accept="image/*"
                    multiple
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, WEBP, GIF, and HEIC are accepted if the browser
                    exposes them as image files.
                  </p>
                  <Button type="submit">
                    <UploadIcon data-icon="inline-start" />
                    Upload images
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {draft.images.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <ImageIcon className="size-4" />
                  No image assets stored yet for this draft.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {draft.images.map((image) => {
                const removeAction = removeDraftImageAction.bind(
                  null,
                  draft.id,
                  image.id
                );

                return (
                  <Card key={image.id}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <Image
                        src={`/api/drafts/${draft.id}/images/${image.id}`}
                        alt={image.originalFilename}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <CardContent className="flex flex-col gap-3 pt-4">
                      <div className="flex flex-col gap-1">
                        <span className="truncate font-medium">
                          {image.originalFilename}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Position {image.sortOrder + 1}
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex flex-col gap-1">
                          <dt className="text-muted-foreground">Size</dt>
                          <dd>{formatFileSize(image.sizeBytes)}</dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-muted-foreground">Dimensions</dt>
                          <dd>{formatDimensions(image.width, image.height)}</dd>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <span className="truncate text-xs text-muted-foreground">
                        {image.id}
                      </span>
                      <form action={removeAction}>
                        <Button type="submit" variant="outline">
                          <Trash2Icon data-icon="inline-start" />
                          Remove
                        </Button>
                      </form>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
