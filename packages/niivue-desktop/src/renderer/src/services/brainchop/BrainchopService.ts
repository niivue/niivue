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

/**
 * Main service for brain segmentation using TensorFlow.js models.
 * Follows brainchop's reference implementation for the inference pipeline.
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
   * Pipeline follows brainchop's runFullVolumeInference:
   * 1. Extract and normalize volume data as 3D tensor
   * 2. Pass to InferenceEngine which handles cropping, layer-by-layer inference, and restoration
   * 3. Convert output labels to NVImage overlay
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

      const modelInfo = this.modelManager.getModelInfo(modelId)
      if (!modelInfo) {
        throw new Error(`Model not found: ${modelId}`)
      }

      const model = await this.modelManager.loadModel(modelId)

      if (abortSignal?.aborted) {
        throw new Error('Segmentation cancelled by user')
      }

      onProgress?.(10, 'Preprocessing volume')

      // Extract volume data as Float32Array
      const volumeData = this.extractVolumeData(volume)

      // Get original dimensions for resampling back
      let originalShape: number[]
      if (volume.hdr?.dims && volume.hdr.dims.length > 3) {
        originalShape = [volume.hdr.dims[1], volume.hdr.dims[2], volume.hdr.dims[3]]
      } else if (volume.dims && volume.dims.length >= 3) {
        if (volume.dims[0] <= 7 && volume.dims.length > 3) {
          originalShape = [volume.dims[1], volume.dims[2], volume.dims[3]]
        } else {
          originalShape = [volume.dims[0], volume.dims[1], volume.dims[2]]
        }
      } else {
        throw new Error('Cannot determine volume dimensions')
      }

      const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
      const originalVoxelSize = [pixDims[1], pixDims[2], pixDims[3]]

      // Create 3D tensor - volume should be conformed to 256^3 already
      let slices3d: tf.Tensor3D
      if (volumeData.length === 256 * 256 * 256) {
        slices3d = tf.tensor3d(Array.from(volumeData), [256, 256, 256])
      } else {
        // Resample to 256^3 if needed
        console.warn('[BrainchopService] Volume not 256^3, resampling')
        const resampled = this.resampleTo256(volumeData, originalShape, originalVoxelSize)
        slices3d = tf.tensor3d(Array.from(resampled), [256, 256, 256])
      }

      // Normalize following brainchop's approach
      onProgress?.(15, 'Normalizing')
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

      // Run inference - InferenceEngine handles cropping, layer-by-layer, and restoration
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

      // Convert 3D label tensor to volume data
      let labelData = new Float32Array(await outputLabels.data())
      outputLabels.dispose()

      // Resample back to original space if needed
      const needsResampling =
        originalShape[0] !== 256 || originalShape[1] !== 256 || originalShape[2] !== 256
      if (needsResampling) {
        labelData = this.resampleLabelsToOriginal(labelData, originalShape, originalVoxelSize)
      }

      // Create overlay volume
      const segmentationVolume = this.createSegmentationVolume(
        labelData,
        volume,
        modelInfo
      )

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

  private resampleTo256(
    data: Float32Array,
    shape: number[],
    voxelSize: number[]
  ): Float32Array {
    const [origX, origY, origZ] = shape
    const targetSize = 256
    const origCenter = [
      (origX * voxelSize[0]) / 2,
      (origY * voxelSize[1]) / 2,
      (origZ * voxelSize[2]) / 2
    ]
    const targetCenter = [targetSize / 2, targetSize / 2, targetSize / 2]
    const resampled = new Float32Array(targetSize * targetSize * targetSize)

    for (let z = 0; z < targetSize; z++) {
      for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
          const offsetX = (x + 0.5) - targetCenter[0]
          const offsetY = (y + 0.5) - targetCenter[1]
          const offsetZ = (z + 0.5) - targetCenter[2]
          const srcX = (origCenter[0] + offsetX) / voxelSize[0] - 0.5
          const srcY = (origCenter[1] + offsetY) / voxelSize[1] - 0.5
          const srcZ = (origCenter[2] + offsetZ) / voxelSize[2] - 0.5
          const x0 = Math.floor(srcX)
          const y0 = Math.floor(srcY)
          const z0 = Math.floor(srcZ)
          if (x0 < 0 || x0 >= origX || y0 < 0 || y0 >= origY || z0 < 0 || z0 >= origZ) continue
          const x1 = Math.min(x0 + 1, origX - 1)
          const y1 = Math.min(y0 + 1, origY - 1)
          const z1 = Math.min(z0 + 1, origZ - 1)
          const xf = srcX - x0, yf = srcY - y0, zf = srcZ - z0
          const c000 = data[z0 * origX * origY + y0 * origX + x0]
          const c001 = data[z0 * origX * origY + y0 * origX + x1]
          const c010 = data[z0 * origX * origY + y1 * origX + x0]
          const c011 = data[z0 * origX * origY + y1 * origX + x1]
          const c100 = data[z1 * origX * origY + y0 * origX + x0]
          const c101 = data[z1 * origX * origY + y0 * origX + x1]
          const c110 = data[z1 * origX * origY + y1 * origX + x0]
          const c111 = data[z1 * origX * origY + y1 * origX + x1]
          const c00 = c000 * (1 - xf) + c001 * xf
          const c01 = c010 * (1 - xf) + c011 * xf
          const c10 = c100 * (1 - xf) + c101 * xf
          const c11 = c110 * (1 - xf) + c111 * xf
          const c0 = c00 * (1 - yf) + c01 * yf
          const c1 = c10 * (1 - yf) + c11 * yf
          resampled[z * targetSize * targetSize + y * targetSize + x] = c0 * (1 - zf) + c1 * zf
        }
      }
    }
    return resampled
  }

  private resampleLabelsToOriginal(
    data: Float32Array,
    originalShape: number[],
    originalVoxelSize: number[]
  ): Float32Array {
    const [origX, origY, origZ] = originalShape
    const targetSize = 256
    const origCenter = [
      (origX * originalVoxelSize[0]) / 2,
      (origY * originalVoxelSize[1]) / 2,
      (origZ * originalVoxelSize[2]) / 2
    ]
    const targetCenter = [targetSize / 2, targetSize / 2, targetSize / 2]
    const resampled = new Float32Array(origX * origY * origZ)

    for (let z = 0; z < origZ; z++) {
      for (let y = 0; y < origY; y++) {
        for (let x = 0; x < origX; x++) {
          const offsetX = (x + 0.5) * originalVoxelSize[0] - origCenter[0]
          const offsetY = (y + 0.5) * originalVoxelSize[1] - origCenter[1]
          const offsetZ = (z + 0.5) * originalVoxelSize[2] - origCenter[2]
          const nearX = Math.round((targetCenter[0] + offsetX) - 0.5)
          const nearY = Math.round((targetCenter[1] + offsetY) - 0.5)
          const nearZ = Math.round((targetCenter[2] + offsetZ) - 0.5)
          if (nearX >= 0 && nearX < targetSize && nearY >= 0 && nearY < targetSize && nearZ >= 0 && nearZ < targetSize) {
            resampled[z * origX * origY + y * origX + x] = data[nearZ * targetSize * targetSize + nearY * targetSize + nearX]
          }
        }
      }
    }
    return resampled
  }

  /**
   * Create an NVImage overlay from segmentation label data.
   * Following brainchop's callBackImg approach: clone source volume and replace image data.
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

    if (modelInfo.type === 'parcellation') {
      overlayVolume.colormap = 'freesurfer'
    } else if (modelInfo.type === 'brain-extraction') {
      overlayVolume.colormap = 'red'
    } else {
      overlayVolume.colormap = 'actc'
    }

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

export const brainchopService = new BrainchopService()
