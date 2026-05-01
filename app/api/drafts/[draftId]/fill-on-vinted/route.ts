import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import { appConfig } from "@/lib/app-config";
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
    return new NextResponse("Draft not found.", { status: 404 });
  }

  const appOrigin = new URL(request.url).origin;
  const handoff = createVintedHandoffPayload(draft, {
    origin: appOrigin,
  });

  if (!handoff.handoff.ready) {
    return new NextResponse(
      `Draft is not ready for Vinted handoff. Missing: ${handoff.handoff.missingFields.join(", ")}.`,
      { status: 409 }
    );
  }

  const requestedAt = new Date().toISOString();

  await draftRepository.update(draft.id, {
    vintedHandoff: {
      status: "handed_off",
      lastRequestedAt: requestedAt,
      lastUpdatedAt: requestedAt,
      lastResult: null,
    },
  });

  const nextUrl = new URL(appConfig.vinted.createListingUrl);
  nextUrl.searchParams.set("vinted_auto_fill", "1");
  nextUrl.searchParams.set("vinted_auto_draft_id", draft.id);
  nextUrl.searchParams.set("vinted_auto_app_origin", appOrigin);

  const response = NextResponse.redirect(nextUrl);
  response.headers.set("cache-control", "no-store");

  return response;
}
