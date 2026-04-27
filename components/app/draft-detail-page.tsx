"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  HistoryIcon,
  ImageIcon,
  PackageCheckIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import {
  generateDraftListingAction,
  removeDraftImageAction,
  restoreDraftGenerationAction,
  saveDraftReviewAction,
  setDraftStatusAction,
  uploadDraftImagesAction,
} from "@/app/actions";
import { DraftExportPanel } from "@/components/app/draft-export-panel";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { DraftStatusBadge } from "@/components/app/draft-status-badge";
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
import { getChangedFieldsFromGeneration } from "@/lib/drafts/draft-generation-diff";
import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import type { DraftDetail } from "@/types/draft";
import type { PriceSuggestion } from "@/types/pricing";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName = `${inputClassName} min-h-28 resize-y`;

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

function formatDimensions(width: number | null, height: number | null) {
  if (!width || !height) {
    return "Dimensions pending";
  }

  return `${width} x ${height}`;
}

function formatKeywords(keywords: string[]) {
  return keywords.join(", ");
}

function formatPriceSuggestion(priceSuggestion: PriceSuggestion | null) {
  if (!priceSuggestion) {
    return "Not set";
  }

  if (priceSuggestion.amount !== null) {
    return `${priceSuggestion.amount.toFixed(2)} ${priceSuggestion.currency}`;
  }

  if (priceSuggestion.minAmount !== null || priceSuggestion.maxAmount !== null) {
    return `${priceSuggestion.minAmount?.toFixed(2) ?? "?"} - ${priceSuggestion.maxAmount?.toFixed(2) ?? "?"} ${priceSuggestion.currency}`;
  }

  return `Not set (${priceSuggestion.currency})`;
}

function formatReadinessItem(value: string) {
  switch (value) {
    case "images":
      return "images";
    case "title":
      return "title";
    case "description":
      return "description";
    case "keywords":
      return "keywords";
    case "price":
      return "price";
    case "category":
      return "category";
    case "condition":
      return "condition";
    default:
      return value;
  }
}

function getStepCopy(draft: DraftDetail) {
  if (draft.imageCount === 0) {
    return "Upload images to start the draft.";
  }

  if (!draft.generation) {
    return "Generate the listing from the uploaded images.";
  }

  const readiness = getDraftReadiness(draft);

  if (!readiness.ready) {
    return "Review and complete the generated fields.";
  }

  return "Copy the Vinted handoff and move into Vinted web.";
}

interface DraftDetailPageFeedback {
  flash: string | null;
  error: string | null;
}

type FocusSection = "upload" | "generate" | "review" | "export" | null;

