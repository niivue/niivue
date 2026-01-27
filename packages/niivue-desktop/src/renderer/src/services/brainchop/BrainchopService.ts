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
      console.log('BrainchopService already initialized')
      return
    }

    try {
      console.log('Initializing BrainchopService...')

      // Initialize TensorFlow.js and model manager
      await this.modelManager.initialize()

      // Get available memory
      const memory = tf.memory()
      this.state.availableMemoryMB = memory.numBytes / 1024 / 1024

      this.state.isInitialized = true
      console.log('BrainchopService initialized successfully')
      console.log(`Available GPU memory: ${this.state.availableMemoryMB.toFixed(2)} MB`)
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
        preprocessResult.affineMatrix,
        preprocessResult.paddingOffset
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
   */
  private async createSegmentationVolume(
    outputTensor: tf.Tensor4D,
    sourceVolume: NVImage,
    modelInfo: ModelInfo,
    affineMatrix: number[][],
    paddingOffset: [number, number, number]
  ): Promise<NVImage> {
    // Convert tensor to Float32Array
    const data = await this.imagePreprocessor.tensorToVolumeData(outputTensor)

    // Get output dimensions from tensor (256x256x256 @ 1mm)
    const [, width, height, depth] = outputTensor.shape

    // Convert Float32Array to Uint8Array for label data and calculate min/max
    const uint8Data = new Uint8Array(data.length)
    let minVal = 255
    let maxVal = 0
    for (let i = 0; i < data.length; i++) {
      const val = Math.round(data[i])
      uint8Data[i] = val
      if (val < minVal) minVal = val
      if (val > maxVal) maxVal = val
    }

    console.log('[BrainchopService] Creating segmentation volume:', {
      dims: [width, height, depth],
      dataType: 'UINT8',
      minValue: minVal,
      maxValue: maxVal,
      uniqueValues: new Set(Array.from(uint8Data.slice(0, 10000))).size
    })

    console.log('[BrainchopService] Source volume info:', {
      sourceDims: sourceVolume.dims,
      sourceMatRAS: sourceVolume.matRAS ? Array.from(sourceVolume.matRAS) : null,
      sourcePixDims: sourceVolume.pixDims
    })

    console.log('[BrainchopService] Affine matrix (from preprocessing):', affineMatrix)
    console.log('[BrainchopService] Padding offset:', paddingOffset)

    // Adjust affine matrix for padding offset
    // If we padded by [px, py, pz], voxel [0,0,0] in segmentation = voxel [-px,-py,-pz] in resampled space
    const adjustedAffine = affineMatrix.map((row) => [...row]) // Deep copy

    // Calculate the shift in RAS coordinates
    const shiftX = affineMatrix[0][0] * paddingOffset[0] + affineMatrix[0][1] * paddingOffset[1] + affineMatrix[0][2] * paddingOffset[2]
    const shiftY = affineMatrix[1][0] * paddingOffset[0] + affineMatrix[1][1] * paddingOffset[1] + affineMatrix[1][2] * paddingOffset[2]
    const shiftZ = affineMatrix[2][0] * paddingOffset[0] + affineMatrix[2][1] * paddingOffset[1] + affineMatrix[2][2] * paddingOffset[2]

    // Adjust translation (last column)
    adjustedAffine[0][3] = affineMatrix[0][3] - shiftX
    adjustedAffine[1][3] = affineMatrix[1][3] - shiftY
    adjustedAffine[2][3] = affineMatrix[2][3] - shiftZ

    console.log('[BrainchopService] Adjusted affine matrix:', adjustedAffine)

    // Create a minimal NVImage and set properties directly
    const segmentationVolume = new NVImage(null, `${sourceVolume.name}_${modelInfo.id}`)

    // Set image data
    segmentationVolume.img = uint8Data

    // Copy and update header from source
    if (sourceVolume.hdr) {
      segmentationVolume.hdr = JSON.parse(JSON.stringify(sourceVolume.hdr))
      if (segmentationVolume.hdr) {
        segmentationVolume.hdr.dims = [3, width, height, depth, 1, 1, 1, 1]
        segmentationVolume.hdr.pixDims = [1, 1, 1, 1, 0, 0, 0, 0] // 1mm isotropic
        segmentationVolume.hdr.datatypeCode = 2 // DT_UINT8
        segmentationVolume.hdr.numBitsPerVoxel = 8
      }
    }

    // Set dims (256x256x256 @ 1mm)
    segmentationVolume.dims = [width, height, depth]
    segmentationVolume.nVox3D = width * height * depth
    segmentationVolume.pixDims = [1, 1, 1] // 1mm isotropic

    // Set intensity statistics (already calculated above)
    segmentationVolume.global_min = minVal
    segmentationVolume.global_max = maxVal
    segmentationVolume.robust_min = minVal
    segmentationVolume.robust_max = maxVal

    // Set image type
    segmentationVolume.imageType = 4 // NVIMAGE_TYPE.NII

    // Calculate transformation matrices (this may set matRAS from header, but we'll override it)
    segmentationVolume.calculateRAS()

    // Set affine matrix (use adjusted affine that accounts for resampling and padding)
    // IMPORTANT: Set this AFTER calculateRAS() so our custom affine is used for rendering
    const mat4 = new Float32Array(16)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        mat4[i * 4 + j] = adjustedAffine[i][j]
      }
    }
    segmentationVolume.matRAS = mat4 as any

    console.log('[BrainchopService] Final matRAS set:', Array.from(segmentationVolume.matRAS))

    // Calculate intensity calibration (required for rendering)
    segmentationVolume.calMinMax()

    // Set appropriate colormap based on model type
    if (modelInfo.type === 'parcellation') {
      segmentationVolume.colormap = 'freesurfer'
    } else if (modelInfo.type === 'brain-extraction') {
      segmentationVolume.colormap = 'red' // Use a distinct colormap for brain mask
    } else {
      segmentationVolume.colormap = 'actc'
    }

    // Force calibration range to ensure labels are visible
    segmentationVolume.cal_min = 0
    segmentationVolume.cal_max = modelInfo.outputClasses - 1

    console.log('[BrainchopService] Segmentation volume created:', {
      name: segmentationVolume.name,
      dims: segmentationVolume.dims,
      colormap: segmentationVolume.colormap,
      cal_min: segmentationVolume.cal_min,
      cal_max: segmentationVolume.cal_max
    })

    // TODO: Load labels if available (needs IPC handler for file:// access)
    // Labels are optional and not critical for visualization

    return segmentationVolume
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
    console.log('BrainchopService disposed')
  }
}

// Export singleton instance
export const brainchopService = new BrainchopService()
