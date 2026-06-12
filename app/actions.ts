"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getListingGenerationService,
  getListingGenerationServiceForProvider,
} from "@/lib/ai";
import { refreshLocalModelDiscovery } from "@/lib/ai/local-model-discovery";
import { getRecommendedAiPreset } from "@/lib/ai/ollama-presets";
import { testAiProviderConnection } from "@/lib/ai/provider-health";
import {
  createDatabaseFolder,
  openDatabaseFolder,
  replaceDatabaseFromArchive,
} from "@/lib/data-portability/database-archive";
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
import { getBulkListingTargets } from "@/lib/inventory/bulk-listing-targets";
import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import {
  isInventoryStockItem,
  isQueuedStockItem,
} from "@/lib/intake/stock-item-inventory";
import { isDefaultStockItemName } from "@/lib/intake/stock-item-names";
import {
  completeListingGenerationJob,
  createListingGenerationJob,
  failListingGenerationJob,
  findActiveListingGenerationJob,
  listListingGenerationJobs,
} from "@/lib/listing-generation-jobs";
import { updateStoredAiSettings } from "@/lib/settings/ai-settings";
import { draftImageStorage } from "@/lib/storage";
import {
  buildVintedFieldFormName,
  buildVintedFieldPresenceName,
  coerceDraftVintedFieldValue,
  hydrateDraftVintedProfileState,
  parseVintedCategoryPathInput,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";
import {
  ensureInboxWatcherRunning,
  scanInboxWatcherNow,
  stopInboxWatcher,
  updateInboxWatcherConfig,
} from "@/lib/watcher";
import type { AiProvider, AiRouterMode, AiVisionTestResult } from "@/types/ai";
import type { DraftDetail, DraftImage, DraftStatus } from "@/types/draft";
import type { PhotoAsset, StockItem, StudioSessionDetail } from "@/types/intake";
import type { PriceConfidence, PriceSuggestion } from "@/types/pricing";

const AI_VISION_TEST_MAX_IMAGES = 8;
const AI_VISION_TEST_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

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

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;

  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function parseAiProvider(value: FormDataEntryValue | null): AiProvider | null {
  return value === "ollama" ||
    value === "openai" ||
    value === "anthropic" ||
    value === "local-cli"
    ? value
    : null;
}

function parseLocalCliEngine(value: FormDataEntryValue | null) {
  return value === "claude" ? "claude" : "codex";
}

function parseAiRouterMode(value: FormDataEntryValue | null): AiRouterMode | null {
  return value === "manual" || value === "fallback" ? value : null;
}

function parseAiTaskRoute(value: FormDataEntryValue | null) {
  const text = parseStringOrNull(value);

  if (!text) {
    return null;
  }

  const separatorIndex = text.indexOf("|");

  if (separatorIndex <= 0) {
    return null;
  }

  const provider = parseAiProvider(text.slice(0, separatorIndex));
  const model = text.slice(separatorIndex + 1).trim();

  if (!provider || !model) {
    return null;
  }

  return { provider, model };
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

function parseVintedProfileFromForm(
  draft: Pick<DraftDetail, "metadata" | "vintedProfile">,
  metadata: DraftDetail["metadata"],
  formData: FormData
) {
  const currentState = hydrateDraftVintedProfileState({
    category: draft.metadata.category,
    state: draft.vintedProfile,
  });
  const resolvedProfile = resolveVintedListingProfile({
    category: metadata.category,
    state: currentState,
  });
  const submittedSearchQuery = parseStringOrNull(
    formData.get("vintedCategorySearchQuery")
  );
  const submittedCategoryPath = parseVintedCategoryPathInput(
    parseStringOrNull(formData.get("vintedCategoryPath"))
  );
  const nextFieldValues = {
    ...currentState.fieldValues,
  };

  for (const fieldDefinition of resolvedProfile.dynamicFields) {
    const presenceMarker = formData.get(
      buildVintedFieldPresenceName(fieldDefinition.key)
    );

    if (presenceMarker !== "1") {
      continue;
    }

    nextFieldValues[fieldDefinition.key] = coerceDraftVintedFieldValue(
      fieldDefinition,
      formData.get(buildVintedFieldFormName(fieldDefinition.key))
    );
  }

  return hydrateDraftVintedProfileState({
    category: metadata.category,
    state: {
      ...currentState,
      profileKey: resolvedProfile.profileKey,
      categoryPlan:
        submittedSearchQuery || submittedCategoryPath.length > 0
          ? {
              searchQuery:
                submittedSearchQuery ?? resolvedProfile.categoryPlan.searchQuery,
              path:
                submittedCategoryPath.length > 0
                  ? submittedCategoryPath
                  : resolvedProfile.categoryPlan.path,
              source: "user_manual",
              capturedAt: new Date().toISOString(),
              rawText: currentState.categoryPlan?.rawText ?? null,
            }
          : resolvedProfile.categoryPlan.path.length > 0 ||
              resolvedProfile.categoryPlan.searchQuery
            ? {
                searchQuery: resolvedProfile.categoryPlan.searchQuery,
                path: resolvedProfile.categoryPlan.path,
              }
            : null,
      fieldValues: nextFieldValues,
    },
  });
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

function buildInventoryRedirectUrl(
  query?: Record<string, string | null | undefined>
) {
  const nextUrl = new URL("/review", "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToInventory(
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/review");
  revalidatePath("/stock");
  revalidatePath("/drafts");
  redirect(buildInventoryRedirectUrl(query));
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

function buildAiSettingsRedirectUrl(
  query?: Record<string, string | null | undefined>
) {
  const nextUrl = new URL("/settings/ai", "http://localhost");

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) {
      continue;
    }

    nextUrl.searchParams.set(key, value);
  }

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function redirectToAiSettings(
  query?: Record<string, string | null | undefined>
): never {
  revalidatePath("/settings/ai");
  redirect(buildAiSettingsRedirectUrl(query));
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
  returnTo: "session" | "stock" | "inbox" | "inventory",
  query?: Record<string, string | null | undefined>
): never {
  if (returnTo === "inbox") {
    revalidatePath(`/sessions/${sessionId}`);
    redirectToHome(query);
  }

  if (returnTo === "inventory") {
    revalidatePath(`/sessions/${sessionId}`);
    redirectToInventory(query);
  }

  if (returnTo === "stock") {
    revalidatePath(`/sessions/${sessionId}`);
    redirectToStock(query);
  }

  redirectToSession(sessionId, query);
}

function getManualInboxPhotoAssetIds(session: StudioSessionDetail) {
  return session.photoAssets
    .filter(
      (photoAsset) =>
        photoAsset.stockItemId === null && photoAsset.candidateClusterId === null
    )
    .map((photoAsset) => photoAsset.id);
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
  const stockPhotoAssets = getStockItemPhotoAssets(session, stockItem);
  const generationImages = await Promise.all(
    stockPhotoAssets.map(async (photoAsset) => {
      const bytes = await photoAssetStorage.read(photoAsset.storagePath);

      return {
        photoAsset,
        bytes,
      };
    })
  );

  const generationService = getListingGenerationService();
  let createdDraftId: string | null = null;
  const uploadedDraftImages: DraftImage[] = [];

  try {
    const generation = await generationService.generate({
      draftId: stockItem.id,
      images: generationImages.map((entry) => ({
        originalFilename: entry.photoAsset.originalFilename,
        contentType: entry.photoAsset.contentType,
        bytes: entry.bytes,
      })),
      metadata: {
        brand: null,
        category: null,
        size: null,
        condition: null,
        color: null,
        material: null,
        notes: null,
      },
      preferredLanguage: "pt",
      currency: "EUR",
      marketplace: "vinted",
    });
    const draft = await draftRepository.create({});
    const draftImages: DraftImage[] = [];
    createdDraftId = draft.id;

    for (const [index, { photoAsset, bytes }] of generationImages.entries()) {
      const imageId = randomUUID();
      const storedImage = await draftImageStorage.upload({
        draftId: draft.id,
        imageId,
        fileName: photoAsset.originalFilename,
        contentType: photoAsset.contentType || "application/octet-stream",
        bytes: toArrayBuffer(bytes),
      });
      const draftImage = {
        id: imageId,
        draftId: draft.id,
        storagePath: storedImage.storagePath,
        originalFilename: photoAsset.originalFilename || `image-${index + 1}`,
        sortOrder: index,
        contentType: photoAsset.contentType,
        sizeBytes: storedImage.sizeBytes,
        width: storedImage.width,
        height: storedImage.height,
      } satisfies DraftImage;

      draftImages.push(draftImage);
      uploadedDraftImages.push(draftImage);
    }

    await draftRepository.attachImages({
      draftId: draft.id,
      images: draftImages,
    });

    const generatedDraft = await draftRepository.saveGeneration({
      draftId: draft.id,
      generation,
    });

    const generatedTitle = generatedDraft.title?.trim();

    if (generatedTitle && isDefaultStockItemName(stockItem.name)) {
      await studioSessionRepository.renameStockItem({
        sessionId: session.id,
        stockItemId: stockItem.id,
        name: generatedTitle,
      });
    }

    await studioSessionRepository.attachDraftToStockItem({
      sessionId: session.id,
      stockItemId: stockItem.id,
      draftId: draft.id,
    });

    return {
      draftId: draft.id,
      generated: true,
      errorMessage: null,
      provider: generation.provider,
      model: generation.model,
    };
  } catch (error) {
    if (createdDraftId) {
      await Promise.allSettled(
        uploadedDraftImages.map((image) =>
          draftImageStorage.remove(image.storagePath)
        )
      );
      await draftRepository.delete(createdDraftId).catch(() => undefined);
    }

    return {
      draftId: null,
      generated: false,
      errorMessage:
        error instanceof Error ? error.message : "Unknown generation failure.",
      provider: null,
      model: null,
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

  if (!isInventoryStockItem(stockItem)) {
    throw new Error("Move this pre-item to Inventory before generating a listing.");
  }

  if (stockItem.photoAssetIds.length === 0) {
    throw new Error("This stock item has no photos to generate from.");
  }

  const activeJob = await findActiveListingGenerationJob({
    targetType: "stock-item",
    sessionId,
    stockItemId,
  });

  if (activeJob) {
    return {
      draftId: null,
      generated: false,
      errorMessage: "Listing generation is already running for this item.",
      provider: null,
      model: null,
    };
  }

  const jobStart = await createListingGenerationJob({
    targetType: "stock-item",
    sessionId,
    stockItemId,
    label: stockItem.name,
    message: `Generating listing for ${stockItem.name}.`,
  });
  const job = jobStart.job;

  if (!jobStart.created) {
    return {
      draftId: null,
      generated: false,
      errorMessage: "Listing generation is already running for this item.",
      provider: null,
      model: null,
    };
  }

  try {
    const result = await generateDraftFromStockItem(session, stockItem);

    if (result.generated) {
      await completeListingGenerationJob(job.id, {
        message: `Generated listing for ${stockItem.name}.`,
        resultDraftId: result.draftId,
        provider: result.provider,
        model: result.model,
      });
    } else {
      await failListingGenerationJob(
        job.id,
        result.errorMessage ?? "Draft generation failed."
      );
    }

    return result;
  } catch (error) {
    await failListingGenerationJob(
      job.id,
      error instanceof Error ? error.message : "Failed to generate listing."
    );
    throw error;
  }
}

type StockActionReturnTo = "session" | "stock" | "inbox" | "inventory";

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
      : result.importedCount > 0
        ? " Loose photos stayed in Inbox for manual grouping."
      : "";
  const flash =
    result.importedCount > 0
      ? `Imported ${result.importedCount} new photo${result.importedCount === 1 ? "" : "s"} from the watched folder.${groupingSuffix}`
      : result.regroupedExistingLoose
        ? `Regrouped existing loose photos.${groupingSuffix}`
      : `Scan complete. No new images found.${groupingSuffix}`;

  redirectToHome({
    flash,
  });
}

function buildInboxSuggestionFlash(result: {
  autoCommittedCount: number;
  reviewClusterCount: number;
}) {
  const suggestedCount = result.autoCommittedCount + result.reviewClusterCount;

  if (suggestedCount === 0) {
    return "No photo groups were suggested.";
  }

  const movedToStock =
    result.autoCommittedCount > 0
      ? `${result.autoCommittedCount} obvious group${result.autoCommittedCount === 1 ? "" : "s"} moved to Stock.`
      : null;
  const leftForReview =
    result.reviewClusterCount > 0
      ? `${result.reviewClusterCount} suggestion${result.reviewClusterCount === 1 ? "" : "s"} need review.`
      : null;

  return [movedToStock, leftForReview].filter(Boolean).join(" ");
}

export async function suggestInboxGroupsAction(sessionId: string) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectToHome({
      error: "Inbox session not found.",
    });
  }

  const loosePhotoAssetIds = getManualInboxPhotoAssetIds(session);

  if (loosePhotoAssetIds.length < 2) {
    redirectToHome({
      error: "Need at least two loose photos before suggesting groups.",
    });
  }

  const result = await runSessionAutoGrouping(session.id, loosePhotoAssetIds, {
    useVisualDescriptors: true,
    clusterLoosePhotos: true,
  });

  redirectToHome({
    flash: buildInboxSuggestionFlash(result),
  });
}

export async function suggestSelectedInboxGroupsAction(
  sessionId: string,
  formData: FormData
) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectToHome({
      error: "Inbox session not found.",
    });
  }

  const loosePhotoAssetIds = new Set(getManualInboxPhotoAssetIds(session));
  const selectedPhotoAssetIds = parseStringArray(formData.getAll("photoAssetIds")).filter(
    (photoAssetId) => loosePhotoAssetIds.has(photoAssetId)
  );

  if (selectedPhotoAssetIds.length < 2) {
    redirectToHome({
      error: "Select at least two loose photos before suggesting a group.",
    });
  }

  const result = await runSessionAutoGrouping(session.id, selectedPhotoAssetIds, {
    useVisualDescriptors: true,
    clusterLoosePhotos: true,
  });

  redirectToHome({
    flash: buildInboxSuggestionFlash(result),
  });
}

export async function deleteSelectedInboxPhotoAssetsAction(
  sessionId: string,
  formData: FormData
) {
  const photoAssetIds = parseStringArray(formData.getAll("photoAssetIds"));

  if (photoAssetIds.length === 0) {
    redirectToHome({
      error: "Select at least one loose photo before deleting.",
      focus: "inbox",
    });
  }

  try {
    await studioSessionRepository.deletePhotoAssets({
      sessionId,
      photoAssetIds,
    });

    redirectToHome({
      flash: `Deleted ${photoAssetIds.length} photo${photoAssetIds.length === 1 ? "" : "s"} from Inbox.`,
      focus: "inbox",
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectToHome({
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete the selected photos.",
      focus: "inbox",
    });
  }
}

export async function clearInboxSuggestionsAction(sessionId: string) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectToHome({
      error: "Inbox session not found.",
    });
  }

  const reviewClusterIds = new Set(
    session.candidateClusters
      .filter((cluster) => cluster.status === "needs_review")
      .map((cluster) => cluster.id)
  );

  if (reviewClusterIds.size === 0) {
    redirectToHome({
      flash: "No suggestions to clear.",
    });
  }

  const now = new Date().toISOString();

  await studioSessionRepository.saveGroupingState({
    sessionId: session.id,
    photoAssets: session.photoAssets.map((photoAsset) =>
      photoAsset.candidateClusterId &&
      reviewClusterIds.has(photoAsset.candidateClusterId)
        ? {
            ...photoAsset,
            candidateClusterId: null,
            organizationStatus: "unassigned" as const,
          }
        : photoAsset
    ),
    stockItems: session.stockItems,
    candidateClusters: session.candidateClusters.map((cluster) =>
      reviewClusterIds.has(cluster.id)
        ? {
            ...cluster,
            status: "dissolved" as const,
            updatedAt: now,
          }
        : cluster
    ),
    groupingRuns: session.groupingRuns,
  });

  redirectToHome({
    flash: "Cleared all suggestions back into Inbox.",
  });
}

export async function clearInboxStockItemsAction(sessionId: string) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectToHome({
      error: "Inbox session not found.",
    });
  }

  const stockItemsToClear = session.stockItems.filter(
    (stockItem) => isQueuedStockItem(stockItem)
  );

  if (stockItemsToClear.length === 0) {
    redirectAfterSessionStockAction(session.id, "inbox", {
      flash: "No items to clear.",
      focus: "inbox",
    });
  }

  for (const stockItem of stockItemsToClear) {
    await studioSessionRepository.removeStockItem({
      sessionId: session.id,
      stockItemId: stockItem.id,
    });
  }

  redirectAfterSessionStockAction(session.id, "inbox", {
    flash: `Cleared ${stockItemsToClear.length} item${stockItemsToClear.length === 1 ? "" : "s"} back into Inbox.`,
    focus: "inbox",
  });
}

