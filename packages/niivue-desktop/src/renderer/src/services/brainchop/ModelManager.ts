import * as tf from '@tensorflow/tfjs'
import type { ModelInfo, ModelCacheEntry } from './types.js'
import modelsRegistry from './models/models.json' assert { type: 'json' }

/**
 * Custom IOHandler for loading TensorFlow.js models via Electron IPC
 * This is necessary because file:// protocol doesn't work reliably in Electron renderer
 */
class ElectronIPCModelLoader implements tf.io.IOHandler {
  private modelPath: string

  constructor(modelPath: string) {
    this.modelPath = modelPath
  }

  async load(): Promise<tf.io.ModelArtifacts> {
    try {
      // Load model.json via IPC
      const { modelJson, basePath } = await window.electron.loadBrainchopModel(this.modelPath)

      console.log('[ElectronIPCModelLoader] Model JSON loaded')
      console.log('[ElectronIPCModelLoader] Base path:', basePath)
      console.log('[ElectronIPCModelLoader] Weights manifest:', JSON.stringify(modelJson.weightsManifest, null, 2))

      // Extract weight specs and paths from model.json
      const weightsManifest = modelJson.weightsManifest
      if (!weightsManifest || weightsManifest.length === 0) {
        throw new Error('No weightsManifest found in model.json')
      }

      // Collect all weight specs
      const weightSpecs: tf.io.WeightsManifestEntry[] = []
      const weightFiles: string[] = []

      for (const group of weightsManifest) {
        if (group.weights) {
          weightSpecs.push(...group.weights)
        }
        if (group.paths) {
          weightFiles.push(...group.paths)
        }
      }

      console.log('[ElectronIPCModelLoader] Weight specs count:', weightSpecs.length)
      console.log('[ElectronIPCModelLoader] Weight files to load:', weightFiles)

      // Calculate expected total size from weight specs
      let expectedSize = 0
      for (const spec of weightSpecs) {
        const size = spec.shape.reduce((a, b) => a * b, 1)
        // Assume float32 (4 bytes per value)
        const dtype = spec.dtype || 'float32'
        const bytesPerValue = dtype === 'float32' ? 4 : dtype === 'int32' ? 4 : 1
        expectedSize += size * bytesPerValue
      }
      console.log('[ElectronIPCModelLoader] Expected weight data size:', expectedSize, 'bytes')

      // Load all weight files via IPC
      const weightBuffers: ArrayBuffer[] = []

      for (const weightFile of weightFiles) {
        const weightPath = `${basePath}/${weightFile}`
        console.log('[ElectronIPCModelLoader] Loading weight file:', weightPath)
        const buffer = await window.electron.loadBrainchopWeights(weightPath)
        console.log('[ElectronIPCModelLoader] Loaded buffer size:', buffer.byteLength, 'bytes')
        weightBuffers.push(buffer)
      }

      // Concatenate all weight buffers
      const totalSize = weightBuffers.reduce((sum, buf) => sum + buf.byteLength, 0)
      console.log('[ElectronIPCModelLoader] Total actual size:', totalSize, 'bytes')
      console.log('[ElectronIPCModelLoader] Size match:', totalSize === expectedSize ? 'YES' : `NO (expected ${expectedSize}, got ${totalSize})`)

      const weightData = new ArrayBuffer(totalSize)
      const weightDataView = new Uint8Array(weightData)

      let offset = 0
      for (const buffer of weightBuffers) {
        weightDataView.set(new Uint8Array(buffer), offset)
        offset += buffer.byteLength
      }

      console.log('[ElectronIPCModelLoader] Weight data concatenated successfully')

      // Return model artifacts
      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
        userDefinedMetadata: modelJson.userDefinedMetadata,
        trainingConfig: modelJson.trainingConfig
      }
    } catch (error) {
      console.error('[ElectronIPCModelLoader] Failed to load model:', error)
      throw error
    }
  }
}

/**
 * Manages loading, caching, and lifecycle of TensorFlow.js models
 */
export class ModelManager {
  private modelCache: Map<string, ModelCacheEntry> = new Map()
  private readonly maxCacheSize = 2 // Maximum number of models to keep in memory
  private isInitialized = false

  /**
   * Initialize the ModelManager and TensorFlow.js backend
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Set TensorFlow.js backend to WebGL for GPU acceleration
      await tf.setBackend('webgl')
      await tf.ready()

      // Enable memory growth to avoid OOM issues
      const backend = tf.backend() as any
      if (backend && backend.numDataIds) {
        console.log(`TensorFlow.js initialized with ${backend.numDataIds()} tensors`)
      }

      this.isInitialized = true
      console.log('ModelManager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error)
      throw new Error(`ModelManager initialization failed: ${error}`)
    }
  }

  /**
   * Get all available models from the registry
   */
  getAvailableModels(): ModelInfo[] {
    return modelsRegistry.models as ModelInfo[]
  }

