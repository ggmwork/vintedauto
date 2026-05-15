import sharp from "sharp";

import {
  buildVintedUploadImageFilename,
  VINTED_UPLOAD_IMAGE_CONTENT_TYPE,
  VINTED_UPLOAD_IMAGE_MAX_BYTES,
} from "@/lib/vinted/image-upload";

const VINTED_UPLOAD_IMAGE_DIMENSIONS = [2400, 2000, 1600, 1200];
const VINTED_UPLOAD_IMAGE_QUALITIES = [84, 78, 72, 66, 60, 54, 48, 42];

export interface PreparedVintedUploadImage {
  bytes: Uint8Array;
  contentType: typeof VINTED_UPLOAD_IMAGE_CONTENT_TYPE;
  filename: string;
  sizeBytes: number;
}

export async function prepareVintedUploadImage(input: {
  bytes: Uint8Array;
  contentType: string | null;
  originalFilename: string | null;
  imageId: string;
}): Promise<PreparedVintedUploadImage> {
  const filename = buildVintedUploadImageFilename(
    input.originalFilename,
    input.imageId
  );
  let lastSize = input.bytes.byteLength;

  try {
    for (const dimension of VINTED_UPLOAD_IMAGE_DIMENSIONS) {
      for (const quality of VINTED_UPLOAD_IMAGE_QUALITIES) {
        const output = await sharp(Buffer.from(input.bytes), {
          failOn: "none",
        })
          .rotate()
          .resize({
            width: dimension,
            height: dimension,
            fit: "inside",
            withoutEnlargement: true,
          })
          .flatten({ background: "#ffffff" })
          .jpeg({
            quality,
            mozjpeg: true,
          })
          .toBuffer();

        lastSize = output.byteLength;

        if (output.byteLength <= VINTED_UPLOAD_IMAGE_MAX_BYTES) {
          return {
            bytes: new Uint8Array(output),
            contentType: VINTED_UPLOAD_IMAGE_CONTENT_TYPE,
            filename,
            sizeBytes: output.byteLength,
          };
        }
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown decoder error.";

    throw new Error(
      `Could not prepare ${input.originalFilename || input.imageId} for Vinted. ` +
        `The image may use a format this app cannot decode yet (${input.contentType || "unknown"}). ` +
        `Convert HEIC/iPhone photos to JPEG first, then try again. Decoder: ${reason}`
    );
  }

  throw new Error(
    `Could not compress ${input.originalFilename || input.imageId} below ${VINTED_UPLOAD_IMAGE_MAX_BYTES} bytes for Vinted. Last attempt was ${lastSize} bytes.`
  );
}
