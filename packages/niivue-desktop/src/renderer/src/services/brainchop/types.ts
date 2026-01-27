import type { NVImage } from '@niivue/niivue'
import type * as tf from '@tensorflow/tfjs'

/**
 * Segmentation model types
 */
export type ModelType = 'tissue-segmentation' | 'brain-extraction' | 'parcellation'

/**
 * Model category for organization
 */
export type ModelCategory = 'Tissue Segmentation' | 'Brain Extraction' | 'Regional Parcellation'

/**
 * Information about a segmentation model
 */
export interface ModelInfo {
  id: string
  name: string
  type: ModelType
  category: ModelCategory
  description: string
  expectedInputShape: [number, number, number, number]
  outputClasses: number
  modelPath: string
  labelsPath?: string
  estimatedTimeSeconds: number
  memoryRequirementMB: number
}

/**
 * Options for running segmentation
 */
export interface SegmentationOptions {
  /** Use subvolume processing for memory-constrained systems */
  useSubvolumes?: boolean
  /** Size of subvolumes (default: 64) */
  subvolumeSize?: number
  /** Progress callback (0-100) */
  onProgress?: (progress: number, status?: string) => void
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal
  /** Normalize intensity values */
  normalizeIntensity?: boolean
}

/**
 * Result from segmentation
 */
export interface SegmentationResult {
  /** Segmented volume */
  volume: NVImage
  /** Model used */
  modelInfo: ModelInfo
  /** Inference time in milliseconds */
  inferenceTimeMs: number
  /** Memory used in MB */
  memoryUsedMB: number
  /** Timestamp */
  timestamp: Date
}

/**
 * Progress information
 */
export interface ProgressInfo {
  progress: number
  status: string
  stage: 'preprocessing' | 'inference' | 'postprocessing'
}

/**
 * Inference engine options
 */
export interface InferenceOptions {
  useSubvolumes: boolean
  subvolumeSize: number
  onProgress?: (progress: number, status?: string) => void
  abortSignal?: AbortSignal
}

/**
 * Label definition for segmentation
 */
export interface SegmentationLabel {
  value: number
  name: string
  color: [number, number, number]
}

/**
 * Model labels configuration
 */
export interface ModelLabels {
  labels: SegmentationLabel[]
}

/**
 * Tensor memory tracking
 */
export interface TensorSession {
  tensors: tf.Tensor[]
  dispose(): void
}

/**
 * Preprocessing result
 */
export interface PreprocessingResult {
  tensor: tf.Tensor4D
  originalShape: number[]
  originalVoxelSize: number[]
  affineMatrix: number[][]
  needsResampling: boolean
  paddingOffset: [number, number, number] // Voxels added before content [x, y, z]
}

/**
 * Model cache entry
 */
export interface ModelCacheEntry {
  model: tf.LayersModel
  loadedAt: Date
  lastUsed: Date
  memorySize: number
}

/**
 * Brainchop service state
 */
export interface BrainchopServiceState {
  isInitialized: boolean
  isRunning: boolean
  currentModel: string | null
  availableMemoryMB: number
}
