export type StudioSessionStatus = "needs_stocking" | "stocked";

export type PhotoAssetOrganizationStatus =
  | "unassigned"
  | "grouped"
  | "clustered"
  | "needs_review";

export type GroupingConfidence = "low" | "medium" | "high";

export type GroupingSourceMethod = "folder_rule" | "auto_cluster" | "manual";

export type CandidateClusterStatus =
  | "needs_review"
  | "auto_committed"
  | "committed"
  | "dissolved";

export type GroupingRunStatus = "running" | "completed" | "failed";

export interface PhotoDescriptor {
  garmentType: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  visibleBrand: string | null;
  backgroundType: string | null;
  presentationType: string | null;
  confidence: GroupingConfidence;
  provider: string | null;
  model: string | null;
  extractedAt: string;
}

export interface StockItem {
  id: string;
  sessionId: string;
  name: string;
  coverPhotoAssetId: string | null;
  photoAssetIds: string[];
  draftId: string | null;
  sourceMethod: GroupingSourceMethod;
  confidence: GroupingConfidence;
  linkedCandidateClusterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateCluster {
  id: string;
  sessionId: string;
  name: string | null;
  photoAssetIds: string[];
  confidence: GroupingConfidence;
  sourceMethod: Extract<GroupingSourceMethod, "folder_rule" | "auto_cluster">;
  status: CandidateClusterStatus;
  reason: string | null;
  committedStockItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupingRun {
  id: string;
  sessionId: string;
  status: GroupingRunStatus;
  provider: string | null;
  model: string | null;
  notes: string | null;
  importedPhotoAssetIds: string[];
  startedAt: string;
  finishedAt: string | null;
}

export interface IntakeFolderConfig {
  sourceType: "local-folder" | "watched-folder";
  startMode: "manual" | "automatic";
  folderLabel: string | null;
  folderPath: string | null;
}

export interface PhotoAsset {
  id: string;
  sessionId: string;
  storagePath: string;
  originalFilename: string;
  relativePath: string | null;
  sourceFingerprint: string | null;
  sortOrder: number;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  organizationStatus: PhotoAssetOrganizationStatus;
  stockItemId: string | null;
  candidateClusterId: string | null;
  descriptor: PhotoDescriptor | null;
  createdAt: string;
}

export interface StudioSession {
  id: string;
  name: string;
  status: StudioSessionStatus;
  intakeConfig: IntakeFolderConfig;
  photoCount: number;
  unassignedPhotoCount: number;
  stockItemCount: number;
  draftedStockItemCount: number;
  pendingClusterCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudioSessionDetail extends StudioSession {
  photoAssets: PhotoAsset[];
  stockItems: StockItem[];
  candidateClusters: CandidateCluster[];
  groupingRuns: GroupingRun[];
}
