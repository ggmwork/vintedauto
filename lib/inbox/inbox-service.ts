import { studioSessionRepository } from "@/lib/intake";
import type { PhotoAsset, StudioSessionDetail } from "@/types/intake";
import type { InboxWatcherSnapshot } from "@/types/watcher";

export interface InboxViewModel {
  watcher: InboxWatcherSnapshot;
  watchedSession: StudioSessionDetail | null;
  loosePhotoAssets: PhotoAsset[];
  autoStockedItemsCount: number;
  draftedStockItemsCount: number;
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
    ? watchedSession.photoAssets.filter((photoAsset) => photoAsset.stockItemId === null)
    : [];

  return {
    watcher,
    watchedSession,
    loosePhotoAssets,
    autoStockedItemsCount: watchedSession?.stockItems.length ?? 0,
    draftedStockItemsCount: watchedSession?.draftedStockItemCount ?? 0,
  };
}
