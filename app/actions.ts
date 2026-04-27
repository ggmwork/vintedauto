"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getListingGenerationService } from "@/lib/ai";
import { draftRepository } from "@/lib/drafts";
import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import { draftImageStorage } from "@/lib/storage";
import type { DraftDetail, DraftImage, DraftStatus } from "@/types/draft";
import type { PriceConfidence, PriceSuggestion } from "@/types/pricing";

export async function createDraftAction() {
  const draft = await draftRepository.create({});

  revalidatePath("/");
  redirect(`/drafts/${draft.id}?focus=upload`);
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function parseStringOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseKeywords(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseConfidence(value: FormDataEntryValue | null): PriceConfidence {
  return value === "high" || value === "low" ? value : "medium";
}

function parseMetadataFromForm(formData: FormData) {
  return {
    brand: parseStringOrNull(formData.get("brand")),
    category: parseStringOrNull(formData.get("category")),
    size: parseStringOrNull(formData.get("size")),
    condition: parseStringOrNull(formData.get("condition")),
    color: parseStringOrNull(formData.get("color")),
    material: parseStringOrNull(formData.get("material")),
    notes: parseStringOrNull(formData.get("notes")),
  };
}

function buildRedirectUrl(
  draftId: string,
  query?: Record<string, string | null | undefined>
) {
  const nextUrl = new URL(`/drafts/${draftId}`, "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToDraft(
  draftId: string,
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/");
  revalidatePath(`/drafts/${draftId}`);
  redirect(buildRedirectUrl(draftId, query));
}

function getFallbackDraftStatus(
  draft: Pick<
    DraftDetail,
    | "status"
    | "imageCount"
    | "title"
    | "description"
    | "keywords"
    | "metadata"
    | "priceSuggestion"
  >
) {
  const readiness = getDraftReadiness(draft);

  if (readiness.ready) {
    return draft.status;
  }

  if (draft.status === "draft") {
    return draft.status;
  }

  return "draft" satisfies DraftStatus;
}

function canTransitionToStatus(
  draft: Pick<
    DraftDetail,
    | "status"
    | "imageCount"
    | "title"
    | "description"
    | "keywords"
    | "metadata"
    | "priceSuggestion"
  >,
  nextStatus: DraftStatus
) {
  const readiness = getDraftReadiness(draft);

  switch (nextStatus) {
    case "draft":
      return {
        allowed: true,
        message: "Moved draft back to draft.",
      };
    case "ready":
      return readiness.ready
        ? {
            allowed: true,
            message: "Draft marked ready for Vinted.",
          }
        : {
            allowed: false,
            message: `Draft is missing ${readiness.missing.join(", ")} before it can be ready.`,
          };
    case "listed":
      return readiness.ready
        ? {
            allowed: true,
            message: "Draft marked listed.",
          }
        : {
            allowed: false,
            message: `Draft is missing ${readiness.missing.join(", ")} before it can be listed.`,
          };
    case "sold":
      return draft.status === "listed"
        ? {
            allowed: true,
            message: "Draft marked sold.",
          }
        : {
            allowed: false,
            message: "Only listed drafts can move to sold.",
          };
  }
}

export async function uploadDraftImagesAction(
  draftId: string,
  formData: FormData
) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    redirectToDraft(draftId);
  }

  const uploadedImages = await Promise.all(
    files.map(async (file, index) => {
      const imageId = randomUUID();
      const storedImage = await draftImageStorage.upload({
        draftId,
        imageId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        bytes: await file.arrayBuffer(),
      });

      const nextImage: DraftImage = {
        id: imageId,
        draftId,
        storagePath: storedImage.storagePath,
        originalFilename: file.name || `image-${index + 1}`,
        sortOrder: draft.images.length + index,
        contentType: file.type || null,
        sizeBytes: storedImage.sizeBytes,
        width: storedImage.width,
        height: storedImage.height,
      };

      return nextImage;
    })
  );

  await draftRepository.attachImages({
    draftId,
    images: [...draft.images, ...uploadedImages],
  });

  redirectToDraft(draftId, {
    flash: `Uploaded ${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"}.`,
    focus: "generate",
  });
}

export async function removeDraftImageAction(
  draftId: string,
  imageId: string
) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const imageToRemove = draft.images.find((image) => image.id === imageId);

  if (!imageToRemove) {
    redirectToDraft(draftId);
  }

  await draftImageStorage.remove(imageToRemove.storagePath);
  const updatedDraft = await draftRepository.attachImages({
    draftId,
    images: draft.images.filter((image) => image.id !== imageId),
  });

  const nextStatus = getFallbackDraftStatus(updatedDraft);

  if (nextStatus !== updatedDraft.status) {
    await draftRepository.update(draftId, {
      status: nextStatus,
    });

    redirectToDraft(draftId, {
      flash: "Removed image and moved the draft back to draft because required Vinted fields are now missing.",
    });
  }

  redirectToDraft(draftId);
}

