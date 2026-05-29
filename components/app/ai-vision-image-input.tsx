"use client";

import { useEffect, useState } from "react";

interface PreviewImage {
  name: string;
  sizeBytes: number;
  url: string;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export function AiVisionImageInput({
  inputClassName,
}: {
  inputClassName: string;
}) {
  const [previews, setPreviews] = useState<PreviewImage[]>([]);

  useEffect(
    () => () => {
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    },
    [previews]
  );

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-foreground">Product images</span>
        <input
          type="file"
          name="visionTestImages"
          accept="image/*,.heic,.heif"
          multiple
          required
          className={inputClassName}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            setPreviews(
              files.map((file) => ({
                name: file.name || "unnamed image",
                sizeBytes: file.size,
                url: URL.createObjectURL(file),
              }))
            );
          }}
        />
      </label>

      {previews.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map((preview) => (
            <figure
              key={preview.url}
              className="overflow-hidden rounded-lg border border-border bg-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob previews cannot use Next image optimization. */}
              <img
                src={preview.url}
                alt={preview.name}
                className="aspect-[4/5] w-full object-cover"
              />
              <figcaption className="grid gap-1 px-3 py-2 text-xs">
                <span className="truncate font-medium text-foreground">
                  {preview.name}
                </span>
                <span className="text-muted-foreground">
                  {formatFileSize(preview.sizeBytes)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
