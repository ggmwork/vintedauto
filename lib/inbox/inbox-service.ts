import { studioSessionRepository } from "@/lib/intake";
import type {
  CandidateCluster,
  PhotoAsset,
  StudioSessionDetail,
} from "@/types/intake";
import type { InboxWatcherSnapshot } from "@/types/watcher";

export interface InboxReviewCluster {
  cluster: CandidateCluster;
  photoAssets: PhotoAsset[];
}

export interface InboxViewModel {
  watcher: InboxWatcherSnapshot;
  watchedSession: StudioSessionDetail | null;
  loosePhotoAssets: PhotoAsset[];
  reviewClusters: InboxReviewCluster[];
  autoStockedItemsCount: number;
  draftedStockItemsCount: number;
  pendingReviewClusterCount: number;
}

export async function listAllSessionDetails() {
  const sessions = await studioSessionRepository.list();

  return (
    await Promise.all(sessions.map((session) => studioSessionRepository.getById(session.id)))
  ).filter((session): session is StudioSessionDetail => session !== null);
}

export async function getWatchedSessionDetail(folderPath: string) {
  const sessions = await studioSessionRepository.list();
  const watchedSession = sessions.find(
    (session) =>
      session.intakeConfig.sourceType === "watched-folder" &&
      session.intakeConfig.folderPath === folderPath
  );

  if (!watchedSession) {
    return null;
  }

  return studioSessionRepository.getById(watchedSession.id);
}

export async function getInboxViewModel(
  watcher: InboxWatcherSnapshot
): Promise<InboxViewModel> {
  const watchedSession = await getWatchedSessionDetail(watcher.config.folderPath);
  const loosePhotoAssets = watchedSession
    ? watchedSession.photoAssets.filter(
        (photoAsset) =>
          photoAsset.stockItemId === null && photoAsset.candidateClusterId === null
      )
    : [];
  const reviewClusters = watchedSession
    ? watchedSession.candidateClusters
        .filter((cluster) => cluster.status === "needs_review")
        .map((cluster) => ({
          cluster,
          photoAssets: watchedSession.photoAssets
            .filter((photoAsset) => photoAsset.candidateClusterId === cluster.id)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        }))
        .filter((entry) => entry.photoAssets.length > 0)
    : [];

  return {
    watcher,
    watchedSession,
    loosePhotoAssets,
    reviewClusters,
    autoStockedItemsCount: watchedSession?.stockItems.length ?? 0,
    draftedStockItemsCount: watchedSession?.draftedStockItemCount ?? 0,
    pendingReviewClusterCount: reviewClusters.length,
  };
}