export async function generateDraftListingAction(draftId: string) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  if (draft.images.length === 0) {
    redirectToDraft(draftId, {
      error: "Attach at least one image before generating a listing.",
    });
  }

  try {
    const images = await Promise.all(
      draft.images.map(async (image) => ({
        originalFilename: image.originalFilename,
        contentType: image.contentType,
        bytes: await draftImageStorage.read(image.storagePath),
      }))
    );

    const generationService = getListingGenerationService();
    const generation = await generationService.generate({
      draftId,
      images,
      metadata: draft.metadata,
      preferredLanguage: "en",
      currency: "EUR",
      marketplace: "vinted",
    });

    await draftRepository.saveGeneration({
      draftId,
      generation,
    });

    redirectToDraft(draftId, {
      flash: `Generated listing with ${generation.provider}:${generation.model}. Manual edits were preserved where they already differed from the last model output.`,
      focus: "review",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Generation failed for an unknown reason.";

    redirectToDraft(draftId, {
      error: message,
    });
  }
}

export async function saveDraftReviewAction(
  draftId: string,
  formData: FormData
) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  let minAmount = parseOptionalNumber(formData.get("priceMinAmount"));
  let maxAmount = parseOptionalNumber(formData.get("priceMaxAmount"));

  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    [minAmount, maxAmount] = [maxAmount, minAmount];
  }

  const priceSuggestion: PriceSuggestion = {
    amount: parseOptionalNumber(formData.get("priceAmount")),
    minAmount,
    maxAmount,
    currency: "EUR",
    rationale:
      parseStringOrNull(formData.get("priceRationale")) ??
      "No pricing rationale saved yet.",
    confidence: parseConfidence(formData.get("priceConfidence")),
  };

  const title = parseStringOrNull(formData.get("title"));
  const description = parseStringOrNull(formData.get("description"));
  const keywords = parseKeywords(formData.get("keywords"));
  const metadata = parseMetadataFromForm(formData);
  const nextStatus = getFallbackDraftStatus({
    ...draft,
    title,
    description,
    keywords,
    metadata,
    priceSuggestion,
  });

  await draftRepository.update(draftId, {
    status: nextStatus,
    title,
    description,
    keywords,
    metadata,
    priceSuggestion,
    generation: draft.generation,
  });

  redirectToDraft(draftId, {
    flash:
      nextStatus === draft.status
        ? "Saved listing fields."
        : "Saved listing fields and moved the draft back to draft because required Vinted fields are now missing.",
    focus: "export",
  });
}

export async function saveDraftMetadataAction(
  draftId: string,
  formData: FormData
) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const metadata = parseMetadataFromForm(formData);

  const nextStatus = getFallbackDraftStatus({
    ...draft,
    metadata,
  });

  await draftRepository.update(draftId, {
    status: nextStatus,
    metadata,
    generation: draft.generation,
  });

  redirectToDraft(draftId, {
    flash:
      nextStatus === draft.status
        ? "Saved metadata changes."
        : "Saved metadata changes and moved the draft back to draft because required Vinted fields are now missing.",
  });
}

export async function setDraftStatusAction(
  draftId: string,
  nextStatus: DraftStatus
) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const transition = canTransitionToStatus(draft, nextStatus);

  if (!transition.allowed) {
    redirectToDraft(draftId, {
      error: transition.message,
    });
  }

  await draftRepository.update(draftId, {
    status: nextStatus,
  });

  redirectToDraft(draftId, {
    flash: transition.message,
  });
}

export async function restoreDraftGenerationAction(
  draftId: string,
  generatedAt: string
) {
  const restoredDraft = await draftRepository.restoreGeneration({
    draftId,
    generatedAt,
  });

  const nextStatus = getFallbackDraftStatus(restoredDraft);

  if (nextStatus !== restoredDraft.status) {
    await draftRepository.update(draftId, {
      status: nextStatus,
    });

    redirectToDraft(draftId, {
      flash: "Restored a previous generation and moved the draft back to draft because required Vinted fields are now missing.",
    });
  }

  redirectToDraft(draftId, {
    flash: "Restored a previous generation snapshot.",
  });
}
