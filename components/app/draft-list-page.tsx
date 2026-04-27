import Link from "next/link";
import { FolderOpenDotIcon, PlusIcon } from "lucide-react";

import { createDraftAction } from "@/app/actions";
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
import { appConfig } from "@/lib/app-config";
import type { Draft } from "@/types/draft";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DraftListPage({ drafts }: { drafts: Draft[] }) {
  return (
    <main className="flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <Badge variant="secondary">Phase 1: Draft workflow</Badge>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-4xl leading-tight font-semibold text-balance">
                Draft workspace ready for real listing flows.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Create draft records now, then attach images, AI generation, and
                review workflows on top. This is the first persistent product
                loop.
              </p>
            </div>
          </div>

          <form action={createDraftAction}>
            <Button size="lg" type="submit">
              <PlusIcon data-icon="inline-start" />
              Create draft
            </Button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Current status</CardTitle>
              <CardDescription>
                Local filesystem-backed drafts are active for this phase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Data lives in a local `.data/` store so drafts survive refreshes
                and server restarts during development.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What works now</CardTitle>
              <CardDescription>
                Draft creation, persistence, route navigation, and reopen flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>Create draft</li>
                <li>Persist to local store</li>
                <li>Open detail route</li>
                <li>Reload saved drafts</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next build step</CardTitle>
              <CardDescription>
                Add multi-image upload to each draft before AI generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Draft IDs, metadata fields, and route structure are now stable
                enough to attach upload and storage flows.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-2xl font-semibold">Drafts</h2>
              <p className="text-sm text-muted-foreground">
                {drafts.length === 0
                  ? "No drafts yet. Create the first one to start the workflow."
                  : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} available.`}
              </p>
            </div>
          </div>

          <Separator />

          {drafts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No drafts yet</CardTitle>
                <CardDescription>
                  Create the first draft, then Phase 2 will attach image upload
                  and review state to it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                  <FolderOpenDotIcon className="size-4" />
                  Draft list is empty.
                </div>
              </CardContent>
              <CardFooter>
                <form action={createDraftAction}>
                  <Button type="submit">
                    <PlusIcon data-icon="inline-start" />
                    Create first draft
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {drafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="truncate">
                        {draft.title ?? "Untitled draft"}
                      </CardTitle>
                      <DraftStatusBadge status={draft.status} />
                    </div>
                    <CardDescription>
                      {draft.description
                        ? draft.description
                        : "No listing text yet. Images and AI generation come next."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <dt className="text-muted-foreground">Images</dt>
                        <dd>{draft.imageCount}</dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-muted-foreground">Keywords</dt>
                        <dd>{draft.keywords.length}</dd>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <dt className="text-muted-foreground">Updated</dt>
                        <dd>{formatDate(draft.updatedAt)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <span className="truncate text-xs text-muted-foreground">
                      {draft.id}
                    </span>
                    <Link
                      href={`/drafts/${draft.id}`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Open draft
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-xs text-muted-foreground">
          {appConfig.name} Phase 1 foundation. Draft repository is local for
          now and will be swappable later.
        </footer>
      </div>
    </main>
  );
}
