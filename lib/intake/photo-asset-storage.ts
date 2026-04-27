export interface UploadPhotoAssetInput {
  sessionId: string;
  assetId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
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
  read(storagePath: string): Promise<Uint8Array>;
}
