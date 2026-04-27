"use client";

import { useState } from "react";
import { CheckIcon, ClipboardCopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CopyTextButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={copied ? "default" : "outline"} onClick={handleCopy}>
      {copied ? <CheckIcon data-icon="inline-start" /> : <ClipboardCopyIcon data-icon="inline-start" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
