import * as tf from '@tensorflow/tfjs'
import { NVImage } from '@niivue/niivue'
import { modelManager, ModelManager } from './ModelManager.js'
import { inferenceEngine, InferenceEngine } from './InferenceEngine.js'
import type {
  ModelInfo,
  SegmentationOptions,
  SegmentationResult,
  BrainchopServiceState
} from './types.js'
import { keepLargestClusterPerClass } from './postprocess.js'

/**
 * Main service for brain segmentation using TensorFlow.js models.
 * Runs inference on the main thread with periodic yields so the UI can update.
 */
export class BrainchopService {
  private modelManager: ModelManager
  private inferenceEngine: InferenceEngine
  private state: BrainchopServiceState

  constructor() {
    this.modelManager = modelManager
    this.inferenceEngine = inferenceEngine

    this.state = {
      isInitialized: false,
      isRunning: false,
      currentModel: null,
      availableMemoryMB: 0
    }
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      return
    }

    try {
      await this.modelManager.initialize()
      const memory = tf.memory()
      this.state.availableMemoryMB = memory.numBytes / 1024 / 1024
      this.state.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize BrainchopService:', error)
      throw new Error(`BrainchopService initialization failed: ${error}`)
    }
  }

  /**
   * Run segmentation on a volume.
   * Pipeline:
   * 1. Load model
   * 2. Extract and normalize volume data as 3D tensor
   * 3. Run inference (crop, layer-by-layer, restore)
   * 4. Convert output labels to NVImage overlay
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
      const { onProgress, abortSignal } = options

      if (!volume || !volume.img || volume.img.length === 0) {
        throw new Error('Invalid or empty volume')
      }

      onProgress?.(0, 'Loading model')
      // Yield so the progress bar renders
      await yieldToUI()

      const modelInfo = this.modelManager.getModelInfo(modelId)
      if (!modelInfo) {
        throw new Error(`Model not found: ${modelId}`)
      }

      const model = await this.modelManager.loadModel(modelId)

      if (abortSignal?.aborted) {
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(10, 'Preprocessing volume')
      await yieldToUI()

      // Extract volume data as Float32Array
      const volumeData = this.extractVolumeData(volume)

      // Volume must be conformed to 256³ @ 1mm by caller (via nv.conform())
      if (volumeData.length !== 256 * 256 * 256) {
        throw new Error(
          `Volume must be conformed to 256³ before segmentation (got ${volumeData.length} voxels). ` +
          'Call nv.conform(volume, true) first.'
        )
      }
      const slices3d = tf.tensor3d(Array.from(volumeData), [256, 256, 256])

      // Normalize
      onProgress?.(15, 'Normalizing')
      await yieldToUI()

      let normalizedSlices: tf.Tensor3D
      if (modelInfo.enableQuantileNorm) {
        normalizedSlices = await this.quantileNormalize(slices3d)
      } else {
        normalizedSlices = await this.minMaxNormalize(slices3d)
      }
      slices3d.dispose()

      if (abortSignal?.aborted) {
        normalizedSlices.dispose()
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(20, 'Running inference')
      await yieldToUI()

      // Run inference with periodic UI yields built into the layer loop
      const outputLabels = await this.inferenceEngine.runInference(normalizedSlices, model, {
        modelInfo,
        onProgress: (progress, status) => {
          const scaledProgress = 20 + (progress / 100) * 70
          onProgress?.(scaledProgress, status)
        },
        abortSignal
      })
      normalizedSlices.dispose()

      if (abortSignal?.aborted) {
        outputLabels.dispose()
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(92, 'Creating segmentation volume')
      await yieldToUI()

      // Convert 3D label tensor to volume data
      const labelData = new Float32Array(await outputLabels.data())
      outputLabels.dispose()

      // Create overlay volume
      const segmentationVolume = this.createSegmentationVolume(labelData, volume, modelInfo)

      const endTime = performance.now()
      const memoryInfo = tf.memory()

      onProgress?.(100, 'Segmentation complete')

      return {
        volume: segmentationVolume,
        modelInfo,
        inferenceTimeMs: endTime - startTime,
        memoryUsedMB: memoryInfo.numBytes / 1024 / 1024,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Segmentation failed:', error)
      throw error
    } finally {
      this.state.isRunning = false
      this.state.currentModel = null
    }
  }

  private extractVolumeData(volume: NVImage): Float32Array {
    const img = volume.img
    if (!img) throw new Error('Volume image data not available')
    if (img instanceof Float32Array) return img
    return new Float32Array(img)
  }

  private async minMaxNormalize(tensor: tf.Tensor3D): Promise<tf.Tensor3D> {
    const max = tensor.max()
    const min = tensor.min()
    const result = tensor.sub(min).div(max.sub(min)) as tf.Tensor3D
    max.dispose()
    min.dispose()
    return result
  }

  private async quantileNormalize(tensor: tf.Tensor3D, lower = 0.05, upper = 0.95): Promise<tf.Tensor3D> {
    const flatArray = await tensor.flatten().array() as number[]
    flatArray.sort((a, b) => a - b)
    const lowIdx = Math.floor(flatArray.length * lower)
    const highIdx = Math.ceil(flatArray.length * upper) - 1
    const qmin = flatArray[lowIdx]
    const qmax = flatArray[highIdx]
    const qminScalar = tf.scalar(qmin)
    const qmaxScalar = tf.scalar(qmax)
    const result = tensor.sub(qminScalar).div(qmaxScalar.sub(qminScalar)) as tf.Tensor3D
    qminScalar.dispose()
    qmaxScalar.dispose()
    return result
  }

  /**
   * Create an NVImage overlay from segmentation label data.
   */
  private createSegmentationVolume(
    data: Float32Array,
    sourceVolume: NVImage,
    modelInfo: ModelInfo
  ): NVImage {
    let dataMin = data[0]
    let dataMax = data[0]
    for (let i = 1; i < data.length; i++) {
      if (data[i] < dataMin) dataMin = data[i]
      if (data[i] > dataMax) dataMax = data[i]
    }
    console.log('[BrainchopService] Raw output data range:', { min: dataMin, max: dataMax })

    const uint8Data = new Uint8Array(data.length)
    if (dataMax <= 1.0 && dataMax > 0) {
      for (let i = 0; i < data.length; i++) {
        uint8Data[i] = data[i] > 0.5 ? 1 : 0
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        uint8Data[i] = Math.round(data[i])
      }
    }

    let labelMin = uint8Data[0]
    let labelMax = uint8Data[0]
    let nonZeroCount = 0
    for (let i = 1; i < uint8Data.length; i++) {
      if (uint8Data[i] < labelMin) labelMin = uint8Data[i]
      if (uint8Data[i] > labelMax) labelMax = uint8Data[i]
      if (uint8Data[i] !== 0) nonZeroCount++
    }
    console.log('[BrainchopService] Labels:', { min: labelMin, max: labelMax, nonZero: nonZeroCount })

    // Remove small disconnected clusters (skull fragments, meninges)
    keepLargestClusterPerClass(uint8Data, [256, 256, 256])

    const overlayVolume = sourceVolume.clone()
    overlayVolume.name = `${sourceVolume.name}_${modelInfo.id}`
    overlayVolume.zeroImage()
    overlayVolume.img = uint8Data

    if (overlayVolume.hdr) {
      overlayVolume.hdr.intent_code = 1002
      overlayVolume.hdr.scl_inter = 0
      overlayVolume.hdr.scl_slope = 1
    }

    overlayVolume.cal_min = labelMin
    overlayVolume.cal_max = labelMax
    overlayVolume.global_min = labelMin
    overlayVolume.global_max = labelMax

    return overlayVolume
  }

  getAvailableModels(): ModelInfo[] {
    return this.modelManager.getAvailableModels()
  }

  getModelInfo(modelId: string): ModelInfo | undefined {
    return this.modelManager.getModelInfo(modelId)
  }

  getModelsByCategory(category: string): ModelInfo[] {
    return this.modelManager.getModelsByCategory(category)
  }

  getModelsByType(type: string): ModelInfo[] {
    return this.modelManager.getModelsByType(type)
  }

  async preloadModel(modelId: string): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('BrainchopService not initialized')
    }
    await this.modelManager.preloadModel(modelId)
  }

  getState(): BrainchopServiceState {
    return { ...this.state }
  }

  isReady(): boolean {
    return this.state.isInitialized && !this.state.isRunning
  }

  getMemoryStats() {
    return {
      tensorflow: tf.memory(),
      modelCache: this.modelManager.getCacheStats(),
      inference: this.inferenceEngine.getMemoryStats()
    }
  }

  clearModelCache(): void {
    this.modelManager.clearCache()
  }

  dispose(): void {
    this.modelManager.dispose()
    this.inferenceEngine.dispose()
    this.state.isInitialized = false
    this.state.isRunning = false
    this.state.currentModel = null
  }
}

/** Yield to the event loop so React can re-render (progress updates, etc.) */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export const brainchopService = new BrainchopService()
