import type { Draft } from "@/types/draft";

export type ReviewQueueState =
  | "needs-review"
  | "ready"
  | "listed"
  | "all-generated";

export const reviewQueueStateOptions: Array<{
  state: ReviewQueueState;
  label: string;
}> = [
  { state: "needs-review", label: "Needs review" },
  { state: "ready", label: "Ready" },
  { state: "listed", label: "Listed" },
  { state: "all-generated", label: "All generated" },
];

export function parseReviewQueueState(
  value: string | null | undefined
): ReviewQueueState {
  return reviewQueueStateOptions.some((option) => option.state === value)
    ? (value as ReviewQueueState)
    : "needs-review";
}

export function getReviewQueueDrafts(
  drafts: Draft[],
  state: ReviewQueueState
): Draft[] {
  return drafts
    .filter((draft) => {
      switch (state) {
        case "needs-review":
          return draft.generationHistory.length > 0 && draft.status === "draft";
        case "ready":
          return draft.status === "ready";
        case "listed":
          return draft.status === "listed";
        case "all-generated":
          return draft.generationHistory.length > 0;
      }
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
}

export function getReviewQueueCounts(drafts: Draft[]) {
  return {
    "needs-review": getReviewQueueDrafts(drafts, "needs-review").length,
    ready: getReviewQueueDrafts(drafts, "ready").length,
    listed: getReviewQueueDrafts(drafts, "listed").length,
    "all-generated": getReviewQueueDrafts(drafts, "all-generated").length,
  } satisfies Record<ReviewQueueState, number>;
}

export function buildReviewQueueUrl({
  state,
  draftId,
  flash,
  error,
  focus,
}: {
  state: ReviewQueueState;
  draftId?: string | null;
  flash?: string | null;
  error?: string | null;
  focus?: string | null;
}) {
  const nextUrl = new URL("/review", "http://localhost");

  nextUrl.searchParams.set("state", state);

  if (draftId) {
    nextUrl.searchParams.set("draftId", draftId);
  }

  if (flash) {
    nextUrl.searchParams.set("flash", flash);
  }

  if (error) {
    nextUrl.searchParams.set("error", error);
  }

  if (focus) {
    nextUrl.searchParams.set("focus", focus);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}
