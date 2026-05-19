import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import {
  applyVintedExtensionCors,
  createVintedExtensionCorsOptionsResponse,
} from "@/lib/vinted/extension-cors";
import { hydrateDraftVintedProfileState } from "@/lib/vinted/listing-profile";
import type { DraftVintedHandoffState } from "@/types/draft";
import type {
  VintedCategorySnapshotPayload,
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

function normalizeCategorySnapshot(
  value: unknown
): VintedCategorySnapshotPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<VintedCategorySnapshotPayload>;
  const path = normalizeStringArray(candidate.path).map((entry) => entry.trim()).filter(Boolean);
  const leaf =
    typeof candidate.leaf === "string" && candidate.leaf.trim().length > 0
      ? candidate.leaf.trim()
      : null;
  const rawText =
    typeof candidate.rawText === "string" && candidate.rawText.trim().length > 0
      ? candidate.rawText.trim()
      : null;

  if (
    (candidate.source !== "user_manual" && candidate.source !== "extension_auto") ||
    candidate.market !== "vinted.pt" ||
    typeof candidate.capturedAt !== "string" ||
    candidate.capturedAt.trim().length === 0 ||
    (path.length === 0 && !leaf)
  ) {
    return null;
  }

  return {
    source: candidate.source,
    market: candidate.market,
    capturedAt: candidate.capturedAt.trim(),
    path,
    leaf,
    rawText,
  };
}

function parseFillResultPayload(value: unknown): VintedFillResultPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<VintedFillResultPayload>;
  const categorySnapshot = normalizeCategorySnapshot(candidate.categorySnapshot);

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
    categorySnapshot,
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

function buildCategoryPlanFromSnapshot(snapshot: VintedCategorySnapshotPayload) {
  const path =
    snapshot.path.length > 0
      ? snapshot.path
      : snapshot.leaf
        ? [snapshot.leaf]
        : [];

  return {
    searchQuery: snapshot.leaf ?? path[path.length - 1] ?? null,
    path,
    source: snapshot.source,
    capturedAt: snapshot.capturedAt,
    rawText: snapshot.rawText,
  };
}

export function OPTIONS() {
  return createVintedExtensionCorsOptionsResponse();
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
    return applyVintedExtensionCors(
      NextResponse.json(
        {
          error: "Draft not found.",
        },
        {
          status: 404,
          headers: {
            "cache-control": "no-store",
          },
        }
      )
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return applyVintedExtensionCors(
      NextResponse.json(
        {
          error: "Request body must be valid JSON.",
        },
        {
          status: 400,
          headers: {
            "cache-control": "no-store",
          },
        }
      )
    );
  }

  const result = parseFillResultPayload(requestBody);

  if (!result) {
    return applyVintedExtensionCors(
      NextResponse.json(
        {
          error: "Invalid Vinted fill result payload.",
        },
        {
          status: 400,
          headers: {
            "cache-control": "no-store",
          },
        }
      )
    );
  }

  const recordedAt = new Date().toISOString();
  const vintedProfile = result.categorySnapshot
    ? hydrateDraftVintedProfileState({
        category: draft.metadata.category,
        state: {
          ...draft.vintedProfile,
          categoryPlan: buildCategoryPlanFromSnapshot(result.categorySnapshot),
        },
      })
    : undefined;
  const updatedDraft = await draftRepository.update(draftId, {
    vintedProfile,
    vintedHandoff: {
      status: mapFillResultToDraftStatus(result),
      lastRequestedAt: draft.vintedHandoff.lastRequestedAt ?? recordedAt,
      lastUpdatedAt: recordedAt,
      lastResult: result,
    },
  });

  return applyVintedExtensionCors(
    NextResponse.json(
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
    )
  );
}
