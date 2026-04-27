import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, FolderInputIcon, ImagesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionStatusBadge } from "@/components/app/session-status-badge";
import type { StudioSessionDetail } from "@/types/intake";

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

export function StudioSessionDetailPage({
  session,
  feedback,
}: {
  session: StudioSessionDetail;
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to intake
            </Link>
            <Link href="/drafts" className={buttonVariants({ variant: "outline" })}>
              Open drafts
            </Link>
            <SessionStatusBadge status={session.status} />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold text-balance">
              {session.name}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This session is the intake boundary. Photos are imported and kept
              as photo assets here first so stock organization can be added
              cleanly next.
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

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Import summary</CardTitle>
              <CardDescription>Current intake session state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Photos</span>
                <span>{session.photoCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Unassigned</span>
                <span>{session.unassignedPhotoCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(session.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(session.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Folder config</CardTitle>
              <CardDescription>Phase 1 uses explicit folder import.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Source type</p>
                <p className="mt-1 text-muted-foreground">local folder</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Folder label</p>
                <p className="mt-1 text-muted-foreground">
                  {session.intakeConfig.folderLabel ?? "Not set"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Start mode</p>
                <p className="mt-1 text-muted-foreground">
                  manual import trigger
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next phase hook</CardTitle>
              <CardDescription>
                This slice stops at photo assets on purpose.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-4 text-muted-foreground">
                Next implementation layer:
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">stock workspace</Badge>
                  <Badge variant="outline">grouping</Badge>
                  <Badge variant="outline">batch generation</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <Badge variant="secondary">Imported photo assets</Badge>
            <h2 className="font-heading text-2xl font-semibold">
              Photo assets
            </h2>
            <p className="text-sm text-muted-foreground">
              All imported files are kept here first. Grouping into stock items
              comes next.
            </p>
          </div>

          {session.photoAssets.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                  <FolderInputIcon className="size-4" />
                  No photo assets were stored for this session.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {session.photoAssets.map((photoAsset) => (
                <Card key={photoAsset.id} className="overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <Image
                      src={`/api/sessions/${session.id}/photos/${photoAsset.id}`}
                      alt={photoAsset.originalFilename}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-1">
                      <p className="truncate font-medium">
                        {photoAsset.originalFilename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {photoAsset.relativePath ?? "Relative folder path not available"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <ImagesIcon data-icon="inline-start" />
                        position {photoAsset.sortOrder + 1}
                      </Badge>
                      <Badge variant="outline">{photoAsset.organizationStatus}</Badge>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Size</dt>
                        <dd>{formatFileSize(photoAsset.sizeBytes)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Dimensions</dt>
                        <dd>
                          {formatDimensions(photoAsset.width, photoAsset.height)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
