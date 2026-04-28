export {
  buildFallbackDescriptor,
  type PhotoDescriptorExtractionResult,
  type PhotoDescriptorImageInput,
  type PhotoDescriptorService,
} from "@/lib/grouping/photo-descriptor-service";
export { ollamaPhotoDescriptorService } from "@/lib/grouping/ollama-photo-descriptor-service";
export {
  commitCandidateCluster,
  dissolveCandidateCluster,
  runSessionAutoGrouping,
  type AutoGroupingResult,
} from "@/lib/grouping/auto-grouping-service";
