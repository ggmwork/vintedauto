"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getListingGenerationService } from "@/lib/ai";
import { draftRepository } from "@/lib/drafts";
import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import {
  buildReviewQueueUrl,
  type ReviewQueueState,
} from "@/lib/drafts/review-queue";
import {
  commitCandidateCluster,
  dissolveCandidateCluster,
  runSessionAutoGrouping,
} from "@/lib/grouping";
import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import { draftImageStorage } from "@/lib/storage";
import {
  ensureInboxWatcherRunning,
  scanInboxWatcherNow,
  stopInboxWatcher,
  updateInboxWatcherConfig,
} from "@/lib/watcher";
import type { DraftDetail, DraftImage, DraftStatus } from "@/types/draft";
import type { PhotoAsset, StockItem, StudioSessionDetail } from "@/types/intake";
import type { PriceConfidence, PriceSuggestion } from "@/types/pricing";

export async function createDraftAction() {
  const draft = await draftRepository.create({});

  revalidatePath("/drafts");
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

function parseStringArray(values: FormDataEntryValue[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
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

function readOptionalRelativePath(file: File) {
  const candidate = file as File & { webkitRelativePath?: string };

  if (
    typeof candidate.webkitRelativePath === "string" &&
    candidate.webkitRelativePath.trim().length > 0
  ) {
    return candidate.webkitRelativePath;
  }

  return null;
}

function deriveFolderLabelFromFiles(files: File[]) {
  const relativePaths = files
    .map((file) => readOptionalRelativePath(file))
    .filter((value): value is string => Boolean(value));

  if (relativePaths.length === 0) {
    return null;
  }

  const [firstPath] = relativePaths;
  const topLevelDirectory = firstPath.split("/").filter(Boolean)[0];

  return topLevelDirectory?.trim() ? topLevelDirectory : null;
}

function buildHomeRedirectUrl(query?: Record<string, string | null | undefined>) {
  const nextUrl = new URL("/", "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToHome(
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/stock");
  revalidatePath("/review");
  revalidatePath("/");
  redirect(buildHomeRedirectUrl(query));
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
  revalidatePath("/drafts");
  revalidatePath(`/drafts/${draftId}`);
  redirect(buildRedirectUrl(draftId, query));
}

function redirectToReviewQueue(
  state: ReviewQueueState,
  draftId: string | null,
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/drafts");
  revalidatePath("/review");

  if (draftId) {
    revalidatePath(`/drafts/${draftId}`);
  }

  redirect(
    buildReviewQueueUrl({
      state,
      draftId,
      flash: query?.flash ?? null,
      error: query?.error ?? null,
      focus: query?.focus ?? null,
    })
  );
}

function buildStockRedirectUrl(query?: Record<string, string | null | undefined>) {
  const nextUrl = new URL("/stock", "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToStock(
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/stock");
  redirect(buildStockRedirectUrl(query));
}

function buildSessionRedirectUrl(
  sessionId: string,
  query?: Record<string, string | null | undefined>
) {
  const nextUrl = new URL(`/sessions/${sessionId}`, "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToSession(
  sessionId: string,
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/");
  revalidatePath("/stock");
  revalidatePath(`/sessions/${sessionId}`);
  redirect(buildSessionRedirectUrl(sessionId, query));
}

function redirectAfterSessionStockAction(
  sessionId: string,
  returnTo: "session" | "stock" | "inbox",
  query?: Record<string, string | null | undefined>
): never {
  if (returnTo === "inbox") {
    revalidatePath(`/sessions/${sessionId}`);
    redirectToHome(query);
  }

  if (returnTo === "stock") {
    revalidatePath(`/sessions/${sessionId}`);
    redirectToStock(query);
  }

  redirectToSession(sessionId, query);
}

export async function importStudioSessionAction(formData: FormData) {
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    redirectToHome({
      error: "Choose a folder or at least one image before starting intake.",
    });
  }

  const sessionName = parseStringOrNull(formData.get("sessionName"));
  const folderLabel =
    parseStringOrNull(formData.get("folderLabel")) ??
    deriveFolderLabelFromFiles(files);
  const session = await studioSessionRepository.create({
    name: sessionName ?? folderLabel,
    intakeConfig: {
      sourceType: "local-folder",
      startMode: "manual",
      folderLabel,
      folderPath: null,
    },
  });

  const photoAssets = await Promise.all(
    files.map(async (file, index) => {
      const assetId = randomUUID();
      const storedPhotoAsset = await photoAssetStorage.upload({
        sessionId: session.id,
        assetId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        bytes: await file.arrayBuffer(),
      });

      const nextPhotoAsset: PhotoAsset = {
        id: assetId,
        sessionId: session.id,
        storagePath: storedPhotoAsset.storagePath,
        originalFilename: file.name || `photo-${index + 1}`,
        relativePath: readOptionalRelativePath(file),
        sourceFingerprint: null,
        sortOrder: index,
        contentType: file.type || null,
        sizeBytes: storedPhotoAsset.sizeBytes,
        width: storedPhotoAsset.width,
        height: storedPhotoAsset.height,
        organizationStatus: "unassigned",
        stockItemId: null,
        candidateClusterId: null,
        descriptor: null,
        createdAt: new Date().toISOString(),
      };

      return nextPhotoAsset;
    })
  );

  await studioSessionRepository.attachPhotoAssets({
    sessionId: session.id,
    photoAssets,
  });

  await runSessionAutoGrouping(
    session.id,
    photoAssets.map((photoAsset) => photoAsset.id)
  );

  redirectToSession(session.id, {
    flash: `Imported ${photoAssets.length} photo asset${photoAssets.length === 1 ? "" : "s"} into the session.`,
  });
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function getStockItemPhotoAssets(
  session: StudioSessionDetail,
  stockItem: StockItem
) {
  return session.photoAssets
    .filter((photoAsset) => photoAsset.stockItemId === stockItem.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function generateDraftFromStockItem(
  session: StudioSessionDetail,
  stockItem: StockItem
) {
  const draft = await draftRepository.create({});
  const stockPhotoAssets = getStockItemPhotoAssets(session, stockItem);
  const generationImages = await Promise.all(
    stockPhotoAssets.map(async (photoAsset, index) => {
      const bytes = await photoAssetStorage.read(photoAsset.storagePath);
      const imageId = randomUUID();
      const storedImage = await draftImageStorage.upload({
        draftId: draft.id,
        imageId,
        fileName: photoAsset.originalFilename,
        contentType: photoAsset.contentType || "application/octet-stream",
        bytes: toArrayBuffer(bytes),
      });

      const draftImage: DraftImage = {
        id: imageId,
        draftId: draft.id,
        storagePath: storedImage.storagePath,
        originalFilename: photoAsset.originalFilename || `image-${index + 1}`,
        sortOrder: index,
        contentType: photoAsset.contentType,
        sizeBytes: storedImage.sizeBytes,
        width: storedImage.width,
        height: storedImage.height,
      };

      return {
        draftImage,
        generationImage: {
          originalFilename: photoAsset.originalFilename,
          contentType: photoAsset.contentType,
          bytes,
        },
      };
    })
  );

  await draftRepository.attachImages({
    draftId: draft.id,
    images: generationImages.map((entry) => entry.draftImage),
  });

  await studioSessionRepository.attachDraftToStockItem({
    sessionId: session.id,
    stockItemId: stockItem.id,
    draftId: draft.id,
  });

  const generationService = getListingGenerationService();
  try {
    const generation = await generationService.generate({
      draftId: draft.id,
      images: generationImages.map((entry) => entry.generationImage),
      metadata: {
        brand: null,
        category: null,
        size: null,
        condition: null,
        color: null,
        material: null,
        notes: null,
      },
      preferredLanguage: "en",
      currency: "EUR",
      marketplace: "vinted",
    });

    await draftRepository.saveGeneration({
      draftId: draft.id,
      generation,
    });

    return {
      draftId: draft.id,
      generated: true,
      errorMessage: null,
    };
  } catch (error) {
    return {
      draftId: draft.id,
      generated: false,
      errorMessage:
        error instanceof Error ? error.message : "Unknown generation failure.",
    };
  }
}

async function generateStockItemDraft(
  sessionId: string,
  stockItemId: string
) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    throw new Error(`Studio session not found: ${sessionId}`);
  }

  const stockItem = session.stockItems.find((entry) => entry.id === stockItemId);

  if (!stockItem) {
    throw new Error(`Stock item not found: ${stockItemId}`);
  }

  if (stockItem.draftId) {
    throw new Error("This stock item already has a linked draft.");
  }

  if (stockItem.photoAssetIds.length === 0) {
    throw new Error("This stock item has no photos to generate from.");
  }

  return generateDraftFromStockItem(session, stockItem);
}

type StockActionReturnTo = "session" | "stock" | "inbox";

function getStockRedirectFocus(returnTo: StockActionReturnTo) {
  if (returnTo === "inbox") {
    return "inbox";
  }

  return null;
}

export async function saveInboxWatcherSettingsAction(formData: FormData) {
  const folderPath = parseStringOrNull(formData.get("folderPath"));

  await updateInboxWatcherConfig({
    folderPath,
    enabled: true,
  });
  await ensureInboxWatcherRunning();

  redirectToHome({
    flash: "Watched folder updated and watcher resumed.",
  });
}

export async function pauseInboxWatcherAction() {
  await updateInboxWatcherConfig({
    enabled: false,
  });
  await stopInboxWatcher();

  redirectToHome({
    flash: "Watcher paused.",
  });
}

export async function resumeInboxWatcherAction() {
  await updateInboxWatcherConfig({
    enabled: true,
  });
  await ensureInboxWatcherRunning();

  redirectToHome({
    flash: "Watcher resumed.",
  });
}

export async function scanInboxWatcherNowAction() {
  await ensureInboxWatcherRunning();
  const result = await scanInboxWatcherNow();
  const groupingSuffix =
    result.autoCommittedCount > 0 || result.reviewClusterCount > 0
      ? ` Grouped ${result.autoCommittedCount} cluster${result.autoCommittedCount === 1 ? "" : "s"} automatically and left ${result.reviewClusterCount} for review.`
      : "";
  const flash =
    result.importedCount > 0
      ? `Imported ${result.importedCount} new photo${result.importedCount === 1 ? "" : "s"} from the watched folder.${groupingSuffix}`
      : `Scan complete. No new images found.${groupingSuffix}`;

  redirectToHome({
    flash,
  });
}

export async function commitCandidateClusterAction(
  sessionId: string,
  candidateClusterId: string,
  returnTo: StockActionReturnTo = "inbox",
  formData: FormData
) {
  const name = parseStringOrNull(formData.get("stockItemName"));

  try {
    await commitCandidateCluster(sessionId, candidateClusterId, name);

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: "Committed candidate cluster to Stock.",
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to commit the candidate cluster.",
    });
  }
}

export async function dissolveCandidateClusterAction(
  sessionId: string,
  candidateClusterId: string,
  returnTo: StockActionReturnTo = "inbox"
) {
  try {
    await dissolveCandidateCluster(sessionId, candidateClusterId);

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: "Dissolved candidate cluster back into loose photos.",
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to dissolve the candidate cluster.",
    });
  }
}

export async function createStockItemFromSelectionAction(
  sessionId: string,
  returnTo: StockActionReturnTo = "session",
  formData: FormData
) {
  const photoAssetIds = parseStringArray(formData.getAll("photoAssetIds"));
  const name = parseStringOrNull(formData.get("stockItemName"));

  if (photoAssetIds.length === 0) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error: "Select at least one imported photo before creating a stock item.",
    });
  }

  try {
    const stockItem = await studioSessionRepository.createStockItem({
      sessionId,
      name,
      photoAssetIds,
    });

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: `Created ${stockItem.name} with ${photoAssetIds.length} photo${photoAssetIds.length === 1 ? "" : "s"}.`,
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create the stock item.",
    });
  }
}

