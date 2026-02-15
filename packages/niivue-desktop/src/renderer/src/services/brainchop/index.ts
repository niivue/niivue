/**
 * Brainchop Brain Segmentation Service
 *
 * Provides deep learning-based brain segmentation using TensorFlow.js
 * Supports tissue segmentation, brain extraction, and regional parcellation
 */

// Main service export (singleton)
export { brainchopService, BrainchopService } from './BrainchopService.js'

// Component exports for advanced usage
export { modelManager, ModelManager } from './ModelManager.js'
export { imagePreprocessor, ImagePreprocessor } from './ImagePreprocessor.js'
export { inferenceEngine, InferenceEngine } from './InferenceEngine.js'

// Type exports
export type {
  // Model types
  ModelType,
  ModelCategory,
  ModelInfo,
  ModelLabels,
  SegmentationLabel,
  // Segmentation types
  SegmentationOptions,
  SegmentationResult,
  // Progress and state types
  ProgressInfo,
  BrainchopServiceState,
  // Advanced types
  PreprocessingResult,
  ModelCacheEntry,
  TensorSession
} from './types.js'
