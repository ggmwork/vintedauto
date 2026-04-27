import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ImageIcon,
  LoaderCircleIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import {
  generateDraftListingAction,
  removeDraftImageAction,
  saveDraftReviewAction,
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

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName = `${inputClassName} min-h-28 resize-y`;

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

function formatKeywords(keywords: string[]) {
  return keywords.join(", ");
}

function formatGenerationLabel(draft: DraftDetail) {
  if (!draft.generation) {
    return "No generated listing content yet.";
  }

  return `Generated with ${draft.generation.provider}:${draft.generation.model} on ${formatDate(draft.generation.generatedAt)}.`;
}

interface DraftDetailPageFeedback {
  flash: string | null;
  error: string | null;
}

export function DraftDetailPage({
  draft,
  feedback,
}: {
  draft: DraftDetail;
  feedback: DraftDetailPageFeedback;
}) {
  const uploadAction = uploadDraftImagesAction.bind(null, draft.id);
  const generateAction = generateDraftListingAction.bind(null, draft.id);
  const saveReviewAction = saveDraftReviewAction.bind(null, draft.id);
  const hasReviewContent =
    draft.title !== null ||
    draft.description !== null ||
    draft.keywords.length > 0 ||
    draft.priceSuggestion !== null;

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
                Local draft persists, accepts desktop images, runs through
                Ollama, and keeps the review state reopenable.
              </p>
            </div>

            <DraftStatusBadge status={draft.status} />
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
                Ollama generation now turns uploaded images into editable
                listing output.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                {draft.generation ? (
                  <SparklesIcon className="size-4" />
                ) : (
                  <LoaderCircleIcon className="size-4" />
                )}
                {formatGenerationLabel(draft)}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Structured metadata</CardTitle>
              <CardDescription>
                AI-populated metadata suggestions land here and persist with the
                draft.
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
              <CardTitle>Generate listing</CardTitle>
              <CardDescription>
                Run the local Ollama model against the stored image set and save
                structured output into the draft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Provider</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {draft.generation
                      ? `${draft.generation.provider}:${draft.generation.model}`
                      : "ollama:qwen3.5:4b (default unless env overrides it)"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Condition notes</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {draft.generation?.conditionNotes ??
                      "No condition notes generated yet."}
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                  <h3 className="font-medium">Price rationale</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {draft.priceSuggestion?.rationale ??
                      "No price rationale saved yet."}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Generation persists after save and refresh.
              </span>
              <form action={generateAction}>
                <Button type="submit" disabled={draft.imageCount === 0}>
                  <SparklesIcon data-icon="inline-start" />
                  Generate listing
                </Button>
              </form>
            </CardFooter>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Review listing
              </h2>
              <p className="text-sm text-muted-foreground">
                Edit generated content before export or later Vinted autofill.
              </p>
            </div>
            {draft.generation ? (
              <Badge variant="secondary">
                {draft.generation.provider}:{draft.generation.model}
              </Badge>
            ) : (
              <Badge variant="outline">Awaiting generation</Badge>
            )}
          </div>

          <Separator />

          {hasReviewContent ? (
            <Card>
              <CardHeader>
                <CardTitle>Editable draft content</CardTitle>
                <CardDescription>
                  This form saves the current review state back into the local
                  draft repository.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={saveReviewAction} className="grid gap-6">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={draft.title ?? ""}
                      className={inputClassName}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={draft.description ?? ""}
                      className={textareaClassName}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground">
                      Keywords
                    </label>
                    <textarea
                      name="keywords"
                      defaultValue={formatKeywords(draft.keywords)}
                      className={`${inputClassName} min-h-24 resize-y`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate keywords with commas or new lines.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Price amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="priceAmount"
                        defaultValue={draft.priceSuggestion?.amount ?? ""}
                        className={inputClassName}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Min amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="priceMinAmount"
                        defaultValue={draft.priceSuggestion?.minAmount ?? ""}
                        className={inputClassName}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Max amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="priceMaxAmount"
                        defaultValue={draft.priceSuggestion?.maxAmount ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Price rationale
                      </label>
                      <textarea
                        name="priceRationale"
                        defaultValue={draft.priceSuggestion?.rationale ?? ""}
                        className={`${inputClassName} min-h-24 resize-y`}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-foreground">
                        Confidence
                      </label>
                      <select
                        name="priceConfidence"
                        defaultValue={draft.priceSuggestion?.confidence ?? "medium"}
                        className={inputClassName}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button type="submit">Save review</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <SparklesIcon className="size-4" />
                  Generate a listing first to review and edit it here.
                </div>
              </CardContent>
            </Card>
          )}
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
