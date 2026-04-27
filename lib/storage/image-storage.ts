export interface UploadDraftImageInput {
  draftId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
}

export interface StoredImageAsset {
  storagePath: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

export interface DraftImageStorage {
  upload(input: UploadDraftImageInput): Promise<StoredImageAsset>;
  remove(storagePath: string): Promise<void>;
  listPaths(draftId: string): Promise<string[]>;
}