export async function assignSelectedPhotoAssetsToStockItemAction(
  sessionId: string,
  stockItemId: string,
  returnTo: StockActionReturnTo = "session",
  formData: FormData
) {
  const photoAssetIds = parseStringArray(formData.getAll("photoAssetIds"));

  if (photoAssetIds.length === 0) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error: "Select at least one photo before assigning it to a stock item.",
    });
  }

  try {
    const session = await studioSessionRepository.assignPhotoAssetsToStockItem({
      sessionId,
      stockItemId,
      photoAssetIds,
    });
    const stockItem = session.stockItems.find((entry) => entry.id === stockItemId);

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: `Assigned ${photoAssetIds.length} photo${photoAssetIds.length === 1 ? "" : "s"} to ${stockItem?.name ?? "the stock item"}.`,
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign the selected photos.",
    });
  }
}

export async function removeStockItemAction(
  sessionId: string,
  stockItemId: string,
  returnTo: StockActionReturnTo = "session"
) {
  try {
    const session = await studioSessionRepository.getById(sessionId);

    if (!session) {
      throw new Error(`Studio session not found: ${sessionId}`);
    }

    const stockItem = session.stockItems.find((entry) => entry.id === stockItemId);

    if (!stockItem) {
      throw new Error(`Stock item not found: ${stockItemId}`);
    }

    await studioSessionRepository.removeStockItem({
      sessionId,
      stockItemId,
    });

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: `Removed ${stockItem.name} and returned its photos to the unassigned queue.`,
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error ? error.message : "Failed to remove the stock item.",
    });
  }
}

