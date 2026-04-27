export type StudioSessionStatus = "needs_stocking" | "stocked";

export type PhotoAssetOrganizationStatus = "unassigned" | "grouped";

export interface IntakeFolderConfig {
  sourceType: "local-folder";
  startMode: "manual";
  folderLabel: string | null;
}

export interface PhotoAsset {
  id: string;
  sessionId: string;
  storagePath: string;
  originalFilename: string;
  relativePath: string | null;
  sortOrder: number;
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  organizationStatus: PhotoAssetOrganizationStatus;
  createdAt: string;
}

export interface StudioSession {
  id: string;
  name: string;
  status: StudioSessionStatus;
  intakeConfig: IntakeFolderConfig;
  photoCount: number;
  unassignedPhotoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudioSessionDetail extends StudioSession {
  photoAssets: PhotoAsset[];
}
