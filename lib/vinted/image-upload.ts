export const VINTED_UPLOAD_IMAGE_CONTENT_TYPE = "image/jpeg";
export const VINTED_UPLOAD_IMAGE_MAX_BYTES = 8_800_000;

function getFilenameBase(originalFilename: string | null) {
  const filename = String(originalFilename ?? "")
    .split(/[\\/]/)
    .pop() ?? "";
  const extensionIndex = filename.lastIndexOf(".");

  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
}

export function buildVintedUploadImageFilename(
  originalFilename: string | null,
  imageId: string
) {
  const baseName = (getFilenameBase(originalFilename) || imageId || "image").replace(
    /[^\w.-]+/g,
    "-"
  );

  return `${baseName}-vinted.jpg`;
}