export async function renameStockItemAction(
  sessionId: string,
  stockItemId: string,
  returnTo: StockActionReturnTo = "session",
  formData: FormData
) {
  const name = parseStringOrNull(formData.get("stockItemName"));

  if (!name) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error: "Stock item name cannot be empty.",
    });
  }

  try {
    await studioSessionRepository.renameStockItem({
      sessionId,
      stockItemId,
      name,
    });

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: `Renamed stock item to ${name}.`,
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error ? error.message : "Failed to rename the stock item.",
    });
  }
}

export async function releasePhotoAssetsFromStockItemAction(
  sessionId: string,
  stockItemId: string,
  returnTo: StockActionReturnTo = "stock",
  formData: FormData
) {
  const photoAssetIds = parseStringArray(formData.getAll("photoAssetIds"));

  if (photoAssetIds.length === 0) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error: "Select at least one photo before moving it back into Inbox.",
    });
  }

  try {
    await studioSessionRepository.releasePhotoAssetsFromStockItem({
      sessionId,
      stockItemId,
      photoAssetIds,
    });

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: `Moved ${photoAssetIds.length} photo${photoAssetIds.length === 1 ? "" : "s"} back into Inbox.`,
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to move the selected photos back into Inbox.",
    });
  }
}

export async function setStockItemCoverPhotoAction(
  sessionId: string,
  stockItemId: string,
  photoAssetId: string,
  returnTo: StockActionReturnTo = "stock"
) {
  try {
    await studioSessionRepository.setStockItemCoverPhoto({
      sessionId,
      stockItemId,
      photoAssetId,
    });

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: "Cover image updated.",
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error ? error.message : "Failed to update the cover image.",
    });
  }
}

