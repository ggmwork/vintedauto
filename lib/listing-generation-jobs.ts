import { randomUUID } from "node:crypto";

import { getDatabasePath } from "@/lib/data/database-root";
import { mutateJsonFile, readJsonFile } from "@/lib/data/json-store";
import type {
  ListingGenerationJob,
  ListingGenerationJobTarget,
} from "@/types/listing-generation-job";

interface ListingGenerationJobStore {
  jobs: ListingGenerationJob[];
}

interface CreateListingGenerationJobInput extends ListingGenerationJobTarget {
  label: string;
  message?: string;
}

interface CompleteListingGenerationJobInput {
  message: string;
  resultDraftId?: string | null;
  provider?: string | null;
  model?: string | null;
}

interface CreateListingGenerationJobResult {
  job: ListingGenerationJob;
  created: boolean;
}

const MAX_STORED_JOBS = 100;

function getJobsFilePath() {
  return getDatabasePath("listing-generation-jobs.json");
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : fallback;
}

export function normalizeListingGenerationJob(
  value: unknown
): ListingGenerationJob | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ListingGenerationJob>;
  const now = new Date().toISOString();
  const id = normalizeString(candidate.id);
  const targetType =
    candidate.targetType === "stock-item" || candidate.targetType === "draft"
      ? candidate.targetType
      : null;

  if (!id || !targetType) {
    return null;
  }

  const status =
    candidate.status === "done" || candidate.status === "failed"
      ? candidate.status
      : "running";
  const createdAt = normalizeDate(candidate.createdAt, now);
  const updatedAt = normalizeDate(candidate.updatedAt, createdAt);

  return {
    id,
    targetType,
    sessionId: normalizeString(candidate.sessionId),
    stockItemId: normalizeString(candidate.stockItemId),
    draftId: normalizeString(candidate.draftId),
    resultDraftId: normalizeString(candidate.resultDraftId),
    label: normalizeString(candidate.label) ?? "Listing generation",
    status,
    message: normalizeString(candidate.message) ?? "Generating listing.",
    error: normalizeString(candidate.error),
    provider: normalizeString(candidate.provider),
    model: normalizeString(candidate.model),
    createdAt,
    startedAt: normalizeDate(candidate.startedAt, createdAt),
    updatedAt,
    finishedAt: candidate.finishedAt
      ? normalizeDate(candidate.finishedAt, updatedAt)
      : null,
  };
}

function normalizeStore(value: unknown): ListingGenerationJobStore {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<ListingGenerationJobStore>)
      : {};

  return {
    jobs: Array.isArray(candidate.jobs)
      ? candidate.jobs
          .map(normalizeListingGenerationJob)
          .filter((job): job is ListingGenerationJob => Boolean(job))
      : [],
  };
}

async function readStore() {
  return readJsonFile(
    getJobsFilePath(),
    () => ({ jobs: [] }),
    normalizeStore
  );
}

function sortNewestFirst(jobs: ListingGenerationJob[]) {
  return jobs
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}

function pruneJobs(jobs: ListingGenerationJob[]) {
  const activeJobs = jobs.filter((job) => job.status === "running");
  const completedJobs = sortNewestFirst(
    jobs.filter((job) => job.status !== "running")
  ).slice(0, Math.max(MAX_STORED_JOBS - activeJobs.length, 0));

  return sortNewestFirst([...activeJobs, ...completedJobs]);
}

async function mutateStore(
  mutator: (
    store: ListingGenerationJobStore
  ) => ListingGenerationJobStore | Promise<ListingGenerationJobStore>
) {
  return mutateJsonFile(
    getJobsFilePath(),
    () => ({ jobs: [] }),
    normalizeStore,
    async (store) => {
      const nextStore = await mutator(store);

      return {
        jobs: pruneJobs(nextStore.jobs),
      } satisfies ListingGenerationJobStore;
    }
  );
}

function jobMatchesTarget(
  job: ListingGenerationJob,
  target: ListingGenerationJobTarget
) {
  if (job.targetType !== target.targetType) {
    return false;
  }

  if (target.targetType === "stock-item") {
    return (
      job.sessionId === (target.sessionId ?? null) &&
      job.stockItemId === (target.stockItemId ?? null)
    );
  }

  return job.draftId === (target.draftId ?? null);
}

export async function listListingGenerationJobs() {
  const store = await readStore();
  return sortNewestFirst(store.jobs);
}

export async function listVisibleListingGenerationJobs() {
  const jobs = await listListingGenerationJobs();
  return jobs.filter((job, index) => job.status === "running" || index < 25);
}

export async function findActiveListingGenerationJob(
  target: ListingGenerationJobTarget
) {
  const jobs = await listListingGenerationJobs();
  return (
    jobs.find(
      (job) => job.status === "running" && jobMatchesTarget(job, target)
    ) ?? null
  );
}

export async function createListingGenerationJob(
  input: CreateListingGenerationJobInput
): Promise<CreateListingGenerationJobResult> {
  const now = new Date().toISOString();
  const job: ListingGenerationJob = {
    id: randomUUID(),
    targetType: input.targetType,
    sessionId: input.sessionId ?? null,
    stockItemId: input.stockItemId ?? null,
    draftId: input.draftId ?? null,
    resultDraftId: null,
    label: input.label,
    status: "running",
    message: input.message ?? "Generating listing.",
    error: null,
    provider: null,
    model: null,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    finishedAt: null,
  };
  let created = false;
  let selectedJob: ListingGenerationJob = job;

  await mutateStore((store) => {
    const activeJob = store.jobs.find(
      (entry) =>
        entry.status === "running" &&
        jobMatchesTarget(entry, {
          targetType: input.targetType,
          sessionId: input.sessionId,
          stockItemId: input.stockItemId,
          draftId: input.draftId,
        })
    );

    if (activeJob) {
      selectedJob = activeJob;
      return store;
    }

    created = true;
    selectedJob = job;
    return {
      jobs: [job, ...store.jobs],
    };
  });

  return {
    job: selectedJob,
    created,
  };
}

async function updateListingGenerationJob(
  jobId: string,
  updater: (job: ListingGenerationJob, now: string) => ListingGenerationJob
) {
  const now = new Date().toISOString();
  let updatedJob: ListingGenerationJob | null = null;

  await mutateStore((store) => ({
    jobs: store.jobs.map((job) => {
      if (job.id !== jobId) {
        return job;
      }

      updatedJob = updater(job, now);
      return updatedJob;
    }),
  }));
  return updatedJob;
}

export async function completeListingGenerationJob(
  jobId: string,
  input: CompleteListingGenerationJobInput
) {
  return updateListingGenerationJob(jobId, (job, now) => ({
    ...job,
    status: "done",
    message: input.message,
    error: null,
    resultDraftId: input.resultDraftId ?? job.resultDraftId,
    provider: input.provider ?? job.provider,
    model: input.model ?? job.model,
    updatedAt: now,
    finishedAt: now,
  }));
}

export async function failListingGenerationJob(jobId: string, error: string) {
  return updateListingGenerationJob(jobId, (job, now) => ({
    ...job,
    status: "failed",
    message: "Listing generation failed.",
    error,
    updatedAt: now,
    finishedAt: now,
  }));
}
