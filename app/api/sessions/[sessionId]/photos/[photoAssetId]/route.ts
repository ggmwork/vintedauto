import path from "node:path";

import { notFound } from "next/navigation";

import { studioSessionRepository, photoAssetStorage } from "@/lib/intake";

function resolveContentType(fileName: string, fallback: string | null) {
  if (fallback) {
    return fallback;
  }

  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".heic":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      sessionId: string;
      photoAssetId: string;
    }>;
  }
) {
  const { sessionId, photoAssetId } = await context.params;
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    notFound();
  }

  const photoAsset = session.photoAssets.find(
    (candidate) => candidate.id === photoAssetId
  );

  if (!photoAsset) {
    notFound();
  }

  const bytes = await photoAssetStorage.read(photoAsset.storagePath);
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);

  return new Response(body, {
    headers: {
      "content-type": resolveContentType(
        photoAsset.originalFilename,
        photoAsset.contentType
      ),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
