import { randomUUID } from "node:crypto";

import { photoAssetStorage, studioSessionRepository } from "@/lib/intake";
import { ollamaPhotoDescriptorService } from "@/lib/grouping/ollama-photo-descriptor-service";
import { buildFallbackDescriptor } from "@/lib/grouping/photo-descriptor-service";
import type {
  CandidateCluster,
  GroupingConfidence,
  GroupingRun,
  PhotoAsset,
  PhotoDescriptor,
  StudioSessionDetail,
} from "@/types/intake";

interface LooseClusterDraft {
  id: string;
  photoAssetIds: string[];
  name: string | null;
  confidence: GroupingConfidence;
  reason: string;
  sourceMethod: CandidateCluster["sourceMethod"];
}

export interface AutoGroupingResult {
  autoCommittedCount: number;
  reviewClusterCount: number;
  stockItemCount: number;
}

interface AutoGroupingOptions {
  useVisualDescriptors?: boolean;
  clusterLoosePhotos?: boolean;
}

function compareOptionalString(left: string | null, right: string | null) {
  if (!left || !right) {
    return 0;
  }

  return left.toLowerCase() === right.toLowerCase() ? 1 : -1;
}

function getPresentationWeight(value: string | null) {
  switch (value?.toLowerCase()) {
    case "hanging":
      return 0.15;
    case "flat lay":
      return 0.12;
    case "folded":
      return 0.1;
    default:
      return 0.08;
  }
}

function calculatePairScore(left: PhotoDescriptor, right: PhotoDescriptor) {
  let score = 0.1;

  score += compareOptionalString(left.garmentType, right.garmentType) * 0.34;
  score += compareOptionalString(left.primaryColor, right.primaryColor) * 0.18;
  score += compareOptionalString(left.secondaryColor, right.secondaryColor) * 0.06;
  score += compareOptionalString(left.visibleBrand, right.visibleBrand) * 0.14;
  score += compareOptionalString(left.pattern, right.pattern) * 0.09;
  score +=
    compareOptionalString(left.presentationType, right.presentationType) *
    getPresentationWeight(left.presentationType ?? right.presentationType);
  score += compareOptionalString(left.backgroundType, right.backgroundType) * 0.06;

  const normalized = Number(Math.max(0, Math.min(1, score)).toFixed(3));

  return normalized;
}

function buildPairScoreKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

function getPhotoAsset(session: StudioSessionDetail, photoAssetId: string) {
  const photoAsset = session.photoAssets.find((entry) => entry.id === photoAssetId);

  if (!photoAsset) {
    throw new Error(`Photo asset not found: ${photoAssetId}`);
  }

  return photoAsset;
}

function findReusableStockItem(session: StudioSessionDetail, clusterName: string | null) {
  if (!clusterName) {
    return null;
  }

  return (
    session.stockItems.find(
      (stockItem) =>
        stockItem.name.toLowerCase() === clusterName.toLowerCase() &&
        stockItem.draftId === null
    ) ?? null
  );
}

function buildClusterName(photoAssets: PhotoAsset[]) {
  const descriptors = photoAssets
    .map((photoAsset) => photoAsset.descriptor)
    .filter((descriptor): descriptor is PhotoDescriptor => descriptor !== null);

  const brand =
    descriptors.find((descriptor) => descriptor.visibleBrand)?.visibleBrand ?? null;
  const color =
    descriptors.find((descriptor) => descriptor.primaryColor)?.primaryColor ?? null;
  const garmentType =
    descriptors.find((descriptor) => descriptor.garmentType)?.garmentType ?? null;

  const candidate = [brand, color, garmentType]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  if (candidate) {
    return candidate.replace(/\s+/g, " ").trim();
  }

  return photoAssets[0]?.relativePath
    ?.split("/")
    .filter(Boolean)[0]
    ?.replace(/[_-]+/g, " ")
    .trim() ?? null;
}

