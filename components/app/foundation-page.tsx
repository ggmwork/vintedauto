import { ArrowRightIcon, Layers3Icon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { appConfig } from "@/lib/app-config";

const completedWork = [
  "Next.js App Router scaffold in repo root",
  "Tailwind CSS v4 and shadcn/ui initialized",
  "Typed draft, generation, and pricing models",
  "Service boundaries for drafts, storage, AI, and pricing",
] as const;

const moduleBoundaries = [
  {
    name: "lib/drafts",
    summary: "Draft repository contract for create, load, update, and persist flows.",
  },
  {
    name: "lib/storage",
    summary: "Image upload and deletion contract, isolated from UI and vendor details.",
  },
  {
    name: "lib/ai",
    summary: "Listing generation contract for image-aware title, copy, and price output.",
  },
  {
    name: "lib/pricing",
    summary: "Dedicated pricing contract so heuristics and future market data stay isolated.",
  },
];

const nextSteps = [
  "Implement draft repository adapter",
  "Build multi-image upload flow",
  "Wire AI generation endpoint",
  "Render editable draft review UI",
] as const;

export function FoundationPage() {
  return (
    <main className="flex-1 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:px-8">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <Badge variant="secondary">Week 1 Foundation</Badge>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-4xl leading-tight font-semibold text-balance">
                {appConfig.name} scaffold ready for the first vertical slice.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Desktop-first foundation for image upload, AI-assisted listing
                generation, and editable pricing review. Structure is in place.
                Next work is adapters and workflow screens.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" disabled>
              Plan documented in /docs
            </Button>
            <Button>
              <SparklesIcon data-icon="inline-start" />
              Foundation complete
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Current target</CardTitle>
              <CardDescription>
                Upload images, analyze with AI, generate text and price, show
                result in UI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                No auth, no extension, no Vinted autofill yet. This scaffold is
                intentionally narrow.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Core app stack and env placeholders are already wired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>Next.js 16 + React 19</li>
                <li>Tailwind CSS v4 + shadcn/ui</li>
                <li>pnpm via Corepack</li>
                <li>`.env.example` for Supabase and OpenAI</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification</CardTitle>
              <CardDescription>
                This page is the first proof that scaffold, routing, styling,
                and typed imports compile together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Next check is local dev server, lint, and typecheck on the new
                structure.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Completed foundation work</CardTitle>
              <CardDescription>
                What is already real in code, not only in docs.
              </CardDescription>
              <CardAction>
                <Badge variant="outline">Step 1-2</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {completedWork.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-border/70 bg-background px-4 py-3"
                  >
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                      <Layers3Icon className="size-3.5" />
                    </div>
                    <p className="text-sm leading-6">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Immediate next build steps</CardTitle>
              <CardDescription>
                The shortest path from scaffold to useful product loop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm leading-6 text-muted-foreground">
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Friday goal: upload, analyze, review
              </span>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </CardFooter>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Module boundaries
              </h2>
              <p className="text-sm text-muted-foreground">
                These contracts are the seam lines for real adapters next.
              </p>
            </div>
            <Badge variant="secondary">Typed contracts</Badge>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            {moduleBoundaries.map((module) => (
              <Card key={module.name} size="sm">
                <CardHeader>
                  <CardTitle>{module.name}</CardTitle>
                  <CardDescription>{module.summary}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
