import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import {
  buildVintedUploadImageFilename,
  VINTED_UPLOAD_IMAGE_CONTENT_TYPE,
  VINTED_UPLOAD_IMAGE_MAX_BYTES,
} from "@/lib/vinted/image-upload";
import { prepareVintedUploadImage } from "@/lib/vinted/image-upload.server";

describe("Vinted upload image preparation", () => {
  it("builds a JPEG upload filename from iPhone HEIC names", () => {
    assert.equal(
      buildVintedUploadImageFilename("IMG_1234.HEIC", "image-1"),
      "IMG_1234-vinted.jpg"
    );
    assert.equal(
      buildVintedUploadImageFilename(null, "image-1"),
      "image-1-vinted.jpg"
    );
  });

  it("converts decodable images to Vinted-ready JPEG", async () => {
    const input = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 4,
        background: "#d9c7aa",
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareVintedUploadImage({
      bytes: new Uint8Array(input),
      contentType: "image/png",
      originalFilename: "front.png",
      imageId: "image-front",
    });
    const metadata = await sharp(prepared.bytes).metadata();

    assert.equal(prepared.filename, "front-vinted.jpg");
    assert.equal(prepared.contentType, VINTED_UPLOAD_IMAGE_CONTENT_TYPE);
    assert.equal(metadata.format, "jpeg");
    assert.equal(prepared.sizeBytes, prepared.bytes.byteLength);
    assert.ok(prepared.sizeBytes <= VINTED_UPLOAD_IMAGE_MAX_BYTES);
  });
});
