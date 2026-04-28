import type {
  CandidateCluster,
  GroupingRun,
  IntakeFolderConfig,
  PhotoAsset,
  StockItem,
  StudioSession,
  StudioSessionDetail,
  StudioSessionStatus,
} from "@/types/intake";

export interface CreateStudioSessionInput {
  name?: string | null;
  status?: StudioSessionStatus;
  intakeConfig?: Partial<IntakeFolderConfig>;
}

export interface SavePhotoAssetsInput {
  sessionId: string;
  photoAssets: PhotoAsset[];
}

export interface SaveGroupingStateInput {
  sessionId: string;
  photoAssets: PhotoAsset[];
  stockItems: StockItem[];
  candidateClusters: CandidateCluster[];
  groupingRuns: GroupingRun[];
}

export interface CreateStockItemInput {
  sessionId: string;
  name?: string | null;
  photoAssetIds: string[];
  sourceMethod?: StockItem["sourceMethod"];
  confidence?: StockItem["confidence"];
  linkedCandidateClusterId?: string | null;
}

export interface AssignPhotoAssetsToStockItemInput {
  sessionId: string;
  stockItemId: string;
  photoAssetIds: string[];
}

export interface RemoveStockItemInput {
  sessionId: string;
  stockItemId: string;
}

export interface RenameStockItemInput {
  sessionId: string;
  stockItemId: string;
  name: string;
}

export interface ReleasePhotoAssetsFromStockItemInput {
  sessionId: string;
  stockItemId: string;
  photoAssetIds: string[];
}

export interface SetStockItemCoverPhotoInput {
  sessionId: string;
  stockItemId: string;
  photoAssetId: string;
}

export interface AttachDraftToStockItemInput {
  sessionId: string;
  stockItemId: string;
  draftId: string;
}

export interface StudioSessionRepository {
  list(): Promise<StudioSession[]>;
  getById(id: string): Promise<StudioSessionDetail | null>;
  create(input: CreateStudioSessionInput): Promise<StudioSessionDetail>;
  attachPhotoAssets(input: SavePhotoAssetsInput): Promise<StudioSessionDetail>;
  saveGroupingState(input: SaveGroupingStateInput): Promise<StudioSessionDetail>;
  createStockItem(input: CreateStockItemInput): Promise<StockItem>;
  assignPhotoAssetsToStockItem(
    input: AssignPhotoAssetsToStockItemInput
  ): Promise<StudioSessionDetail>;
  removeStockItem(input: RemoveStockItemInput): Promise<StudioSessionDetail>;
  renameStockItem(input: RenameStockItemInput): Promise<StudioSessionDetail>;
  releasePhotoAssetsFromStockItem(
    input: ReleasePhotoAssetsFromStockItemInput
  ): Promise<StudioSessionDetail>;
  setStockItemCoverPhoto(
    input: SetStockItemCoverPhotoInput
  ): Promise<StudioSessionDetail>;
  attachDraftToStockItem(
    input: AttachDraftToStockItemInput
  ): Promise<StudioSessionDetail>;
}
