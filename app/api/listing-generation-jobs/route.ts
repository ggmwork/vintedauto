import { NextResponse } from "next/server";

import { listVisibleListingGenerationJobs } from "@/lib/listing-generation-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await listVisibleListingGenerationJobs();

  return NextResponse.json({ jobs });
}
