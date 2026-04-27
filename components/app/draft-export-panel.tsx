"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopyIcon,
  FileTextIcon,
  PackageCheckIcon,
  TagsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DraftReadiness } from "@/lib/drafts/draft-readiness";
import type { DraftDetail } from "@/types/draft";

interface ExportItem {
  key: string;
  label: string;
  value: string;
}

function formatMetadataSection(draft: DraftDetail) {
  const metadataEntries = [
    ["Brand", draft.metadata.brand],
    ["Category", draft.metadata.category],
    ["Size", draft.metadata.size],
    ["Condition", draft.metadata.condition],
    ["Color", draft.metadata.color],
    ["Material", draft.metadata.material],
    ["Notes", draft.metadata.notes],
  ].filter(([, value]) => typeof value === "string" && value.length > 0);

  if (metadataEntries.length === 0) {
    return "No metadata set.";
  }

  return metadataEntries
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function formatPrice(draft: DraftDetail) {
  const suggestion = draft.priceSuggestion;

  if (!suggestion) {
    return "Price not set.";
  }

  if (suggestion.amount !== null) {
    return `${suggestion.amount.toFixed(2)} ${suggestion.currency}`;
  }

  if (suggestion.minAmount !== null || suggestion.maxAmount !== null) {
    return `${suggestion.minAmount?.toFixed(2) ?? "?"} - ${suggestion.maxAmount?.toFixed(2) ?? "?"} ${suggestion.currency}`;
  }

  return `Price not set (${suggestion.currency}).`;
}

function formatFullPackage(draft: DraftDetail) {
  return [
    `Title: ${draft.title ?? "Not set"}`,
    "",
    "Description:",
    draft.description ?? "Not set",
    "",
    `Keywords: ${draft.keywords.length > 0 ? draft.keywords.join(", ") : "Not set"}`,
    `Price: ${formatPrice(draft)}`,
    "",
    "Metadata:",
    formatMetadataSection(draft),
  ].join("\n");
}

function formatVintedHandoff(draft: DraftDetail) {
  return [
    `Title: ${draft.title ?? "Not set"}`,
    `Category: ${draft.metadata.category ?? "Not set"}`,
    `Brand: ${draft.metadata.brand ?? "Not set"}`,
    `Size: ${draft.metadata.size ?? "Not set"}`,
    `Condition: ${draft.metadata.condition ?? "Not set"}`,
    `Color: ${draft.metadata.color ?? "Not set"}`,
    `Material: ${draft.metadata.material ?? "Not set"}`,
    `Price: ${formatPrice(draft)}`,
    `Keywords: ${draft.keywords.length > 0 ? draft.keywords.join(", ") : "Not set"}`,
    "",
    "Description:",
    draft.description ?? "Not set",
    "",
    "Notes:",
    draft.metadata.notes ?? "No notes set.",
  ].join("\n");
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function DraftExportPanel({
  draft,
  readiness,
}: {
  draft: DraftDetail;
  readiness: DraftReadiness;
}) {
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const exportItems = useMemo<ExportItem[]>(
    () => [
      {
        key: "title",
        label: "Title",
        value: draft.title ?? "",
      },
      {
        key: "description",
        label: "Description",
        value: draft.description ?? "",
      },
      {
        key: "keywords",
        label: "Keywords",
        value: draft.keywords.join(", "),
      },
      {
        key: "price",
        label: "Price",
        value: formatPrice(draft),
      },
      {
        key: "vinted-handoff",
        label: "Vinted handoff",
        value: formatVintedHandoff(draft),
      },
      {
        key: "full-package",
        label: "Full package",
        value: formatFullPackage(draft),
      },
    ],
    [draft]
  );

  async function handleCopy(item: ExportItem) {
    setCopyError(null);

    try {
      await copyText(item.value);
      setLastCopied(item.key);
    } catch {
      setCopyError("Clipboard copy failed in this browser context.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copy / export</CardTitle>
        <CardDescription>
          Copy individual listing parts or the full Vinted-ready package.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {exportItems.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={lastCopied === item.key ? "default" : "outline"}
              disabled={item.value.trim().length === 0}
              onClick={() => handleCopy(item)}
            >
              <ClipboardCopyIcon data-icon="inline-start" />
              Copy {item.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
              <div className="flex items-center gap-2">
                <PackageCheckIcon className="size-4" />
                <span className="font-medium">Vinted readiness</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {readiness.ready
                  ? "Draft has the minimum fields needed for Vinted handoff."
                  : `Still missing ${readiness.missing.join(", ")}.`}
              </p>
              <div className="mt-3">
                <Badge variant={readiness.ready ? "default" : "outline"}>
                  {readiness.ready ? "ready for Vinted" : "incomplete"}
                </Badge>
              </div>
              {copyError ? (
                <p className="mt-2 text-sm text-destructive">{copyError}</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCopyIcon className="size-4" />
                <span className="font-medium">Copy status</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {lastCopied
                  ? `Copied ${exportItems.find((item) => item.key === lastCopied)?.label.toLowerCase()}.`
                  : "Nothing copied yet."}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-background px-4 py-4">
              <div className="flex items-center gap-2">
                <TagsIcon className="size-4" />
                <span className="font-medium">Metadata summary</span>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {formatMetadataSection(draft)}
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4" />
                <span className="font-medium">Vinted handoff preview</span>
              </div>
              <Badge variant="outline">desktop handoff</Badge>
            </div>
            <textarea
              readOnly
              value={formatVintedHandoff(draft)}
              className="min-h-80 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-xs text-muted-foreground">
          Export uses the current saved review and metadata state in Vinted field order.
        </span>
      </CardFooter>
    </Card>
  );
}
