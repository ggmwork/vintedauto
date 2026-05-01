import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import { createVintedHandoffPayload } from "@/lib/vinted/handoff";

export async function GET(
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

  const origin = new URL(request.url).origin;
  const payload = createVintedHandoffPayload(draft, {
    origin,
  });

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
