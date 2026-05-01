"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  FileJsonIcon,
  FileTextIcon,
  TagsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DraftReadiness } from "@/lib/drafts/draft-readiness";
import {
  createVintedHandoffPayload,
  formatVintedHandoffJson,
  formatVintedHandoffText,
} from "@/lib/vinted/handoff";
import type { DraftDetail } from "@/types/draft";
import type { VintedListingPayload } from "@/types/vinted";

interface ExportItem {
  key: string;
  label: string;
  value: string;
}

function formatMetadataSection(payload: VintedListingPayload) {
  const metadataEntries = [
    ["Brand", payload.listing.metadata.brand],
    ["Category", payload.listing.metadata.category],
    ["Size", payload.listing.metadata.size],
    ["Condition", payload.listing.metadata.condition],
    ["Color", payload.listing.metadata.color],
    ["Material", payload.listing.metadata.material],
    ["Notes", payload.listing.metadata.notes],
  ].filter(([, value]) => typeof value === "string" && value.length > 0);

  if (metadataEntries.length === 0) {
    return "No metadata set.";
  }

  return metadataEntries.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function formatPrice(payload: VintedListingPayload) {
  const suggestion = payload.listing.price;

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

function formatFullPackage(payload: VintedListingPayload) {
  return [
    `Title: ${payload.listing.title ?? "Not set"}`,
    "",
    "Description:",
    payload.listing.description ?? "Not set",
    "",
    `Keywords: ${payload.listing.keywords.length > 0 ? payload.listing.keywords.join(", ") : "Not set"}`,
    `Price: ${formatPrice(payload)}`,
    `Images: ${payload.images.length}`,
    "",
    "Metadata:",
    formatMetadataSection(payload),
  ].join("\n");
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function DraftExportPanel({
  draft,
  readiness,
  afterCopyHref,
}: {
  draft: DraftDetail;
  readiness: DraftReadiness;
  afterCopyHref?: string | null;
}) {
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const router = useRouter();
  const handoffPayload = useMemo(() => createVintedHandoffPayload(draft), [draft]);
  const handoffText = useMemo(
    () => formatVintedHandoffText(handoffPayload),
    [handoffPayload]
  );
  const handoffJson = useMemo(
    () => formatVintedHandoffJson(handoffPayload),
    [handoffPayload]
  );

  const advancedItems = useMemo<ExportItem[]>(
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
        value: formatPrice(handoffPayload),
      },
    ],
    [draft, handoffPayload]
  );

  const primaryItems = useMemo<ExportItem[]>(
    () => [
      {
        key: "vinted-handoff",
        label: "Vinted handoff",
        value: handoffText,
      },
      {
        key: "full-package",
        label: "Full package",
        value: formatFullPackage(handoffPayload),
      },
      {
        key: "vinted-json",
        label: "Autofill JSON",
        value: handoffJson,
      },
    ],
    [handoffJson, handoffPayload, handoffText]
  );

  async function handleCopy(item: ExportItem) {
    setCopyError(null);
    setLaunchError(null);

    try {
      await copyText(item.value);
      setLastCopied(item.key);
    } catch {
      setCopyError("Clipboard copy failed in this browser context.");
    }
  }

  async function handleCopyAndAdvance() {
    const handoffItem = primaryItems.find((item) => item.key === "vinted-handoff");

    if (!handoffItem || !afterCopyHref) {
      return;
    }

    try {
      await copyText(handoffItem.value);
      setLastCopied(handoffItem.key);
      router.push(afterCopyHref);
    } catch {
      setCopyError("Clipboard copy failed in this browser context.");
    }
  }

  function handleFillOnVinted() {
    setLaunchError(null);

    const nextWindow = window.open(
      `/api/drafts/${draft.id}/fill-on-vinted`,
      "_blank",
      "noopener,noreferrer"
    );

    if (!nextWindow) {
      setLaunchError("Browser blocked the Vinted launch window.");
    }
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Export for Vinted</CardTitle>
            <CardDescription>
              Copy the full handoff first. Use the advanced copies only when
              you need a single field.
            </CardDescription>
          </div>
          <Badge variant={readiness.ready ? "default" : "outline"}>
            {readiness.ready ? "ready for Vinted" : "still incomplete"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button
            type="button"
            disabled={!readiness.ready}
            onClick={handleFillOnVinted}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Fill on Vinted
          </Button>
          {afterCopyHref ? (
            <Button
              type="button"
              disabled={handoffText.trim().length === 0 || !readiness.ready}
              onClick={handleCopyAndAdvance}
            >
              <ClipboardCopyIcon data-icon="inline-start" />
              Copy and next
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={handoffText.trim().length === 0}
            variant={lastCopied === "vinted-handoff" ? "default" : "outline"}
            onClick={() =>
              handleCopy(primaryItems.find((item) => item.key === "vinted-handoff")!)
            }
          >
            <ClipboardCopyIcon data-icon="inline-start" />
            Copy Vinted handoff
          </Button>
          <Button
            type="button"
            disabled={primaryItems[1].value.trim().length === 0}
            variant={lastCopied === "full-package" ? "default" : "outline"}
            onClick={() => handleCopy(primaryItems[1])}
          >
            <FileTextIcon data-icon="inline-start" />
            Copy full package
          </Button>
          <Button
            type="button"
            disabled={handoffJson.trim().length === 0}
            variant={lastCopied === "vinted-json" ? "default" : "outline"}
            onClick={() =>
              handleCopy(primaryItems.find((item) => item.key === "vinted-json")!)
            }
          >
            <FileJsonIcon data-icon="inline-start" />
            Copy autofill JSON
          </Button>
        </div>

        {copyError ? (
          <p className="text-sm text-destructive">{copyError}</p>
        ) : launchError ? (
          <p className="text-sm text-destructive">{launchError}</p>
        ) : lastCopied ? (
          <p className="text-sm text-muted-foreground">
            Copied{" "}
            {primaryItems
              .concat(advancedItems)
              .find((item) => item.key === lastCopied)
              ?.label.toLowerCase()}
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {readiness.ready
              ? "Listing is ready. Fill on Vinted opens the supported create-listing page for the extension."
              : `Still missing ${readiness.missing.join(", ")}.`}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TagsIcon className="size-4" />
            Vinted handoff preview
          </div>
          <textarea
            readOnly
            value={handoffText}
            className="min-h-72 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none"
          />
        </div>

        <details className="rounded-lg border border-border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
            Advanced field copies
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </summary>
          <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
            {advancedItems.map((item) => (
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
        </details>
      </CardContent>
    </Card>
  );
}