export async function generateSessionStockDraftsAction(
  sessionId: string,
  returnTo: StockActionReturnTo = "session"
) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error: "Studio session not found.",
    });
  }

  const readyStockItems = session.stockItems.filter(
    (stockItem) =>
      stockItem.photoAssetIds.length > 0 && stockItem.draftId === null
  );

  if (readyStockItems.length === 0) {
    redirectAfterSessionStockAction(session.id, returnTo, {
      error: "No stock items are ready for draft generation in this session.",
    });
  }

  let createdDraftCount = 0;
  let generatedDraftCount = 0;
  const failedStockItems: string[] = [];

  for (const stockItem of readyStockItems) {
    try {
      const result = await generateDraftFromStockItem(session, stockItem);
      createdDraftCount += 1;

      if (result.generated) {
        generatedDraftCount += 1;
      } else {
        failedStockItems.push(stockItem.name);
        console.error(
          `Failed to generate draft for stock item ${stockItem.id}: ${result.errorMessage}`
        );
      }
    } catch (error) {
      failedStockItems.push(stockItem.name);
      console.error(
        `Failed to create draft for stock item ${stockItem.id}: ${
          error instanceof Error ? error.message : "Unknown draft creation failure."
        }`
      );
    }
  }

  if (generatedDraftCount === 0) {
    redirectAfterSessionStockAction(session.id, returnTo, {
      error:
        failedStockItems.length > 0
          ? `Draft generation failed for ${failedStockItems.join(", ")}.`
          : "Draft generation failed.",
    });
  }

  const failureSuffix =
    failedStockItems.length > 0
      ? ` ${failedStockItems.length} item${failedStockItems.length === 1 ? "" : "s"} still need manual generation: ${failedStockItems.join(", ")}.`
      : "";

  redirectAfterSessionStockAction(session.id, returnTo, {
    flash: `Created ${createdDraftCount} draft${createdDraftCount === 1 ? "" : "s"} from stocked items and generated ${generatedDraftCount} listing${generatedDraftCount === 1 ? "" : "s"}.${failureSuffix}`,
  });
}

export async function generateStockItemDraftAction(
  sessionId: string,
  stockItemId: string,
  returnTo: StockActionReturnTo = "stock"
) {
  try {
    const result = await generateStockItemDraft(sessionId, stockItemId);

    if (!result.generated) {
      redirectAfterSessionStockAction(sessionId, returnTo, {
        error: result.errorMessage ?? "Draft generation failed.",
      });
    }

    redirectAfterSessionStockAction(sessionId, returnTo, {
      flash: "Created one linked draft from the stock item.",
    });
  } catch (error) {
    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error ? error.message : "Failed to generate the stock item draft.",
    });
  }
}

