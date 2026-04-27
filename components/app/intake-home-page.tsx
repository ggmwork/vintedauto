import type { InputHTMLAttributes } from "react";
import Link from "next/link";
import { FolderInputIcon, FolderOpenDotIcon, ImagesIcon } from "lucide-react";

import { importStudioSessionAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/app/pending-submit-button";
import { SessionStatusBadge } from "@/components/app/session-status-badge";
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
import type { StudioSession } from "@/types/intake";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type DirectoryInputProps = InputHTMLAttributes<HTMLInputElement> & {
  directory?: string;
  webkitdirectory?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function IntakeHomePage({
  sessions,
  feedback,
}: {
  sessions: StudioSession[];
  feedback: {
    flash: string | null;
    error: string | null;
  };
}) {
  const totalPhotoCount = sessions.reduce(
    (accumulator, session) => accumulator + session.photoCount,
    0
  );
  const totalStockItemCount = sessions.reduce(
    (accumulator, session) => accumulator + session.stockItemCount,
    0
  );

  return (
    <main className="flex-1 bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary">Phase 1 intake</Badge>
            <h1 className="font-heading text-3xl font-semibold text-balance">
              Import one folder. Start one session.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              The app starts from intake now. Choose a local folder, import the
              whole photo batch, and land in a session that is ready for stock
              organization.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/stock" className={buttonVariants({ variant: "outline" })}>
              Open stock workspace
            </Link>
            <Link href="/review" className={buttonVariants({ variant: "outline" })}>
              Open review queue
            </Link>
            <Link href="/drafts" className={buttonVariants({ variant: "outline" })}>
              Open draft workspace
            </Link>
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

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Start intake session</CardTitle>
              <CardDescription>
                Choose a local folder. Click once. The app imports the full
                photo batch into a new studio session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={importStudioSessionAction} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Session name
                    </span>
                    <input
                      type="text"
                      name="sessionName"
                      placeholder="Studio session"
                      className={inputClassName}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Folder label
                    </span>
                    <input
                      type="text"
                      name="folderLabel"
                      placeholder="Studio batch April 27"
                      className={inputClassName}
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    Choose folder
                  </span>
                  <input
                    {...({
                      type: "file",
                      name: "photos",
                      accept: "image/*",
                      multiple: true,
                      directory: "",
                      webkitdirectory: "",
                      className:
                        "block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80",
                    } as DirectoryInputProps)}
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Chromium browsers support folder selection here. If not, the
                    same control still works as a large multi-file import.
                  </p>
                  <PendingSubmitButton
                    type="submit"
                    pendingLabel="Importing session"
                  >
                    <FolderInputIcon data-icon="inline-start" />
                    Start import
                  </PendingSubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current intake model</CardTitle>
              <CardDescription>
                Keep this phase narrow so the stock layer can plug in cleanly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Source</p>
                <p className="mt-1 text-muted-foreground">Local folder import</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Start mode</p>
                <p className="mt-1 text-muted-foreground">
                  Explicit manual start from the app
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
                <p className="font-medium text-foreground">Data spine</p>
                <p className="mt-1 text-muted-foreground">
                  session -&gt; photo asset -&gt; stock item -&gt; draft
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-wrap gap-2">
          <Badge variant="outline">{sessions.length} sessions</Badge>
          <Badge variant="outline">{totalPhotoCount} imported photos</Badge>
          <Badge variant="outline">
            {sessions.filter((session) => session.status === "needs_stocking").length} needs stock
          </Badge>
          <Badge variant="outline">{totalStockItemCount} stock items</Badge>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-2xl font-semibold">Studio sessions</h2>
            <p className="text-sm text-muted-foreground">
              Imported batches live here first. Stock organization comes next.
            </p>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No sessions yet</CardTitle>
                <CardDescription>
                  Import the first folder to create the intake pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                  <FolderOpenDotIcon className="size-4" />
                  No imported studio sessions yet.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader className="gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="truncate">{session.name}</CardTitle>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <CardDescription>
                      {session.intakeConfig.folderLabel
                        ? `Imported from ${session.intakeConfig.folderLabel}.`
                        : "Imported from local folder selection."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <ImagesIcon data-icon="inline-start" />
                        {session.photoCount} photos
                      </Badge>
                      <Badge variant="outline">
                        {session.unassignedPhotoCount} unassigned
                      </Badge>
                      <Badge variant="outline">{session.stockItemCount} stock</Badge>
                      <Badge variant="outline">
                        {session.draftedStockItemCount} drafted
                      </Badge>
                    </div>
                    <dl className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Created</dt>
                        <dd>{formatDate(session.createdAt)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Updated</dt>
                        <dd>{formatDate(session.updatedAt)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Link
                      href={`/sessions/${session.id}`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Open session
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