export async function moveInboxStockItemsToInventoryAction(sessionId: string) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    redirectToHome({
      error: "Inbox session not found.",
    });
  }

  const queuedStockItems = session.stockItems.filter(
    (stockItem) =>
      isQueuedStockItem(stockItem) && stockItem.photoAssetIds.length > 0
  );

  if (queuedStockItems.length === 0) {
    redirectToHome({
      flash: "No queued pre-items to move to Inventory.",
    });
  }

  await studioSessionRepository.moveStockItemsToInventory({
    sessionId: session.id,
  });

  redirectToInventory({
    flash: `Moved ${queuedStockItems.length} pre-item${queuedStockItems.length === 1 ? "" : "s"} to Inventory.`,
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
      flash: "Created item from suggestion.",
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

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
      flash: "Sent suggestion back to Inbox.",
      focus: getStockRedirectFocus(returnTo),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectAfterSessionStockAction(sessionId, returnTo, {
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign the selected photos.",
    });
  }
}

export async function assignSelectedInboxPhotoAssetsToInventoryItemAction(
  sessionId: string,
  formData: FormData
) {
  const targetStockItemId = parseStringOrNull(formData.get("targetStockItemId"));
  const photoAssetIds = parseStringArray(formData.getAll("photoAssetIds"));

  if (!targetStockItemId) {
    redirectToHome({
      error: "Choose an inventory item before adding photos.",
      focus: "inbox",
    });
  }

  try {
    const session = await studioSessionRepository.getById(sessionId);

    if (!session) {
      throw new Error(`Studio session not found: ${sessionId}`);
    }

    const targetStockItem = session.stockItems.find(
      (stockItem) => stockItem.id === targetStockItemId
    );

    if (!targetStockItem || !isInventoryStockItem(targetStockItem)) {
      throw new Error("Choose an existing inventory item before adding photos.");
    }

    if (targetStockItem.draftId) {
      throw new Error(
        "This inventory item already has a draft. Open the draft before changing its photos."
      );
    }

    const loosePhotoAssetIds = new Set(
      session.photoAssets
        .filter(
          (photoAsset) =>
            photoAsset.stockItemId === null && photoAsset.candidateClusterId === null
        )
        .map((photoAsset) => photoAsset.id)
    );
    const selectedLoosePhotoAssetIds = photoAssetIds.filter((photoAssetId) =>
      loosePhotoAssetIds.has(photoAssetId)
    );

    if (selectedLoosePhotoAssetIds.length === 0) {
      throw new Error("Select at least one loose photo before adding it to an item.");
    }

    if (selectedLoosePhotoAssetIds.length !== photoAssetIds.length) {
      throw new Error("Only loose inbox photos can be added from Workbench.");
    }

    const nextSession = await studioSessionRepository.assignPhotoAssetsToStockItem({
      sessionId,
      stockItemId: targetStockItem.id,
      photoAssetIds: selectedLoosePhotoAssetIds,
    });
    const nextStockItem =
      nextSession.stockItems.find((stockItem) => stockItem.id === targetStockItem.id) ??
      targetStockItem;

    redirectToHome({
      flash: `Added ${selectedLoosePhotoAssetIds.length} photo${selectedLoosePhotoAssetIds.length === 1 ? "" : "s"} to ${nextStockItem.name}.`,
      focus: "inbox",
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectToHome({
      error:
        error instanceof Error
          ? error.message
          : "Failed to add the selected photos to the item.",
      focus: "inbox",
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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
      isInventoryStockItem(stockItem) &&
      stockItem.photoAssetIds.length > 0 &&
      stockItem.draftId === null
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

      if (result.generated) {
        createdDraftCount += 1;
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
    if (isNextRedirectError(error)) {
      throw error;
    }

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
      .filter(
        (stockItem) =>
          isInventoryStockItem(stockItem) &&
          stockItem.photoAssetIds.length > 0 &&
          stockItem.draftId === null
      )
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

      if (result.generated) {
        createdDraftCount += 1;
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

export async function generateSelectedInventoryListingsAction(formData: FormData) {
  const selectedTargetKeys = Array.from(
    new Set(parseStringArray(formData.getAll("bulkListingTarget")))
  );
  const redirectQuery = {
    filter: parseStringOrNull(formData.get("filter")),
    search: parseStringOrNull(formData.get("search")),
    sort: parseStringOrNull(formData.get("sort")),
  };

  if (selectedTargetKeys.length === 0) {
    redirectToInventory({
      ...redirectQuery,
      error: "Select at least one item before generating listings.",
    });
  }

  const sessions = await studioSessionRepository.list();
  const sessionDetails = (
    await Promise.all(sessions.map((session) => studioSessionRepository.getById(session.id)))
  ).filter((session): session is StudioSessionDetail => session !== null);
  const generationJobs = await listListingGenerationJobs();
  const targets = getBulkListingTargets({
    sessions: sessionDetails,
    generationJobs,
    selectedTargetKeys,
  });

  if (targets.length === 0) {
    redirectToInventory({
      ...redirectQuery,
      error: "No selected items are ready for listing generation.",
    });
  }

  let createdDraftCount = 0;
  let generatedDraftCount = 0;
  const failedStockItems: string[] = [];

  for (const target of targets) {
    try {
      const result = await generateStockItemDraft(
        target.sessionId,
        target.stockItemId
      );

      if (result.generated) {
        createdDraftCount += 1;
        generatedDraftCount += 1;
      } else {
        failedStockItems.push(target.stockItemName);
      }
    } catch {
      failedStockItems.push(target.stockItemName);
    }
  }

  if (generatedDraftCount === 0) {
    redirectToInventory({
      ...redirectQuery,
      error:
        failedStockItems.length > 0
          ? `Listing generation failed for ${failedStockItems.join(", ")}.`
          : "Listing generation failed.",
    });
  }

  const skippedCount = selectedTargetKeys.length - targets.length;
  const skippedSuffix =
    skippedCount > 0
      ? ` ${skippedCount} selected item${skippedCount === 1 ? "" : "s"} skipped because they were no longer ready.`
      : "";
  const failureSuffix =
    failedStockItems.length > 0
      ? ` ${failedStockItems.length} item${failedStockItems.length === 1 ? "" : "s"} failed: ${failedStockItems.join(", ")}.`
      : "";

  redirectToInventory({
    ...redirectQuery,
    flash: `Created ${createdDraftCount} draft${createdDraftCount === 1 ? "" : "s"} and generated ${generatedDraftCount} listing${generatedDraftCount === 1 ? "" : "s"}.${skippedSuffix}${failureSuffix}`,
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
    | "vintedProfile"
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
    | "vintedProfile"
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
      flash: "Removed image and moved the draft back to draft because required listing fields are now missing.",
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

  const activeJob = await findActiveListingGenerationJob({
    targetType: "draft",
    draftId,
  });

  if (activeJob) {
    redirectToDraft(draftId, {
      flash: "Listing generation is already running for this draft.",
      focus: "generate",
    });
  }

  const jobStart = await createListingGenerationJob({
    targetType: "draft",
    draftId,
    label: draft.title?.trim() || "Draft listing",
    message: `Generating listing for ${draft.title?.trim() || "draft"}.`,
  });
  const job = jobStart.job;

  if (!jobStart.created) {
    redirectToDraft(draftId, {
      flash: "Listing generation is already running for this draft.",
      focus: "generate",
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
      preferredLanguage: "pt",
      currency: "EUR",
      marketplace: "vinted",
    });

    await draftRepository.saveGeneration({
      draftId,
      generation,
    });

    await completeListingGenerationJob(job.id, {
      message: `Generated listing with ${generation.provider}:${generation.model}.`,
      resultDraftId: draftId,
      provider: generation.provider,
      model: generation.model,
    });

    redirectToDraft(draftId, {
      flash: `Generated listing with ${generation.provider}:${generation.model}. Manual edits were preserved where they already differed from the last model output.`,
      focus: "review",
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Generation failed for an unknown reason.";

    await failListingGenerationJob(job.id, message);

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
  const vintedProfile = parseVintedProfileFromForm(draft, metadata, formData);
  const nextStatus = getFallbackDraftStatus({
    ...draft,
    title,
    description,
    keywords,
    metadata,
    priceSuggestion,
    vintedProfile,
  });

  await draftRepository.update(draftId, {
    status: nextStatus,
    title,
    description,
    keywords,
    metadata,
    priceSuggestion,
    generation: draft.generation,
    vintedProfile,
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
        : "Saved listing fields and moved the draft back to draft because required listing fields are now missing.",
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
          : "Saved listing fields and moved the draft back to draft because required listing fields are now missing. End of queue.",
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
  const vintedProfile = hydrateDraftVintedProfileState({
    category: metadata.category,
    state: draft.vintedProfile,
  });

  const nextStatus = getFallbackDraftStatus({
    ...draft,
    metadata,
    vintedProfile,
  });

  await draftRepository.update(draftId, {
    status: nextStatus,
    metadata,
    generation: draft.generation,
    vintedProfile,
  });

  redirectToDraft(draftId, {
    flash:
      nextStatus === draft.status
        ? "Saved metadata changes."
        : "Saved metadata changes and moved the draft back to draft because required listing fields are now missing.",
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

export async function setDraftStatusFromInventoryAction(
  draftId: string,
  nextStatus: DraftStatus
) {
  const transition = await setDraftStatusInternal(draftId, nextStatus);

  if (!transition.allowed) {
    redirectToInventory({
      error: transition.message,
    });
  }

  revalidatePath(`/drafts/${draftId}`);
  redirectToInventory({
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
      flash: "Restored a previous generation and moved the draft back to draft because required listing fields are now missing.",
    });
  }

  redirectToDraft(draftId, {
    flash: "Restored a previous generation snapshot.",
  });
}

export async function saveAiSettingsAction(formData: FormData) {
  await updateStoredAiSettings((current) => {
    const nextOpenAiApiKey = parseStringOrNull(formData.get("openAiApiKey"));
    const nextAnthropicApiKey = parseStringOrNull(formData.get("anthropicApiKey"));
    const useAdvancedRouting = formData.get("useAdvancedRouting") === "on";
    const listingRoute = parseAiTaskRoute(formData.get("listingRoute"));
    const groupingRoute = parseAiTaskRoute(formData.get("groupingRoute"));
    const listingProvider = useAdvancedRouting
      ? parseAiProvider(formData.get("advancedListingProvider"))
      : listingRoute?.provider ?? parseAiProvider(formData.get("listingProvider"));
    const groupingProvider = useAdvancedRouting
      ? parseAiProvider(formData.get("advancedGroupingProvider"))
      : groupingRoute?.provider ?? parseAiProvider(formData.get("groupingProvider"));
    const listingModel = useAdvancedRouting
      ? parseStringOrNull(formData.get("advancedListingModel"))
      : listingRoute?.model ?? parseStringOrNull(formData.get("listingModel"));
    const groupingModel = useAdvancedRouting
      ? parseStringOrNull(formData.get("advancedGroupingModel"))
      : groupingRoute?.model ?? parseStringOrNull(formData.get("groupingModel"));

    return {
      ...current,
      routerMode: parseAiRouterMode(formData.get("routerMode")) ?? current.routerMode,
      listingProvider: listingProvider ?? current.listingProvider,
      listingModel: listingModel ?? current.listingModel,
      groupingProvider: groupingProvider ?? current.groupingProvider,
      groupingModel: groupingModel ?? current.groupingModel,
      listingMaxImages: parseOptionalInteger(formData.get("listingMaxImages")),
      ollamaBaseUrl: parseStringOrNull(formData.get("ollamaBaseUrl")),
      openAiBaseUrl: parseStringOrNull(formData.get("openAiBaseUrl")),
      anthropicBaseUrl: parseStringOrNull(formData.get("anthropicBaseUrl")),
      localCliEnabled: formData.get("localCliEnabled") === "on",
      localCliEngine: parseLocalCliEngine(formData.get("localCliEngine")),
      localCliModel:
        parseStringOrNull(formData.get("localCliModelCustom")) ??
        parseStringOrNull(formData.get("localCliModel")),
      ollamaTimeoutMs: parseOptionalInteger(formData.get("ollamaTimeoutMs")),
      openAiTimeoutMs: parseOptionalInteger(formData.get("openAiTimeoutMs")),
      anthropicTimeoutMs: parseOptionalInteger(formData.get("anthropicTimeoutMs")),
      localCliTimeoutMs: parseOptionalInteger(formData.get("localCliTimeoutMs")),
      openAiApiKey:
        formData.get("clearOpenAiApiKey") === "on"
          ? null
          : nextOpenAiApiKey ?? current.openAiApiKey,
      anthropicApiKey:
        formData.get("clearAnthropicApiKey") === "on"
          ? null
          : nextAnthropicApiKey ?? current.anthropicApiKey,
    };
  });

  redirectToAiSettings({
    flash: "Saved AI routing and provider settings.",
  });
}

export async function applyAiPresetAction(presetId: string) {
  const preset = getRecommendedAiPreset(presetId);

  if (!preset) {
    redirectToAiSettings({
      error: "Unknown AI preset.",
    });
  }

  await updateStoredAiSettings((current) => ({
    ...current,
    routerMode: "manual",
    listingProvider: preset.listingProvider,
    groupingProvider: preset.groupingProvider,
    listingModel: preset.listingModel,
    groupingModel: preset.groupingModel,
    listingMaxImages: preset.listingMaxImages,
    localCliEnabled: preset.localCliEnabled ?? current.localCliEnabled,
    localCliEngine: preset.localCliEngine ?? current.localCliEngine,
  }));

  redirectToAiSettings({
    flash: `Applied ${preset.label.toLowerCase()} preset.`,
  });
}

export async function testAiProviderConnectionAction(provider: AiProvider) {
  const result = await testAiProviderConnection(provider);

  await updateStoredAiSettings((current) => ({
    ...current,
    lastTests: {
      ...current.lastTests,
      [provider]: result,
    },
  }));

  if (result.status === "success") {
    redirectToAiSettings({
      flash: `${provider} test passed. ${result.message}`,
    });
  }

  redirectToAiSettings({
    error: `${provider} test failed. ${result.message}`,
  });
}

export async function refreshLocalAiModelsAction() {
  const discovery = await refreshLocalModelDiscovery();
  const toolSummaries = Object.values(discovery.tools).map((tool) =>
    tool.available
      ? `${tool.label}: ${tool.models.length} model${tool.models.length === 1 ? "" : "s"}`
      : `${tool.label}: not found`
  );

  redirectToAiSettings({
    flash: `Scanned local AI tools. ${toolSummaries.join(". ")}.`,
  });
}

function isImageUpload(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(avif|gif|heic|jpeg|jpg|png|webp)$/i.test(file.name)
  );
}

function createEmptyDraftMetadata(): DraftDetail["metadata"] {
  return {
    brand: null,
    category: null,
    size: null,
    condition: null,
    color: null,
    material: null,
    notes: null,
  };
}

function createAiVisionFailureResult(
  message: string,
  files: File[]
): AiVisionTestResult {
  return {
    status: "failed",
    message,
    testedAt: new Date().toISOString(),
    provider: null,
    model: null,
    imageCount: files.length,
    fileNames: files.map((file) => file.name || "unnamed image"),
    title: null,
    description: null,
    keywords: [],
    conditionNotes: null,
    suggestedMetadata: {},
    priceSuggestion: null,
  };
}

export async function testAiVisionListingAction(formData: FormData) {
  const files = formData
    .getAll("visionTestImages")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    redirectToAiSettings({
      error: "Choose at least one product image before running the AI vision test.",
    });
  }

  if (files.length > AI_VISION_TEST_MAX_IMAGES) {
    redirectToAiSettings({
      error: `Choose ${AI_VISION_TEST_MAX_IMAGES} images or fewer for one AI vision test.`,
    });
  }

  const unsupportedFile = files.find((file) => !isImageUpload(file));

  if (unsupportedFile) {
    redirectToAiSettings({
      error: `${unsupportedFile.name || "One file"} is not a supported image file.`,
    });
  }

  const oversizedFile = files.find(
    (file) => file.size > AI_VISION_TEST_MAX_IMAGE_BYTES
  );

  if (oversizedFile) {
    redirectToAiSettings({
      error: `${oversizedFile.name || "One image"} is larger than 12 MB.`,
    });
  }

  try {
    const testRoute = parseAiTaskRoute(formData.get("visionTestRoute"));
    const images = await Promise.all(
      files.map(async (file) => ({
        originalFilename: file.name || "vision-test-image",
        contentType: file.type || "application/octet-stream",
        bytes: new Uint8Array(await file.arrayBuffer()),
      }))
    );
    const generationService = testRoute
      ? getListingGenerationServiceForProvider(testRoute.provider)
      : getListingGenerationService();
    const generation = await generationService.generate({
      draftId: "settings-ai-vision-test",
      images,
      metadata: createEmptyDraftMetadata(),
      preferredLanguage: "pt",
      currency: "EUR",
      marketplace: "vinted",
      modelOverride: testRoute?.model ?? null,
    });
    const result: AiVisionTestResult = {
      status: "success",
      message: `Generated listing test with ${generation.provider}:${generation.model}.`,
      testedAt: generation.generatedAt,
      provider: generation.provider === "mock" ? null : generation.provider,
      model: generation.model,
      imageCount: files.length,
      fileNames: files.map((file) => file.name || "unnamed image"),
      title: generation.content.title,
      description: generation.content.description,
      keywords: generation.content.keywords,
      conditionNotes: generation.content.conditionNotes,
      suggestedMetadata: generation.content.suggestedMetadata,
      priceSuggestion: generation.priceSuggestion,
    };

    await updateStoredAiSettings((current) => ({
      ...current,
      lastVisionTest: result,
    }));

    redirectToAiSettings({
      flash: "AI vision test completed.",
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "AI vision test failed.";

    await updateStoredAiSettings((current) => ({
      ...current,
      lastVisionTest: createAiVisionFailureResult(message, files),
    }));

    redirectToAiSettings({
      error: message,
    });
  }
}

function redirectToDatabaseSettings(
  query?: Record<string, string | null | undefined>
): never {
  redirectToAiSettings(query);
}

export async function createDatabaseAction(formData: FormData) {
  const databasePath = parseStringOrNull(formData.get("databasePath"));
  const label = parseStringOrNull(formData.get("databaseLabel"));

  if (!databasePath) {
    redirectToDatabaseSettings({
      error: "Enter a database folder path before creating a database.",
    });
  }

  try {
    await stopInboxWatcher();
    const databaseRoot = await createDatabaseFolder({
      databaseRoot: databasePath,
      label,
    });

    revalidatePath("/");
    revalidatePath("/review");
    revalidatePath("/stock");
    redirectToDatabaseSettings({
      flash: `Created and opened database: ${databaseRoot}`,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectToDatabaseSettings({
      error:
        error instanceof Error ? error.message : "Failed to create database.",
    });
  }
}

export async function openDatabaseAction(formData: FormData) {
  const databasePath = parseStringOrNull(formData.get("databasePath"));

  if (!databasePath) {
    redirectToDatabaseSettings({
      error: "Enter a database folder path before opening a database.",
    });
  }

  try {
    await stopInboxWatcher();
    const result = await openDatabaseFolder(databasePath);

    revalidatePath("/");
    revalidatePath("/review");
    revalidatePath("/stock");
    redirectToDatabaseSettings({
      flash: `Opened database ${result.manifest.databaseId} at ${result.databaseRoot}.`,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectToDatabaseSettings({
      error: error instanceof Error ? error.message : "Failed to open database.",
    });
  }
}

export async function replaceDatabaseFromImportAction(formData: FormData) {
  const confirmed = formData.get("confirmReplaceDatabase") === "on";
  const archive = formData.get("databaseArchive");

  if (!confirmed) {
    redirectToDatabaseSettings({
      error: "Confirm replacement before importing the database backup.",
    });
  }

  if (!(archive instanceof File) || archive.size === 0) {
    redirectToDatabaseSettings({
      error: "Choose a Vinted Auto backup file before importing.",
    });
  }

  try {
    await stopInboxWatcher();
    const result = await replaceDatabaseFromArchive({
      archive: Buffer.from(await archive.arrayBuffer()),
    });

    revalidatePath("/");
    revalidatePath("/review");
    revalidatePath("/stock");
    revalidatePath("/drafts");
    redirectToDatabaseSettings({
      flash: `Imported database backup. Previous database backup saved at ${result.backupPath}. Imported ${result.validation.summary.stockItems} item${result.validation.summary.stockItems === 1 ? "" : "s"} and ${result.validation.summary.drafts} draft${result.validation.summary.drafts === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirectToDatabaseSettings({
      error:
        error instanceof Error ? error.message : "Failed to import database backup.",
    });
  }
}
