"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownAZIcon,
  FolderOpenDotIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";

import { createDraftAction } from "@/app/actions";
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
import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import type { Draft } from "@/types/draft";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSearchHaystack(draft: Draft) {
  return [
    draft.title,
    draft.description,
    draft.id,
    draft.metadata.brand,
    draft.metadata.category,
    draft.metadata.size,
    draft.metadata.condition,
    draft.metadata.color,
    draft.metadata.material,
    draft.metadata.notes,
    ...draft.keywords,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function sortDrafts(drafts: Draft[], sortBy: string) {
  const sorted = drafts.slice();

  switch (sortBy) {
    case "updated-asc":
      return sorted.sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      );
    case "created-desc":
      return sorted.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    case "created-asc":
      return sorted.sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
    case "title-asc":
      return sorted.sort((left, right) =>
        (left.title ?? "Untitled draft").localeCompare(
          right.title ?? "Untitled draft"
        )
      );
    case "generation-desc":
      return sorted.sort(
        (left, right) =>
          right.generationHistory.length - left.generationHistory.length
      );
    default:
      return sorted.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
  }
}

function getNextActionLabel(draft: Draft) {
  const readiness = getDraftReadiness(draft);

  if (draft.imageCount === 0) {
    return "Upload images";
  }

  if (draft.generationHistory.length === 0) {
    return "Generate listing";
  }

  if (!readiness.ready) {
    return "Review fields";
  }

  return "Ready to export";
}

export function DraftListPage({ drafts }: { drafts: Draft[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "ready" | "listed" | "sold"
  >("all");
  const [sortBy, setSortBy] = useState<
    | "updated-desc"
    | "updated-asc"
    | "created-desc"
    | "created-asc"
    | "title-asc"
    | "generation-desc"
  >("updated-desc");

  const filteredDrafts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visibleDrafts = drafts.filter((draft) => {
      if (statusFilter !== "all" && draft.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return buildSearchHaystack(draft).includes(normalizedSearch);
    });

    return sortDrafts(visibleDrafts, sortBy);
  }, [drafts, searchTerm, sortBy, statusFilter]);

  const stats = useMemo(() => {
    return drafts.reduce(
      (accumulator, draft) => {
        accumulator.total += 1;
        accumulator.byStatus[draft.status] += 1;

        if (getDraftReadiness(draft).ready) {
          accumulator.readyForHandoff += 1;
        }

        if (draft.generationHistory.length > 0) {
          accumulator.generated += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        generated: 0,
        readyForHandoff: 0,
        byStatus: {
          draft: 0,
          ready: 0,
          listed: 0,
          sold: 0,
        },
      }
    );
  }, [drafts]);

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Desktop draft workspace</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Upload, generate, review, export.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep the draft list quiet and task-focused. Create a draft, open
              it, add images, and move the listing forward without dashboard
              filler.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Intake home
            </Link>
            <Link href="/stock" className={buttonVariants({ variant: "outline" })}>
              Stock workspace
            </Link>
            <Link href="/review" className={buttonVariants({ variant: "outline" })}>
              Review queue
            </Link>
            <form action={createDraftAction}>
              <PendingSubmitButton
                size="lg"
                type="submit"
                pendingLabel="Creating draft"
              >
                <PlusIcon data-icon="inline-start" />
                Create draft
              </PendingSubmitButton>
            </form>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <Badge variant="outline">{stats.total} drafts</Badge>
          <Badge variant="outline">{stats.generated} generated</Badge>
          <Badge variant="outline">{stats.readyForHandoff} ready</Badge>
          <Badge variant="outline">{stats.byStatus.listed} listed</Badge>
          <Badge variant="outline">{stats.byStatus.sold} sold</Badge>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-2xl font-semibold">Drafts</h2>
            <p className="text-sm text-muted-foreground">
              {filteredDrafts.length === drafts.length
                ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} available.`
                : `${filteredDrafts.length} of ${drafts.length} drafts shown.`}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Browse drafts</CardTitle>
              <CardDescription>
                Search, filter, and open the next draft that needs work.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Search</span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Title, brand, category, keywords, draft id"
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className={inputClassName}
                >
                  <option value="all">all statuses</option>
                  <option value="draft">draft</option>
                  <option value="ready">ready</option>
                  <option value="listed">listed</option>
                  <option value="sold">sold</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Sort</span>
                <div className="relative">
                  <ArrowDownAZIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as typeof sortBy)
                    }
                    className={`${inputClassName} pl-9`}
                  >
                    <option value="updated-desc">recently updated</option>
                    <option value="updated-asc">least recently updated</option>
                    <option value="created-desc">newest first</option>
                    <option value="created-asc">oldest first</option>
                    <option value="title-asc">title A-Z</option>
                    <option value="generation-desc">most generations</option>
                  </select>
                </div>
              </label>
            </CardContent>
          </Card>

          {drafts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No drafts yet</CardTitle>
                <CardDescription>
                  Create the first draft, then add images before moving into AI
                  generation.
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
                  <PendingSubmitButton type="submit" pendingLabel="Creating draft">
                    <PlusIcon data-icon="inline-start" />
                    Create first draft
                  </PendingSubmitButton>
                </form>
              </CardFooter>
            </Card>
          ) : filteredDrafts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <SearchIcon className="size-4" />
                  No drafts match the current search and filter settings.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDrafts.map((draft) => {
                const readiness = getDraftReadiness(draft);
                const nextActionLabel = getNextActionLabel(draft);

                return (
                  <Card key={draft.id}>
                    <CardHeader className="gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="truncate">
                          {draft.title ?? "Untitled draft"}
                        </CardTitle>
                        <DraftStatusBadge status={draft.status} />
                      </div>
                      <CardDescription>{nextActionLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {draft.metadata.brand ? (
                          <Badge variant="outline">{draft.metadata.brand}</Badge>
                        ) : null}
                        {draft.metadata.category ? (
                          <Badge variant="outline">{draft.metadata.category}</Badge>
                        ) : null}
                        <Badge variant={readiness.ready ? "secondary" : "outline"}>
                          {readiness.ready ? "ready" : "incomplete"}
                        </Badge>
                        {draft.generationHistory.length > 0 ? (
                          <Badge variant="outline">
                            <SparklesIcon data-icon="inline-start" />
                            {draft.generationHistory.length} generation
                            {draft.generationHistory.length === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">Images</dt>
                          <dd>{draft.imageCount}</dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">Keywords</dt>
                          <dd>{draft.keywords.length}</dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">Updated</dt>
                          <dd>{formatDate(draft.updatedAt)}</dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">Next</dt>
                          <dd>{nextActionLabel}</dd>
                        </div>
                      </dl>

                      <Link
                        href={`/drafts/${draft.id}`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Open draft
                      </Link>
                    </CardContent>
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