  /**
   * Get model information by ID
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return modelsRegistry.models.find(model => model.id === modelId) as ModelInfo | undefined
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: string): ModelInfo[] {
    return modelsRegistry.models.filter(model => model.category === category) as ModelInfo[]
  }

  /**
   * Get models by type
   */
  getModelsByType(type: string): ModelInfo[] {
    return modelsRegistry.models.filter(model => model.type === type) as ModelInfo[]
  }

  /**
   * Load a model by ID. Returns cached model if available.
   */
  async loadModel(modelId: string): Promise<tf.LayersModel> {
    if (!this.isInitialized) {
      throw new Error('ModelManager not initialized. Call initialize() first.')
    }

    // Check cache first
    const cached = this.modelCache.get(modelId)
    if (cached) {
      cached.lastUsed = new Date()
      console.log(`Returning cached model: ${modelId}`)
      return cached.model
    }

    // Get model info
    const modelInfo = this.getModelInfo(modelId)
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelId}`)
    }

    // Load model from resources
    console.log(`Loading model: ${modelId} from ${modelInfo.modelPath}`)

    try {
      // Use custom IPC-based IOHandler for Electron
      // This is more reliable than file:// protocol in Electron renderer
      const modelPath = modelInfo.modelPath
      console.log(`Loading model via IPC: ${modelPath}`)

      const ioHandler = new ElectronIPCModelLoader(modelPath)
      const model = await tf.loadLayersModel(ioHandler)

      // Calculate model memory size
      const memorySize = this.calculateModelMemorySize(model)

      // Manage cache size
      await this.manageCacheSize()

      // Cache the model
      const cacheEntry: ModelCacheEntry = {
        model,
        loadedAt: new Date(),
        lastUsed: new Date(),
        memorySize
      }
      this.modelCache.set(modelId, cacheEntry)

      console.log(`Model ${modelId} loaded successfully (${(memorySize / 1024 / 1024).toFixed(2)} MB)`)
      return model
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error)
      throw new Error(`Failed to load model ${modelId}: ${error}`)
    }
  }

  /**
   * Preload a model into cache
   */
  async preloadModel(modelId: string): Promise<void> {
    await this.loadModel(modelId)
  }

  /**
   * Unload a specific model from cache
   */
  unloadModel(modelId: string): void {
    const cached = this.modelCache.get(modelId)
    if (cached) {
      cached.model.dispose()
      this.modelCache.delete(modelId)
      console.log(`Model ${modelId} unloaded from cache`)
    }
  }

  /**
   * Clear all cached models
   */
  clearCache(): void {
    for (const [modelId, entry] of this.modelCache.entries()) {
      entry.model.dispose()
      console.log(`Disposed model: ${modelId}`)
    }
    this.modelCache.clear()
    console.log('Model cache cleared')
  }

  /**
   * Get current memory usage of cached models
   */
  getCacheMemoryUsage(): number {
    let totalMemory = 0
    for (const entry of this.modelCache.values()) {
      totalMemory += entry.memorySize
    }
    return totalMemory
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    modelCount: number
    totalMemoryMB: number
    models: Array<{ id: string; memoryMB: number; loadedAt: Date; lastUsed: Date }>
  } {
    const models: Array<{ id: string; memoryMB: number; loadedAt: Date; lastUsed: Date }> = []

    for (const [modelId, entry] of this.modelCache.entries()) {
      models.push({
        id: modelId,
        memoryMB: entry.memorySize / 1024 / 1024,
        loadedAt: entry.loadedAt,
        lastUsed: entry.lastUsed
      })
    }

    return {
      modelCount: this.modelCache.size,
      totalMemoryMB: this.getCacheMemoryUsage() / 1024 / 1024,
      models
    }
  }

  /**
   * Get TensorFlow.js memory info
   */
  getTensorFlowMemoryInfo(): tf.MemoryInfo {
    return tf.memory()
  }

  /**
   * Dispose all resources and cleanup
   */
  dispose(): void {
    this.clearCache()
    this.isInitialized = false
    console.log('ModelManager disposed')
  }

  /**
   * Manage cache size by removing least recently used models
   */
  private async manageCacheSize(): Promise<void> {
    if (this.modelCache.size < this.maxCacheSize) {
      return
    }

    // Find least recently used model
    let oldestTime = new Date()
    let oldestModelId: string | null = null

    for (const [modelId, entry] of this.modelCache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestModelId = modelId
      }
    }

    // Remove oldest model
    if (oldestModelId) {
      console.log(`Cache full, removing least recently used model: ${oldestModelId}`)
      this.unloadModel(oldestModelId)
    }
  }

  /**
   * Calculate model memory size in bytes
   */
  private calculateModelMemorySize(model: tf.LayersModel): number {
    let totalParams = 0
    for (const weight of model.weights) {
      const shape = weight.shape
      // Filter out null values and calculate size
      const size = shape.filter((dim): dim is number => dim !== null).reduce((acc: number, dim: number) => acc * dim, 1)
      totalParams += size
    }
    // Assume 4 bytes per parameter (float32)
    return totalParams * 4
  }

}

// Export singleton instance
export const modelManager = new ModelManager()
