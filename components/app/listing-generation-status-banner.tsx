"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, LoaderCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ListingGenerationJob } from "@/types/listing-generation-job";

interface JobsResponse {
  jobs?: ListingGenerationJob[];
}

function formatJobCount(count: number) {
  return `${count} listing${count === 1 ? "" : "s"}`;
}

export function ListingGenerationStatusBanner() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ListingGenerationJob[]>([]);
  const hadRunningJobsRef = useRef(false);
  const runningJobs = useMemo(
    () => jobs.filter((job) => job.status === "running"),
    [jobs]
  );
  const failedJobs = useMemo(
    () => jobs.filter((job) => job.status === "failed").slice(0, 3),
    [jobs]
  );

  useEffect(() => {
    let cancelled = false;

    async function pollJobs() {
      try {
        const response = await fetch("/api/listing-generation-jobs", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as JobsResponse;
        const nextJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        const nextRunningCount = nextJobs.filter(
          (job) => job.status === "running"
        ).length;

        if (!cancelled) {
          setJobs(nextJobs);

          if (hadRunningJobsRef.current && nextRunningCount === 0) {
            router.refresh();
          }

          hadRunningJobsRef.current = nextRunningCount > 0;
        }
      } catch {
        // Polling is best-effort; generation itself is tracked server-side.
      }
    }

    void pollJobs();
    const intervalId = window.setInterval(pollJobs, 2_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [router]);

  if (runningJobs.length === 0 && failedJobs.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-3 text-sm lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          {runningJobs.length > 0 ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
              <span className="font-medium text-foreground">
                Generating {formatJobCount(runningJobs.length)}
              </span>
              {runningJobs.slice(0, 3).map((job) => (
                <Badge key={job.id} variant="outline">
                  {job.label}
                </Badge>
              ))}
            </>
          ) : null}

          {failedJobs.length > 0 ? (
            <>
              <AlertTriangleIcon className="size-4 text-destructive" />
              <span className="font-medium text-destructive">
                {formatJobCount(failedJobs.length)} failed
              </span>
            </>
          ) : null}
        </div>

        <Link href="/review" className={buttonVariants({ variant: "outline", size: "sm" })}>
          View inventory
        </Link>
      </div>
    </div>
  );
}
