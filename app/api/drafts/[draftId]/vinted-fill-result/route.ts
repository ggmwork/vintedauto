import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import type { DraftVintedHandoffState } from "@/types/draft";
import type { VintedFillResultPayload } from "@/types/vinted";

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function parseFillResultPayload(value: unknown): VintedFillResultPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<VintedFillResultPayload>;

  if (
    candidate.status !== "success" &&
    candidate.status !== "partial_success" &&
    candidate.status !== "failure"
  ) {
    return null;
  }

  return {
    status: candidate.status,
    filledFields: normalizeStringArray(candidate.filledFields),
    skippedFields: normalizeStringArray(candidate.skippedFields),
    failedFields: normalizeStringArray(candidate.failedFields),
    message: typeof candidate.message === "string" ? candidate.message : "",
  };
}

function mapFillResultToDraftStatus(
  result: VintedFillResultPayload
): DraftVintedHandoffState["status"] {
  switch (result.status) {
    case "success":
      return "filled_on_vinted";
    case "partial_success":
      return "needs_manual_fix";
    case "failure":
      return "fill_failed";
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string }>;
  }
) {
  const { draftId } = await params;
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    return NextResponse.json(
      {
        error: "Draft not found.",
      },
      {
        status: 404,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON.",
      },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }

  const result = parseFillResultPayload(requestBody);

  if (!result) {
    return NextResponse.json(
      {
        error: "Invalid Vinted fill result payload.",
      },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }

  const recordedAt = new Date().toISOString();
  const updatedDraft = await draftRepository.update(draftId, {
    vintedHandoff: {
      status: mapFillResultToDraftStatus(result),
      lastRequestedAt: draft.vintedHandoff.lastRequestedAt ?? recordedAt,
      lastUpdatedAt: recordedAt,
      lastResult: result,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      draftId: updatedDraft.id,
      vintedHandoff: updatedDraft.vintedHandoff,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
