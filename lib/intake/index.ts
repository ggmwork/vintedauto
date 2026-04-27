import { localPhotoAssetStorage } from "@/lib/intake/local-photo-asset-storage";
import { localStudioSessionRepository } from "@/lib/intake/local-studio-session-repository";

export const studioSessionRepository = localStudioSessionRepository;
export const photoAssetStorage = localPhotoAssetStorage;
