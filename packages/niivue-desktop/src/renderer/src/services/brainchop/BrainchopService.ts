import * as tf from '@tensorflow/tfjs'
import { NVImage } from '@niivue/niivue'
import { modelManager, ModelManager } from './ModelManager.js'
import { imagePreprocessor, ImagePreprocessor } from './ImagePreprocessor.js'
import { inferenceEngine, InferenceEngine } from './InferenceEngine.js'
import type {
  ModelInfo,
  SegmentationOptions,
  SegmentationResult,
  BrainchopServiceState
} from './types.js'

/**
 * Main service for brain segmentation using TensorFlow.js models
 * Integrates model loading, preprocessing, inference, and postprocessing
 */
export class BrainchopService {
  private modelManager: ModelManager
  private imagePreprocessor: ImagePreprocessor
  private inferenceEngine: InferenceEngine
  private state: BrainchopServiceState

  constructor() {
    this.modelManager = modelManager
    this.imagePreprocessor = imagePreprocessor
    this.inferenceEngine = inferenceEngine

    this.state = {
      isInitialized: false,
      isRunning: false,
      currentModel: null,
      availableMemoryMB: 0
    }
  }

  /**
   * Initialize the brainchop service
   * Must be called before running segmentation
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      return
    }

    try {
      // Initialize TensorFlow.js and model manager
      await this.modelManager.initialize()

      // Get available memory
      const memory = tf.memory()
      this.state.availableMemoryMB = memory.numBytes / 1024 / 1024

      this.state.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize BrainchopService:', error)
      throw new Error(`BrainchopService initialization failed: ${error}`)
    }
  }

  /**
   * Run segmentation on a volume
   */
  async runSegmentation(
    volume: NVImage,
    modelId: string,
    options: SegmentationOptions = {}
  ): Promise<SegmentationResult> {
    if (!this.state.isInitialized) {
      throw new Error('BrainchopService not initialized. Call initialize() first.')
    }

    if (this.state.isRunning) {
      throw new Error('Segmentation already in progress')
    }

    this.state.isRunning = true
    this.state.currentModel = modelId

    const startTime = performance.now()

    try {
      const { onProgress, abortSignal, useSubvolumes = false, subvolumeSize = 64, normalizeIntensity = true } = options

      // Validate volume
      if (!volume || !volume.img || volume.img.length === 0) {
        throw new Error('Invalid or empty volume')
      }

      onProgress?.(0, 'Loading model')

      // Load model
      const modelInfo = this.modelManager.getModelInfo(modelId)
      if (!modelInfo) {
        throw new Error(`Model not found: ${modelId}`)
      }

      const model = await this.modelManager.loadModel(modelId)

      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(10, 'Preprocessing volume')

      // Preprocess volume
      const preprocessResult = await this.imagePreprocessor.preprocessVolume(volume, {
        normalizeIntensity,
        onProgress: (progress, status) => {
          const scaledProgress = 10 + (progress / 100) * 20 // Scale to 10-30%
          onProgress?.(scaledProgress, status)
        }
      })

      // Check for cancellation
      if (abortSignal?.aborted) {
        preprocessResult.tensor.dispose()
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(30, 'Running inference')

      // Run inference
      const outputTensor = await this.inferenceEngine.runInference(preprocessResult.tensor, model, {
        useSubvolumes,
        subvolumeSize,
        onProgress: (progress, status) => {
          const scaledProgress = 30 + (progress / 100) * 60 // Scale to 30-90%
          onProgress?.(scaledProgress, status)
        },
        abortSignal
      })

      // Check for cancellation
      if (abortSignal?.aborted) {
        preprocessResult.tensor.dispose()
        outputTensor.dispose()
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(90, 'Creating segmentation volume')

      // Convert output tensor to NVImage
      const segmentationVolume = await this.createSegmentationVolume(
        outputTensor,
        volume,
        modelInfo,
        preprocessResult.originalShape,
        preprocessResult.originalVoxelSize
      )

      // Clean up tensors
      preprocessResult.tensor.dispose()
      outputTensor.dispose()

      const endTime = performance.now()
      const inferenceTimeMs = endTime - startTime

      // Get memory usage
      const memoryInfo = tf.memory()
      const memoryUsedMB = memoryInfo.numBytes / 1024 / 1024

      onProgress?.(100, 'Segmentation complete')

      const result: SegmentationResult = {
        volume: segmentationVolume,
        modelInfo,
        inferenceTimeMs,
        memoryUsedMB,
        timestamp: new Date()
      }

      return result
    } catch (error) {
      console.error('Segmentation failed:', error)
      throw error
    } finally {
      this.state.isRunning = false
      this.state.currentModel = null
    }
  }

  /**
   * Create an NVImage from the segmentation output tensor
   * Following brainchop's callBackImg approach exactly: clone source volume and replace image data
   */
  private async createSegmentationVolume(
    outputTensor: tf.Tensor4D,
    sourceVolume: NVImage,
    modelInfo: ModelInfo,
    originalShape: number[],
    originalVoxelSize: number[]
  ): Promise<NVImage> {
    // Convert tensor to Float32Array (this will be 256³)
    let data = await this.imagePreprocessor.tensorToVolumeData(outputTensor)

    // Check if we need to resample back to original space
    const needsResampling =
      originalShape[0] !== 256 || originalShape[1] !== 256 || originalShape[2] !== 256

    if (needsResampling) {
      data = await this.imagePreprocessor.resampleToOriginalSpace(
        data,
        originalShape,
        originalVoxelSize
      )
    }

    // Find min/max without spread operator (to avoid stack overflow)
    let dataMin = data[0]
    let dataMax = data[0]
    for (let i = 1; i < data.length; i++) {
      if (data[i] < dataMin) dataMin = data[i]
      if (data[i] > dataMax) dataMax = data[i]
    }

    // Convert Float32Array to Uint8Array for label data
    // If data is in 0-1 range (probabilities), scale to 0-255
    // If data is already integer labels, keep as is
    const uint8Data = new Uint8Array(data.length)

    if (dataMax <= 1.0 && dataMax > 0) {
      // Probability output - threshold at 0.5 and convert to binary mask
      for (let i = 0; i < data.length; i++) {
        uint8Data[i] = data[i] > 0.5 ? 1 : 0
      }
    } else {
      // Integer labels - round to nearest integer
      for (let i = 0; i < data.length; i++) {
        uint8Data[i] = Math.round(data[i])
      }
    }

    // Clone the source volume - this preserves all transformations automatically
    const overlayVolume = sourceVolume.clone()

    // Update the name
    overlayVolume.name = `${sourceVolume.name}_${modelInfo.id}`

    // Zero the image
    overlayVolume.zeroImage()

    // Replace with segmentation data
    overlayVolume.img = uint8Data

    // Set NIFTI intent code and scaling
    if (overlayVolume.hdr) {
      overlayVolume.hdr.intent_code = 1002 // NIFTI_INTENT_LABEL
      overlayVolume.hdr.scl_inter = 0
      overlayVolume.hdr.scl_slope = 1
    }

    // Set cal_min and cal_max for proper display
    overlayVolume.cal_min = 0
    overlayVolume.cal_max = dataMax

    // Update global_min and global_max
    overlayVolume.global_min = dataMin
    overlayVolume.global_max = dataMax

    // Set colormap
    if (modelInfo.type === 'parcellation') {
      overlayVolume.colormap = 'freesurfer'
    } else if (modelInfo.type === 'brain-extraction') {
      overlayVolume.colormap = 'red'
    } else {
      overlayVolume.colormap = 'actc'
    }

    return overlayVolume
  }


  /**
   * Get all available models
   */
  getAvailableModels(): ModelInfo[] {
    return this.modelManager.getAvailableModels()
  }

  /**
   * Get model information by ID
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return this.modelManager.getModelInfo(modelId)
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: string): ModelInfo[] {
    return this.modelManager.getModelsByCategory(category)
  }

  /**
   * Get models by type
   */
  getModelsByType(type: string): ModelInfo[] {
    return this.modelManager.getModelsByType(type)
  }

  /**
   * Preload a model into cache
   */
  async preloadModel(modelId: string): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('BrainchopService not initialized')
    }

    await this.modelManager.preloadModel(modelId)
  }

  /**
   * Get current service state
   */
  getState(): BrainchopServiceState {
    return { ...this.state }
  }

  /**
   * Check if service is ready to run segmentation
   */
  isReady(): boolean {
    return this.state.isInitialized && !this.state.isRunning
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    tensorflow: tf.MemoryInfo
    modelCache: ReturnType<ModelManager['getCacheStats']>
    inference: ReturnType<InferenceEngine['getMemoryStats']>
  } {
    return {
      tensorflow: tf.memory(),
      modelCache: this.modelManager.getCacheStats(),
      inference: this.inferenceEngine.getMemoryStats()
    }
  }

  /**
   * Clear model cache to free memory
   */
  clearModelCache(): void {
    this.modelManager.clearCache()
  }

  /**
   * Dispose all resources and cleanup
   */
  dispose(): void {
    this.modelManager.dispose()
    this.inferenceEngine.dispose()
    this.state.isInitialized = false
    this.state.isRunning = false
    this.state.currentModel = null
  }
}

// Export singleton instance
export const brainchopService = new BrainchopService()
