export type StudioSessionStatus = "needs_stocking" | "stocked";

export type PhotoAssetOrganizationStatus = "unassigned" | "grouped";

export interface StockItem {
  id: string;
  sessionId: string;
  name: string;
  coverPhotoAssetId: string | null;
  photoAssetIds: string[];
  draftId: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface StudioSessionDetail extends StudioSession {
  photoAssets: PhotoAsset[];
  stockItems: StockItem[];
}