export async function generateAllReadyStockDraftsAction() {
  const sessions = await studioSessionRepository.list();
  const sessionDetails = (
    await Promise.all(sessions.map((session) => studioSessionRepository.getById(session.id)))
  ).filter((session): session is StudioSessionDetail => session !== null);
  const readyStockItems = sessionDetails.flatMap((session) =>
    session.stockItems
      .filter((stockItem) => stockItem.photoAssetIds.length > 0 && stockItem.draftId === null)
      .map((stockItem) => ({
        sessionId: session.id,
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
      }))
  );

  if (readyStockItems.length === 0) {
    redirectToStock({
      error: "No ready stock items found.",
    });
  }

  let createdDraftCount = 0;
  let generatedDraftCount = 0;
  const failedStockItems: string[] = [];

  for (const item of readyStockItems) {
    try {
      const result = await generateStockItemDraft(item.sessionId, item.stockItemId);
      createdDraftCount += 1;

      if (result.generated) {
        generatedDraftCount += 1;
      } else {
        failedStockItems.push(item.stockItemName);
      }
    } catch {
      failedStockItems.push(item.stockItemName);
    }
  }

  const failureSuffix =
    failedStockItems.length > 0
      ? ` ${failedStockItems.length} item${failedStockItems.length === 1 ? "" : "s"} failed: ${failedStockItems.join(", ")}.`
      : "";

  redirectToStock({
    flash: `Created ${createdDraftCount} draft${createdDraftCount === 1 ? "" : "s"} and generated ${generatedDraftCount} listing${generatedDraftCount === 1 ? "" : "s"}.${failureSuffix}`,
  });
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

async function saveDraftReviewInternal(draftId: string, formData: FormData) {
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

  return {
    previousStatus: draft.status,
    nextStatus,
  };
}

export async function saveDraftReviewAction(
  draftId: string,
  formData: FormData
) {
  const result = await saveDraftReviewInternal(draftId, formData);

  redirectToDraft(draftId, {
    flash:
      result.nextStatus === result.previousStatus
        ? "Saved listing fields."
        : "Saved listing fields and moved the draft back to draft because required Vinted fields are now missing.",
    focus: "export",
  });
}

export async function saveDraftReviewAndAdvanceAction(
  draftId: string,
  state: ReviewQueueState,
  nextDraftId: string | null,
  formData: FormData
) {
  const result = await saveDraftReviewInternal(draftId, formData);

  if (!nextDraftId) {
    redirectToReviewQueue(state, draftId, {
      flash:
        result.nextStatus === result.previousStatus
          ? "Saved listing fields. End of queue."
          : "Saved listing fields and moved the draft back to draft because required Vinted fields are now missing. End of queue.",
      focus: "export",
    });
  }

  redirectToReviewQueue(state, nextDraftId, {
    flash: "Saved listing fields and moved to the next draft.",
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

async function setDraftStatusInternal(draftId: string, nextStatus: DraftStatus) {
  const draft = await draftRepository.getById(draftId);

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const transition = canTransitionToStatus(draft, nextStatus);

  if (!transition.allowed) {
    return {
      allowed: false,
      message: transition.message,
    } as const;
  }

  await draftRepository.update(draftId, {
    status: nextStatus,
  });

  return {
    allowed: true,
    message: transition.message,
  } as const;
}

export async function setDraftStatusAction(
  draftId: string,
  nextStatus: DraftStatus
) {
  const transition = await setDraftStatusInternal(draftId, nextStatus);

  if (!transition.allowed) {
    redirectToDraft(draftId, {
      error: transition.message,
    });
  }

  redirectToDraft(draftId, {
    flash: transition.message,
  });
}

export async function setDraftStatusAndAdvanceAction(
  draftId: string,
  nextStatus: DraftStatus,
  state: ReviewQueueState,
  nextDraftId: string | null
) {
  const transition = await setDraftStatusInternal(draftId, nextStatus);

  if (!transition.allowed) {
    redirectToReviewQueue(state, draftId, {
      error: transition.message,
    });
  }

  if (!nextDraftId) {
    redirectToReviewQueue(state, null, {
      flash: `${transition.message} Returned to the review queue.`,
    });
  }

  redirectToReviewQueue(state, nextDraftId, {
    flash: `${transition.message} Moved to the next draft.`,
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
