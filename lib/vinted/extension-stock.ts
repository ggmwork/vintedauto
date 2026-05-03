import { draftRepository } from "@/lib/drafts";
import { getDraftReadiness } from "@/lib/drafts/draft-readiness";
import { studioSessionRepository } from "@/lib/intake";
import {
  formatVintedCategoryPathInput,
  getVintedProfileMissingFieldKeys,
  hydrateDraftVintedProfileState,
  resolveVintedListingProfile,
} from "@/lib/vinted/listing-profile";
import type { DraftStatus, DraftVintedHandoffStatus } from "@/types/draft";
import type { StudioSessionDetail } from "@/types/intake";
import type { VintedProfileFieldKey } from "@/types/vinted-profile";

export interface VintedExtensionStockItem {
  stockItemId: string;
  stockItemName: string;
  draftId: string;
  draftTitle: string | null;
  draftStatus: DraftStatus;
  ready: boolean;
  missingFields: string[];
  imageCount: number;
  sourceLabel: string;
  updatedAt: string;
  handoffStatus: DraftVintedHandoffStatus;
  vintedProfileLabel: string;
  vintedCategoryPath: string | null;
  vintedMissingRequiredFieldKeys: VintedProfileFieldKey[];
}

function getSourceLabel(session: StudioSessionDetail) {
  return (
    session.intakeConfig.folderLabel ??
    session.intakeConfig.folderPath ??
    session.name
  );
}

export async function listVintedExtensionStockItems() {
  const sessions = (
    await Promise.all(
      (await studioSessionRepository.list()).map((session) =>
        studioSessionRepository.getById(session.id)
      )
    )
  ).filter((session): session is StudioSessionDetail => session !== null);

  const draftedEntries = sessions.flatMap((session) =>
    session.stockItems
      .filter((stockItem) => stockItem.draftId !== null)
      .map((stockItem) => ({
        session,
        stockItem,
        draftId: stockItem.draftId as string,
      }))
  );

  const items = (
    await Promise.all(
    draftedEntries.map(async ({ session, stockItem, draftId }) => {
      const draft = await draftRepository.getById(draftId);

      if (!draft) {
        return null;
      }

      const readiness = getDraftReadiness({
        imageCount: draft.images.length,
        title: draft.title,
        description: draft.description,
        keywords: draft.keywords,
        metadata: draft.metadata,
        priceSuggestion: draft.priceSuggestion,
        vintedProfile: draft.vintedProfile,
      });
      const vintedProfileState = hydrateDraftVintedProfileState({
        category: draft.metadata.category,
        state: draft.vintedProfile,
      });
      const resolvedVintedProfile = resolveVintedListingProfile({
        category: draft.metadata.category,
        state: vintedProfileState,
      });

      return {
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
        draftId: draft.id,
        draftTitle: draft.title,
        draftStatus: draft.status,
        ready: readiness.ready,
        missingFields: readiness.missing,
        imageCount: draft.images.length,
        sourceLabel: getSourceLabel(session),
        updatedAt: draft.updatedAt,
        handoffStatus: draft.vintedHandoff.status,
        vintedProfileLabel: resolvedVintedProfile.label,
        vintedCategoryPath:
          formatVintedCategoryPathInput(
            vintedProfileState.categoryPlan ?? resolvedVintedProfile.categoryPlan
          ) || null,
        vintedMissingRequiredFieldKeys: getVintedProfileMissingFieldKeys(
          resolvedVintedProfile,
          vintedProfileState
        ),
      } satisfies VintedExtensionStockItem;
    })
    )
  ).filter((item): item is VintedExtensionStockItem => item !== null);

  return items.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}
