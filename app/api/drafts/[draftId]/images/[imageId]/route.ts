import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import { draftImageStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string; imageId: string }>;
  }
) {
  const { draftId, imageId } = await params;
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    return new NextResponse("Draft not found.", { status: 404 });
  }

  const image = draft.images.find((entry) => entry.id === imageId);

  if (!image) {
    return new NextResponse("Image not found.", { status: 404 });
  }

  const bytes = await draftImageStorage.read(image.storagePath);
  const bodyBytes = Uint8Array.from(bytes);
  const body = new Blob([bodyBytes], {
    type: image.contentType ?? "application/octet-stream",
  });

  return new NextResponse(body, {
    headers: {
      "cache-control": "private, max-age=0, must-revalidate",
      "content-length": String(bytes.byteLength),
      "content-type": image.contentType ?? "application/octet-stream",
    },
  });
}