export function DraftDetailPage({
  draft,
  feedback,
  focusSection,
}: {
  draft: DraftDetail;
  feedback: DraftDetailPageFeedback;
  focusSection: string | null;
}) {
  const uploadAction = uploadDraftImagesAction.bind(null, draft.id);
  const generateAction = generateDraftListingAction.bind(null, draft.id);
  const saveReviewAction = saveDraftReviewAction.bind(null, draft.id);
  const readiness = getDraftReadiness(draft);
  const changedFields = getChangedFieldsFromGeneration(draft, draft.generation);
  const hasReviewContent =
    draft.title !== null ||
    draft.description !== null ||
    draft.keywords.length > 0 ||
    draft.priceSuggestion !== null;
  const uploadRef = useRef<HTMLElement>(null);
  const generateRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const exportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sectionMap: Record<Exclude<FocusSection, null>, React.RefObject<HTMLElement | null>> = {
      upload: uploadRef,
      generate: generateRef,
      review: reviewRef,
      export: exportRef,
    };

    const targetSection = focusSection as FocusSection;

    if (!targetSection || !(targetSection in sectionMap)) {
      return;
    }

    const target = sectionMap[targetSection];

    if (!target.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.current?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      if (targetSection === "review") {
        const focusTarget = target.current?.querySelector<HTMLElement>(
          "[data-review-focus='true']"
        );

        focusTarget?.focus();
      }
    });
  }, [draft.id, draft.updatedAt, focusSection]);

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/" className={buttonVariants({ variant: "outline" })}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back to drafts
                </Link>
                <DraftStatusBadge status={draft.status} />
              </div>

              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold text-balance">
                  {draft.title ?? "New draft"}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Upload images first, then generate, review, and copy the final
                  Vinted handoff. Keep the page focused on the next action, not
                  on dashboard noise.
                </p>
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

            <section ref={uploadRef} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Badge variant="secondary">Step 1</Badge>
                  <h2 className="font-heading text-2xl font-semibold">
                    Upload images
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Start with the item photos. Everything else hangs off this
                    image set.
                  </p>
                </div>
                <Badge variant="outline">
                  {draft.imageCount} image{draft.imageCount === 1 ? "" : "s"}
                </Badge>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Add desktop images</CardTitle>
                  <CardDescription>
                    Upload the images in the order you want the draft to read
                    them.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <form action={uploadAction} className="space-y-4">
                    <label className="grid gap-2 text-sm">
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
                        JPG, PNG, WEBP, GIF, and HEIC work when the browser
                        exposes them as image files.
                      </p>
                      <PendingSubmitButton
                        type="submit"
                        pendingLabel="Uploading images"
                      >
                        <UploadIcon data-icon="inline-start" />
                        Upload images
                      </PendingSubmitButton>
                    </div>
                  </form>

                  {draft.images.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                      <ImageIcon className="size-4" />
                      No images attached yet.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {draft.images.map((image) => {
                        const removeAction = removeDraftImageAction.bind(
                          null,
                          draft.id,
                          image.id
                        );

                        return (
                          <Card key={image.id} className="overflow-hidden">
                            <div className="relative aspect-square bg-muted">
                              <Image
                                src={`/api/drafts/${draft.id}/images/${image.id}`}
                                alt={image.originalFilename}
                                fill
                                sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <CardContent className="space-y-3 pt-4">
                              <div className="space-y-1">
                                <p className="truncate font-medium">
                                  {image.originalFilename}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Position {image.sortOrder + 1}
                                </p>
                              </div>
                              <dl className="grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-1">
                                  <dt className="text-muted-foreground">Size</dt>
                                  <dd>{formatFileSize(image.sizeBytes)}</dd>
                                </div>
                                <div className="space-y-1">
                                  <dt className="text-muted-foreground">
                                    Dimensions
                                  </dt>
                                  <dd>{formatDimensions(image.width, image.height)}</dd>
                                </div>
                              </dl>
                            </CardContent>
                            <CardFooter className="justify-end">
                              <form action={removeAction}>
                                <PendingSubmitButton
                                  type="submit"
                                  variant="outline"
                                  pendingLabel="Removing"
                                >
                                  <Trash2Icon data-icon="inline-start" />
                                  Remove
                                </PendingSubmitButton>
                              </form>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section ref={generateRef} className="space-y-4">
              <div className="space-y-1">
                <Badge variant="secondary">Step 2</Badge>
                <h2 className="font-heading text-2xl font-semibold">
                  Generate listing
                </h2>
                <p className="text-sm text-muted-foreground">
                  Once the image set is ready, run the model and move straight
                  into the editable fields.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Run the local model</CardTitle>
                  <CardDescription>
                    {draft.imageCount === 0
                      ? "Upload at least one image first."
                      : "This creates or refreshes the generated title, description, keywords, metadata, and price suggestion."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm font-medium text-foreground">Provider</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {draft.generation
                        ? `${draft.generation.provider}:${draft.generation.model}`
                        : "ollama:qwen3.5:4b (default unless env overrides it)"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      Condition notes
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {draft.generation?.conditionNotes ??
                        "No generated notes yet."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      Price rationale
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {draft.priceSuggestion?.rationale ??
                        "No price rationale yet."}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Regeneration keeps fields you already edited away from the
                    last model output. Local vision runs can take around one to
                    two minutes on this machine.
                  </p>
                  <form action={generateAction}>
                    <PendingSubmitButton
                      type="submit"
                      disabled={draft.imageCount === 0}
                      pendingLabel={draft.generation ? "Regenerating" : "Generating"}
                    >
                      <SparklesIcon data-icon="inline-start" />
                      {draft.generation ? "Regenerate listing" : "Generate listing"}
                    </PendingSubmitButton>
                  </form>
                </CardFooter>
              </Card>
            </section>

            <section ref={reviewRef} className="space-y-4">
              <div className="space-y-1">
                <Badge variant="secondary">Step 3</Badge>
                <h2 className="font-heading text-2xl font-semibold">
                  Review listing fields
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generated fields land here. Edit the listing once, then save
                  the full draft state in one form.
                </p>
              </div>

              {hasReviewContent ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit current draft</CardTitle>
                    <CardDescription>
                      Title, description, keywords, price, and structured fields
                      save together now.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form action={saveReviewAction} className="space-y-6">
                      <div className="space-y-5">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium text-foreground">
                            Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            defaultValue={draft.title ?? ""}
                            className={inputClassName}
                            data-review-focus="true"
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
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-medium text-foreground">Price</h3>
                          <span className="text-sm text-muted-foreground">
                            {formatPriceSuggestion(draft.priceSuggestion)}
                          </span>
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

                        <details className="rounded-lg border border-border bg-background">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
                            Advanced pricing fields
                            <ChevronDownIcon className="size-4 text-muted-foreground" />
                          </summary>
                          <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-[1fr_220px]">
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
                        </details>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-medium text-foreground">
                          Structured fields
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Brand
                            </label>
                            <input
                              type="text"
                              name="brand"
                              defaultValue={draft.metadata.brand ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Category
                            </label>
                            <input
                              type="text"
                              name="category"
                              defaultValue={draft.metadata.category ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Size
                            </label>
                            <input
                              type="text"
                              name="size"
                              defaultValue={draft.metadata.size ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Condition
                            </label>
                            <input
                              type="text"
                              name="condition"
                              defaultValue={draft.metadata.condition ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Color
                            </label>
                            <input
                              type="text"
                              name="color"
                              defaultValue={draft.metadata.color ?? ""}
                              className={inputClassName}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">
                              Material
                            </label>
                            <input
                              type="text"
                              name="material"
                              defaultValue={draft.metadata.material ?? ""}
                              className={inputClassName}
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-sm font-medium text-foreground">
                            Notes
                          </label>
                          <textarea
                            name="notes"
                            defaultValue={draft.metadata.notes ?? ""}
                            className={`${inputClassName} min-h-24 resize-y`}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <PendingSubmitButton
                          type="submit"
                          pendingLabel="Saving fields"
                        >
                          Save listing fields
                        </PendingSubmitButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                      <SparklesIcon className="size-4" />
                      Upload images, then run generation to unlock the editable
                      listing fields here.
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            {hasReviewContent ? (
              <section ref={exportRef} className="space-y-4">
                <div className="space-y-1">
                  <Badge variant="secondary">Step 4</Badge>
                  <h2 className="font-heading text-2xl font-semibold">
                    Export to Vinted
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Copy the full handoff once the draft looks right.
                  </p>
                </div>

                <DraftExportPanel draft={draft} readiness={readiness} />
              </section>
            ) : null}

            {draft.generationHistory.length > 0 ? (
              <section className="space-y-4">
                <details className="rounded-xl border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HistoryIcon className="size-4 text-muted-foreground" />
                        <span className="font-heading text-xl font-semibold">
                          Generation history
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Keep this advanced. Open it only when you need to compare
                        or restore older model runs.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {draft.generationHistory.length} run
                      {draft.generationHistory.length === 1 ? "" : "s"}
                    </Badge>
                  </summary>

                  <div className="space-y-4 border-t border-border px-6 py-5">
                    {draft.generation ? (
                      <div className="rounded-lg border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
                        {changedFields.length === 0
                          ? "Current draft still matches the latest AI output."
                          : `Current draft differs from the latest AI output in ${changedFields.map((field) => field.label.toLowerCase()).join(", ")}.`}
                      </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-2">
                      {draft.generationHistory.map((generation, index) => {
                        const restoreAction = restoreDraftGenerationAction.bind(
                          null,
                          draft.id,
                          generation.generatedAt
                        );
                        const comparedFields = getChangedFieldsFromGeneration(
                          draft,
                          generation
                        );
                        const isActiveGeneration =
                          draft.generation?.generatedAt === generation.generatedAt;

                        return (
                          <Card key={generation.generatedAt}>
                            <CardHeader>
                              <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">
                                  {index === 0
                                    ? "Latest generation"
                                    : `Generation ${draft.generationHistory.length - index}`}
                                </CardTitle>
                                <Badge variant={isActiveGeneration ? "secondary" : "outline"}>
                                  {isActiveGeneration ? "active" : "history"}
                                </Badge>
                              </div>
                              <CardDescription>
                                {generation.provider}:{generation.model} on{" "}
                                {formatDate(generation.generatedAt)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Title</p>
                                <p>{generation.snapshot.title}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Price</p>
                                <p>
                                  {formatPriceSuggestion(
                                    generation.snapshot.priceSuggestion
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-muted-foreground">
                                  Changed vs current
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {comparedFields.length === 0 ? (
                                    <Badge variant="secondary">
                                      matches current draft
                                    </Badge>
                                  ) : (
                                    comparedFields.map((field) => (
                                      <Badge key={field.key} variant="outline">
                                        {field.label}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="justify-between gap-3">
                              <span className="text-xs text-muted-foreground">
                                {generation.snapshot.keywords.length} keyword
                                {generation.snapshot.keywords.length === 1
                                  ? ""
                                  : "s"}
                              </span>
                              <form action={restoreAction}>
                                <PendingSubmitButton
                                  type="submit"
                                  variant="outline"
                                  pendingLabel="Restoring"
                                  disabled={
                                    isActiveGeneration &&
                                    comparedFields.length === 0
                                  }
                                >
                                  Restore snapshot
                                </PendingSubmitButton>
                              </form>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Draft summary</CardTitle>
                <CardDescription>{getStepCopy(draft)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <DraftStatusBadge status={draft.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Images</dt>
                    <dd>{draft.imageCount}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Generated</dt>
                    <dd>{draft.generation ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd className="text-right">{formatDate(draft.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <PackageCheckIcon className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {readiness.ready
                          ? "Ready for Vinted handoff."
                          : "Still missing required fields."}
                      </p>
                      <p>
                        {readiness.ready
                          ? "Title, description, price, category, condition, keywords, and images are all present."
                          : `Missing ${readiness.missing
                              .map(formatReadinessItem)
                              .join(", ")}.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["draft", "Draft"],
                      ["ready", "Ready"],
                      ["listed", "Listed"],
                      ["sold", "Sold"],
                    ] as const
                  ).map(([status, label]) => {
                    const statusAction = setDraftStatusAction.bind(
                      null,
                      draft.id,
                      status
                    );
                    const disabled =
                      draft.status === status ||
                      ((status === "ready" || status === "listed") &&
                        !readiness.ready) ||
                      (status === "sold" && draft.status !== "listed");

                    return (
                      <form key={status} action={statusAction}>
                        <PendingSubmitButton
                          type="submit"
                          variant={draft.status === status ? "default" : "outline"}
                          className="w-full"
                          disabled={disabled}
                          pendingLabel={`Saving ${label.toLowerCase()}`}
                        >
                          {label}
                        </PendingSubmitButton>
                      </form>
                    );
                  })}
                </div>

                <details className="rounded-lg border border-border bg-background">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
                    Draft details
                    <ChevronDownIcon className="size-4 text-muted-foreground" />
                  </summary>
                  <div className="space-y-3 border-t border-border px-4 py-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Draft ID</p>
                      <p className="break-all">{draft.id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Created</p>
                      <p>{formatDate(draft.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Latest generation</p>
                      <p>
                        {draft.generation
                          ? `${draft.generation.provider}:${draft.generation.model}`
                          : "Not generated yet"}
                      </p>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
