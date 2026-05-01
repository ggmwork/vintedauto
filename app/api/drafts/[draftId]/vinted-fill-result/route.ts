import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import type { DraftVintedHandoffState } from "@/types/draft";
import type {
  VintedFieldDiagnosticPayload,
  VintedFillResultPayload,
} from "@/types/vinted";

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeFieldDiagnostics(
  value: unknown
): Record<string, VintedFieldDiagnosticPayload> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry && typeof entry === "object")
      .map(([key, entry]) => {
        const candidate = entry as Partial<VintedFieldDiagnosticPayload>;

        return [
          key,
          {
            detail:
              typeof candidate.detail === "string"
                ? candidate.detail
                : "No diagnostic detail saved.",
            matchedBy:
              typeof candidate.matchedBy === "string" ? candidate.matchedBy : null,
          },
        ];
      })
  );
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
    debug:
      candidate.debug && typeof candidate.debug === "object"
        ? {
            pageReason:
              typeof candidate.debug.pageReason === "string"
                ? candidate.debug.pageReason
                : null,
            debugLog: normalizeStringArray(candidate.debug.debugLog),
            fieldDiagnostics: normalizeFieldDiagnostics(
              candidate.debug.fieldDiagnostics
            ),
          }
        : null,
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
