export interface UploadPhotoAssetInput {
  sessionId: string;
  assetId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
}

export interface MovePhotoAssetInput {
  sessionId: string;
  assetId: string;
  storagePath: string;
  stockItemId: string | null;
}

export interface StoredPhotoAsset {
  storagePath: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

export interface PhotoAssetStorage {
  upload(input: UploadPhotoAssetInput): Promise<StoredPhotoAsset>;
  move(input: MovePhotoAssetInput): Promise<StoredPhotoAsset>;
  remove(storagePath: string): Promise<void>;
  read(storagePath: string): Promise<Uint8Array>;
}
