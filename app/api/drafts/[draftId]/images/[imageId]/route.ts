import { NextResponse } from "next/server";

import { draftRepository } from "@/lib/drafts";
import { draftImageStorage } from "@/lib/storage";
import {
  applyVintedExtensionCors,
  createVintedExtensionCorsOptionsResponse,
} from "@/lib/vinted/extension-cors";
import { prepareVintedUploadImage } from "@/lib/vinted/image-upload.server";

export function OPTIONS() {
  return createVintedExtensionCorsOptionsResponse();
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string; imageId: string }>;
  }
) {
  const { draftId, imageId } = await params;
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    return applyVintedExtensionCors(
      new NextResponse("Draft not found.", { status: 404 })
    );
  }

  const image = draft.images.find((entry) => entry.id === imageId);

  if (!image) {
    return applyVintedExtensionCors(
      new NextResponse("Image not found.", { status: 404 })
    );
  }

  const bytes = await draftImageStorage.read(image.storagePath);
  const url = new URL(request.url);

  if (url.searchParams.get("variant") === "vinted") {
    try {
      const preparedImage = await prepareVintedUploadImage({
        bytes,
        contentType: image.contentType,
        originalFilename: image.originalFilename,
        imageId: image.id,
      });
      const bodyBytes = Uint8Array.from(preparedImage.bytes);
      const body = new Blob([bodyBytes], {
        type: preparedImage.contentType,
      });

      return applyVintedExtensionCors(
        new NextResponse(body, {
          headers: {
            "cache-control": "private, max-age=0, must-revalidate",
            "content-disposition": `inline; filename="${preparedImage.filename}"`,
            "content-length": String(preparedImage.sizeBytes),
            "content-type": preparedImage.contentType,
          },
        })
      );
    } catch (error) {
      return applyVintedExtensionCors(
        new NextResponse(
          error instanceof Error
            ? error.message
            : "Could not prepare this image for Vinted.",
          { status: 422 }
        )
      );
    }
  }

  const bodyBytes = Uint8Array.from(bytes);
  const body = new Blob([bodyBytes], {
    type: image.contentType ?? "application/octet-stream",
  });

  return applyVintedExtensionCors(
    new NextResponse(body, {
      headers: {
        "cache-control": "private, max-age=0, must-revalidate",
        "content-length": String(bytes.byteLength),
        "content-type": image.contentType ?? "application/octet-stream",
      },
    })
  );
}