function createGroupingRun(
  sessionId: string,
  importedPhotoAssetIds: string[]
): GroupingRun {
  return {
    id: randomUUID(),
    sessionId,
    status: "running",
    provider: null,
    model: null,
    notes: null,
    importedPhotoAssetIds,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  iterator: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await iterator(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function enrichDescriptors(
  session: StudioSessionDetail,
  photoAssetIds: string[]
) {
  const targetPhotos = photoAssetIds
    .map((photoAssetId) => getPhotoAsset(session, photoAssetId))
    .filter(
      (photoAsset) =>
        !photoAsset.descriptor || photoAsset.descriptor.confidence === "low"
    );

  if (targetPhotos.length === 0) {
    return {
      session,
      provider: null,
      model: null,
    };
  }

  const descriptorResults = await mapWithConcurrency(targetPhotos, 2, async (photoAsset) => {
    const bytes = await photoAssetStorage.read(photoAsset.storagePath);
    const result = await ollamaPhotoDescriptorService.extract({
      photoAsset,
      bytes,
    });

    return {
      photoAssetId: photoAsset.id,
      descriptor: result.descriptor,
      provider: result.provider,
      model: result.model,
    };
  });

  const provider = descriptorResults.find((result) => result.provider)?.provider ?? null;
  const model = descriptorResults.find((result) => result.model)?.model ?? null;
  const descriptorMap = new Map(
    descriptorResults.map((result) => [result.photoAssetId, result.descriptor])
  );

  return {
    session: {
      ...session,
      photoAssets: session.photoAssets.map((photoAsset) =>
        descriptorMap.has(photoAsset.id)
          ? {
              ...photoAsset,
              descriptor: descriptorMap.get(photoAsset.id) ?? photoAsset.descriptor,
            }
          : photoAsset
      ),
    },
    provider,
    model,
  };
}

function applyFallbackDescriptors(
  session: StudioSessionDetail,
  photoAssetIds: string[]
) {
  const targetIds = new Set(photoAssetIds);

  return {
    ...session,
    photoAssets: session.photoAssets.map((photoAsset) =>
      targetIds.has(photoAsset.id)
        ? {
            ...photoAsset,
            descriptor: buildFallbackDescriptor(photoAsset),
          }
        : photoAsset
    ),
  };
}

function buildFolderRuleClusters(
  session: StudioSessionDetail,
  scopedPhotoAssetIds: Set<string> | null
) {
  const groupedPhotoIds = new Map<string, string[]>();

  for (const photoAsset of session.photoAssets) {
    if (
      (scopedPhotoAssetIds && !scopedPhotoAssetIds.has(photoAsset.id)) ||
      photoAsset.stockItemId ||
      photoAsset.candidateClusterId ||
      !photoAsset.relativePath
    ) {
      continue;
    }

    const [topLevelFolder, ...rest] = photoAsset.relativePath.split("/").filter(Boolean);

    if (!topLevelFolder || rest.length === 0) {
      continue;
    }

    const current = groupedPhotoIds.get(topLevelFolder) ?? [];
    current.push(photoAsset.id);
    groupedPhotoIds.set(topLevelFolder, current);
  }

  return Array.from(groupedPhotoIds.entries()).map(([folderName, photoAssetIds]) => ({
    id: randomUUID(),
    photoAssetIds,
    name: folderName.replace(/[_-]+/g, " ").trim() || folderName,
    confidence: "high" as const,
    reason: "Matched by top-level folder.",
    sourceMethod: "folder_rule" as const,
  }));
}

function buildLooseClusters(
  session: StudioSessionDetail,
  scopedPhotoAssetIds: Set<string> | null
) {
  const loosePhotoAssets = session.photoAssets.filter(
    (photoAsset) =>
      (!scopedPhotoAssetIds || scopedPhotoAssetIds.has(photoAsset.id)) &&
      !photoAsset.stockItemId &&
      !photoAsset.candidateClusterId &&
      (!photoAsset.relativePath || !photoAsset.relativePath.includes("/"))
  );

  const pairScores = new Map<string, number>();
  const visited = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (let index = 0; index < loosePhotoAssets.length; index += 1) {
    const left = loosePhotoAssets[index];
    const leftDescriptor = left.descriptor;

    for (let innerIndex = index + 1; innerIndex < loosePhotoAssets.length; innerIndex += 1) {
      const right = loosePhotoAssets[innerIndex];
      const rightDescriptor = right.descriptor;

      if (!leftDescriptor || !rightDescriptor) {
        continue;
      }

      const score = calculatePairScore(leftDescriptor, rightDescriptor);
      pairScores.set(buildPairScoreKey(left.id, right.id), score);

      if (score >= 0.78) {
        const leftAdjacency = adjacency.get(left.id) ?? [];
        leftAdjacency.push(right.id);
        adjacency.set(left.id, leftAdjacency);

        const rightAdjacency = adjacency.get(right.id) ?? [];
        rightAdjacency.push(left.id);
        adjacency.set(right.id, rightAdjacency);
      }
    }
  }

  const clusters: LooseClusterDraft[] = [];

  for (const photoAsset of loosePhotoAssets) {
    if (visited.has(photoAsset.id)) {
      continue;
    }

    const queue = [photoAsset.id];
    const clusterPhotoIds: string[] = [];

    while (queue.length > 0) {
      const currentPhotoId = queue.shift()!;

      if (visited.has(currentPhotoId)) {
        continue;
      }

      visited.add(currentPhotoId);
      clusterPhotoIds.push(currentPhotoId);

      for (const neighborId of adjacency.get(currentPhotoId) ?? []) {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    const clusterPhotos = clusterPhotoIds.map((photoId) => getPhotoAsset(session, photoId));
    const clusterName = buildClusterName(clusterPhotos);
    const clusterConfidence = getClusterConfidence(clusterPhotoIds, pairScores);

    clusters.push({
      id: randomUUID(),
      photoAssetIds: clusterPhotoIds,
      name: clusterName,
      confidence: clusterConfidence,
      reason:
        clusterPhotoIds.length === 1
          ? "Single image isolated from the rest of the batch."
          : "Matched by image descriptor similarity.",
      sourceMethod: "auto_cluster",
    });
  }

  return clusters;
}

function getClusterConfidence(
  photoAssetIds: string[],
  pairScores: Map<string, number>
): GroupingConfidence {
  if (photoAssetIds.length === 1) {
    return "medium";
  }

  const relevantScores: number[] = [];

  for (let index = 0; index < photoAssetIds.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < photoAssetIds.length; innerIndex += 1) {
      const score =
        pairScores.get(buildPairScoreKey(photoAssetIds[index], photoAssetIds[innerIndex])) ??
        0;
      relevantScores.push(score);
    }
  }

  if (relevantScores.length === 0) {
    return "medium";
  }

  const minimumScore = Math.min(...relevantScores);
  const averageScore =
    relevantScores.reduce((total, value) => total + value, 0) / relevantScores.length;

  if (minimumScore >= 0.78 && averageScore >= 0.82) {
    return "high";
  }

  if (averageScore >= 0.64) {
    return "medium";
  }

  return "low";
}

function appendClusterHistory(
  session: StudioSessionDetail,
  clusterDraft: LooseClusterDraft,
  status: CandidateCluster["status"],
  committedStockItemId: string | null
) {
  const now = new Date().toISOString();

  const nextCluster: CandidateCluster = {
    id: clusterDraft.id,
    sessionId: session.id,
    name: clusterDraft.name,
    photoAssetIds: clusterDraft.photoAssetIds,
    confidence: clusterDraft.confidence,
    sourceMethod: clusterDraft.sourceMethod,
    status,
    reason: clusterDraft.reason,
    committedStockItemId,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...session,
    candidateClusters: [nextCluster, ...session.candidateClusters.filter((cluster) => cluster.id !== clusterDraft.id)],
  };
}

function commitClusterToStock(
  session: StudioSessionDetail,
  clusterDraft: LooseClusterDraft,
  nameOverride?: string | null
) {
  const now = new Date().toISOString();
  const clusterName = nameOverride?.trim() || clusterDraft.name || `Stock item ${session.stockItems.length + 1}`;
  const existingStockItem = findReusableStockItem(session, clusterName);
  const stockItemId = existingStockItem?.id ?? randomUUID();
  const linkedCandidateClusterId = clusterDraft.id;

  const stockItems = existingStockItem
    ? session.stockItems.map((stockItem) =>
        stockItem.id === existingStockItem.id
          ? {
              ...stockItem,
              name: clusterName,
              confidence: clusterDraft.confidence,
              linkedCandidateClusterId,
              updatedAt: now,
            }
          : stockItem
      )
    : [
        {
          id: stockItemId,
          sessionId: session.id,
          name: clusterName,
          coverPhotoAssetId: clusterDraft.photoAssetIds[0] ?? null,
          photoAssetIds: clusterDraft.photoAssetIds,
          draftId: null,
          sourceMethod: clusterDraft.sourceMethod,
          confidence: clusterDraft.confidence,
          linkedCandidateClusterId,
          createdAt: now,
          updatedAt: now,
        },
        ...session.stockItems,
      ];

  const photoAssets = session.photoAssets.map((photoAsset) =>
    clusterDraft.photoAssetIds.includes(photoAsset.id)
      ? {
          ...photoAsset,
          stockItemId,
          candidateClusterId: null,
          organizationStatus: "grouped" as const,
        }
      : photoAsset
  );

  return appendClusterHistory(
    {
      ...session,
      stockItems,
      photoAssets,
    },
    clusterDraft,
    clusterDraft.confidence === "high" ? "auto_committed" : "committed",
    stockItemId
  );
}

function keepClusterForReview(
  session: StudioSessionDetail,
  clusterDraft: LooseClusterDraft
) {
  const photoAssets = session.photoAssets.map((photoAsset) =>
    clusterDraft.photoAssetIds.includes(photoAsset.id)
      ? {
          ...photoAsset,
          candidateClusterId: clusterDraft.id,
          organizationStatus: "needs_review" as const,
        }
      : photoAsset
  );

  return appendClusterHistory(
    {
      ...session,
      photoAssets,
    },
    clusterDraft,
    "needs_review",
    null
  );
}

function finalizeGroupingRun(
  session: StudioSessionDetail,
  groupingRun: GroupingRun,
  status: GroupingRun["status"],
  provider: string | null,
  model: string | null,
  notes: string | null
) {
  return {
    ...session,
    groupingRuns: [
      {
        ...groupingRun,
        status,
        provider,
        model,
        notes,
        finishedAt: new Date().toISOString(),
      },
      ...session.groupingRuns.filter((entry) => entry.id !== groupingRun.id),
    ],
  };
}

export async function runSessionAutoGrouping(
  sessionId: string,
  importedPhotoAssetIds: string[] = [],
  options: AutoGroupingOptions = {}
): Promise<AutoGroupingResult> {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    throw new Error(`Studio session not found: ${sessionId}`);
  }

  let nextSession = session;
  const groupingRun = createGroupingRun(sessionId, importedPhotoAssetIds);
  nextSession = {
    ...nextSession,
    groupingRuns: [groupingRun, ...nextSession.groupingRuns],
  };
  const shouldClusterLoosePhotos = options.clusterLoosePhotos ?? true;
  const scopedPhotoAssetIds =
    importedPhotoAssetIds.length > 0 ? new Set(importedPhotoAssetIds) : null;

  const descriptorTargetIds = nextSession.photoAssets
    .filter(
      (photoAsset) =>
        shouldClusterLoosePhotos &&
        (!scopedPhotoAssetIds || scopedPhotoAssetIds.has(photoAsset.id)) &&
        !photoAsset.stockItemId &&
        !photoAsset.candidateClusterId &&
        (!photoAsset.relativePath || !photoAsset.relativePath.includes("/"))
    )
    .map((photoAsset) => photoAsset.id);

  let descriptorProvider: string | null = null;
  let descriptorModel: string | null = null;

  if (descriptorTargetIds.length > 0 && options.useVisualDescriptors !== false) {
    const descriptorResult = await enrichDescriptors(nextSession, descriptorTargetIds);
    nextSession = descriptorResult.session;
    descriptorProvider = descriptorResult.provider;
    descriptorModel = descriptorResult.model;
  } else if (descriptorTargetIds.length > 0) {
    nextSession = applyFallbackDescriptors(nextSession, descriptorTargetIds);
  }

  const folderRuleClusters = buildFolderRuleClusters(
    nextSession,
    scopedPhotoAssetIds
  );
  const looseClusters = shouldClusterLoosePhotos
    ? buildLooseClusters(nextSession, scopedPhotoAssetIds)
    : [];
  let autoCommittedCount = 0;
  let reviewClusterCount = 0;

  for (const cluster of folderRuleClusters) {
    nextSession = commitClusterToStock(nextSession, cluster);
    autoCommittedCount += 1;
  }

  for (const cluster of looseClusters) {
    if (cluster.confidence === "high") {
      nextSession = commitClusterToStock(nextSession, cluster);
      autoCommittedCount += 1;
    } else {
      nextSession = keepClusterForReview(nextSession, cluster);
      reviewClusterCount += 1;
    }
  }

  nextSession = finalizeGroupingRun(
    nextSession,
    groupingRun,
    "completed",
    descriptorProvider,
    descriptorModel,
    shouldClusterLoosePhotos
      ? `Auto-committed ${autoCommittedCount} cluster(s); ${reviewClusterCount} cluster(s) need review.`
      : `Auto-stocked ${autoCommittedCount} folder group(s); loose photos stayed in Inbox.`
  );

  const savedSession = await studioSessionRepository.saveGroupingState({
    sessionId: sessionId,
    photoAssets: nextSession.photoAssets,
    stockItems: nextSession.stockItems,
    candidateClusters: nextSession.candidateClusters,
    groupingRuns: nextSession.groupingRuns,
  });

  return {
    autoCommittedCount,
    reviewClusterCount,
    stockItemCount: savedSession.stockItems.length,
  };
}

export async function commitCandidateCluster(
  sessionId: string,
  candidateClusterId: string,
  nameOverride?: string | null
) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    throw new Error(`Studio session not found: ${sessionId}`);
  }

  const candidateCluster = session.candidateClusters.find(
    (cluster) => cluster.id === candidateClusterId && cluster.status === "needs_review"
  );

  if (!candidateCluster) {
    throw new Error(`Candidate cluster not found: ${candidateClusterId}`);
  }

  const nextSession = commitClusterToStock(
    session,
    {
      id: candidateCluster.id,
      photoAssetIds: candidateCluster.photoAssetIds,
      name: candidateCluster.name,
      confidence: candidateCluster.confidence,
      reason: candidateCluster.reason ?? "Committed from Inbox review.",
      sourceMethod: candidateCluster.sourceMethod,
    },
    nameOverride
  );

  return studioSessionRepository.saveGroupingState({
    sessionId,
    photoAssets: nextSession.photoAssets,
    stockItems: nextSession.stockItems,
    candidateClusters: nextSession.candidateClusters,
    groupingRuns: nextSession.groupingRuns,
  });
}

export async function dissolveCandidateCluster(
  sessionId: string,
  candidateClusterId: string
) {
  const session = await studioSessionRepository.getById(sessionId);

  if (!session) {
    throw new Error(`Studio session not found: ${sessionId}`);
  }

  const candidateCluster = session.candidateClusters.find(
    (cluster) => cluster.id === candidateClusterId && cluster.status === "needs_review"
  );

  if (!candidateCluster) {
    throw new Error(`Candidate cluster not found: ${candidateClusterId}`);
  }

  const now = new Date().toISOString();
  const nextSession = {
    ...session,
    photoAssets: session.photoAssets.map((photoAsset) =>
      candidateCluster.photoAssetIds.includes(photoAsset.id)
        ? {
            ...photoAsset,
            candidateClusterId: null,
            organizationStatus: "unassigned" as const,
          }
        : photoAsset
    ),
    candidateClusters: session.candidateClusters.map((cluster) =>
      cluster.id === candidateClusterId
        ? {
            ...cluster,
            status: "dissolved" as const,
            updatedAt: now,
          }
        : cluster
    ),
  };

  return studioSessionRepository.saveGroupingState({
    sessionId,
    photoAssets: nextSession.photoAssets,
    stockItems: nextSession.stockItems,
    candidateClusters: nextSession.candidateClusters,
    groupingRuns: nextSession.groupingRuns,
  });
}
