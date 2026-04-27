import type {
  IntakeFolderConfig,
  PhotoAsset,
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

export interface StudioSessionRepository {
  list(): Promise<StudioSession[]>;
  getById(id: string): Promise<StudioSessionDetail | null>;
  create(input: CreateStudioSessionInput): Promise<StudioSessionDetail>;
  attachPhotoAssets(input: SavePhotoAssetsInput): Promise<StudioSessionDetail>;
}
