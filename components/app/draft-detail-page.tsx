import Link from "next/link";
import { ArrowLeftIcon, ImageIcon, SparklesIcon } from "lucide-react";

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

export function DraftDetailPage({ draft }: { draft: DraftDetail }) {
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
                Local draft created and reopenable. Next phases attach images,
                AI generation, and editable listing review.
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
                Stable record that later image and generation flows attach to.
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
              <CardDescription>
                Phase 2 will attach multi-image upload here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                <ImageIcon className="size-4" />
                {draft.imageCount === 0
                  ? "No images attached yet."
                  : `${draft.imageCount} image${draft.imageCount === 1 ? "" : "s"} attached.`}
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
                    Attach multi-image upload and preview directly to this draft.
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
                Empty for now, but the route is ready for image cards next.
              </p>
            </div>
            <Badge variant="outline">{draft.imageCount} images</Badge>
          </div>

          <Separator />

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                <ImageIcon className="size-4" />
                No image assets stored yet for this draft.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
