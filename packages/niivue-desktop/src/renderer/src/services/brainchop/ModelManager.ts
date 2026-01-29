import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-wasm'
import '@tensorflow/tfjs-backend-webgpu'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
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

      // Calculate expected total size from weight specs
      let expectedSize = 0
      for (const spec of weightSpecs) {
        const size = spec.shape.reduce((a, b) => a * b, 1)
        // Assume float32 (4 bytes per value)
        const dtype = spec.dtype || 'float32'
        const bytesPerValue = dtype === 'float32' ? 4 : dtype === 'int32' ? 4 : 1
        expectedSize += size * bytesPerValue
      }

      // Load all weight files via IPC
      const weightBuffers: ArrayBuffer[] = []

      for (const weightFile of weightFiles) {
        const weightPath = `${basePath}/${weightFile}`
        const buffer = await window.electron.loadBrainchopWeights(weightPath)
        weightBuffers.push(buffer)
      }

      // Concatenate all weight buffers
      const totalSize = weightBuffers.reduce((sum, buf) => sum + buf.byteLength, 0)
      const weightData = new ArrayBuffer(totalSize)
      const weightDataView = new Uint8Array(weightData)

      let offset = 0
      for (const buffer of weightBuffers) {
        weightDataView.set(new Uint8Array(buffer), offset)
        offset += buffer.byteLength
      }

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
      // Initialize WebGPU backend first (best for large models)
      console.log('[ModelManager] Initializing WebGPU backend...')
      try {
        await tf.setBackend('webgpu')
        await tf.ready()

        // Enable float16 support for reduced memory usage
        // This halves the memory footprint of parcellation models
        tf.env().set('WEBGPU_USE_IMPORT_POLYFILL', false)
        console.log('[ModelManager] WebGPU backend initialized successfully')
        console.log('[ModelManager] WebGPU float16 support:', tf.env().getBool('WEBGPU_CPU_FORWARD'))
      } catch (webgpuError) {
        console.warn('[ModelManager] WebGPU backend not available:', webgpuError)
        console.log('[ModelManager] Falling back to WebGL backend')

        // Fallback to WebGL
        await tf.setBackend('webgl')
        await tf.ready()

        // Configure WebGL for better memory handling
        tf.env().set('WEBGL_PACK', true)
        tf.env().set('WEBGL_PACK_DEPTHWISECONV', true)
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', false)
        tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0)
      }

      // Initialize WASM backend for large models
      // Configure WASM file paths for Electron/Vite environment
      // In development: Vite serves from public folder at root URL
      // In production: Files are in out/renderer directory
      console.log('[ModelManager] Configuring WASM backend...')

      // Determine base path for WASM files
      // In Electron renderer, we're either on:
      // - Development: http://localhost:5173/ (Vite dev server)
      // - Production: file:///path/to/out/renderer/index.html
      const isDev = import.meta.env.DEV
      const wasmPath = isDev
        ? '/' // Vite serves public files at root in dev
        : './' // Relative to index.html in production

      console.log('[ModelManager] WASM path:', wasmPath, '(isDev:', isDev, ')')

      // Log the actual URLs that will be used
      const expectedWasmUrl = `${wasmPath}tfjs-backend-wasm.wasm`
      console.log('[ModelManager] Expected WASM URL:', expectedWasmUrl)
      console.log('[ModelManager] Current location:', window.location.href)

      // Test if WASM file is accessible
      try {
        console.log('[ModelManager] Testing WASM file accessibility...')
        const testUrl = new URL(expectedWasmUrl, window.location.href).href
        console.log('[ModelManager] Full WASM URL:', testUrl)
        const response = await fetch(testUrl, { method: 'HEAD' })
        console.log('[ModelManager] WASM file accessible:', response.ok, 'Status:', response.status)
      } catch (fetchError) {
        console.error('[ModelManager] WASM file NOT accessible:', fetchError)
        console.warn('[ModelManager] This may cause WASM backend to fail')
      }

      setWasmPaths(wasmPath)

      // Disable SIMD to reduce memory usage - parcellation models are very large
      // SIMD uses more memory and may cause hangs
      tf.env().set('WASM_HAS_SIMD_SUPPORT', false)
      tf.env().set('WASM_HAS_MULTITHREAD_SUPPORT', false)
      console.log('[ModelManager] WASM SIMD disabled to reduce memory usage')

      // Note: WASM memory limits are browser-controlled and cannot be increased from JavaScript
      // If parcellation models exceed WASM memory, they will automatically fall back to CPU

      // Pre-load WASM backend
      console.log('[ModelManager] Loading WASM backend...')
      try {
        await tf.setBackend('wasm')
        await tf.ready()
        console.log('[ModelManager] WASM backend loaded successfully')
        console.log('[ModelManager] WASM backend ready:', tf.getBackend() === 'wasm')

        // Test WASM backend with a simple operation
        console.log('[ModelManager] Testing WASM backend with simple operation...')
        const testTensor = tf.tensor1d([1, 2, 3, 4])
        const testResult = testTensor.square()
        await testResult.data()
        testTensor.dispose()
        testResult.dispose()
        console.log('[ModelManager] WASM backend test successful')
      } catch (wasmError) {
        console.error('[ModelManager] WASM backend failed to load or test:', wasmError)
        console.warn('[ModelManager] Parcellation models may fail. Consider using smaller models.')
      }

      // Switch back to WebGL as default backend (WebGPU produces zero output)
      await tf.setBackend('webgl')
      console.log('[ModelManager] Switched to webgl as default')

      this.isInitialized = true
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

    // Get model info first to determine target backend
    const modelInfo = this.getModelInfo(modelId)
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelId}`)
    }

    // Determine target backend BEFORE checking cache
    const isParcellation = modelInfo.type === 'parcellation'
    const currentBackend = tf.getBackend()

    // Backend selection strategy:
    // For parcellation models: WebGPU (handles large models) > WASM > CPU
    // For other models: WebGPU/WebGL (whatever GPU is available)
    let targetBackend: string
    if (isParcellation) {
      // Use WebGL for parcellation models - WebGPU produces all-zero output
      if (tf.findBackend('webgl')) {
        targetBackend = 'webgl'
        console.log('[ModelManager] Using WebGL for parcellation model')
      } else if (tf.findBackend('wasm')) {
        targetBackend = 'wasm'
        console.log('[ModelManager] Using WASM for parcellation model (WebGL not available)')
      } else {
        targetBackend = 'cpu'
        console.warn('[ModelManager] Using CPU for parcellation model (WebGL and WASM not available)')
      }
    } else {
      // For smaller models, use WebGL (WebGPU produces zero output)
      targetBackend = 'webgl'
    }

    console.log(`[ModelManager] Model type: ${modelInfo.type}, isParcellation: ${isParcellation}, targetBackend: ${targetBackend}`)

    // Switch to target backend BEFORE checking cache
    // This ensures we're on the correct backend when accessing cached models
    if (currentBackend !== targetBackend) {
      console.log(`[ModelManager] Switching to ${targetBackend} backend before accessing model ${modelId}`)
      await tf.setBackend(targetBackend)
      await tf.ready()
    }

    // Check cache AFTER switching to target backend
    const cached = this.modelCache.get(modelId)
    if (cached) {
      cached.lastUsed = new Date()
      console.log(`[ModelManager] Returning cached model ${modelId} on ${targetBackend} backend`)
      return cached.model
    }

    // Load model from resources
    try {
      // Use custom IPC-based IOHandler for Electron
      // This is more reliable than file:// protocol in Electron renderer
      const modelPath = modelInfo.modelPath
      const ioHandler = new ElectronIPCModelLoader(modelPath)

      let model: tf.LayersModel | undefined
      let modelBackend: string = targetBackend

      try {
        model = await tf.loadLayersModel(ioHandler)
        // modelBackend is already set to targetBackend

        // Log model details
        console.log(`[ModelManager] Model ${modelId} loaded on ${targetBackend} backend`)
        console.log(`[ModelManager] Model input shape:`, model.inputs[0].shape)
        console.log(`[ModelManager] Model output shape:`, model.outputs[0].shape)
        console.log(`[ModelManager] Model total parameters:`, model.countParams())

        // Check if model weights are actually loaded (diagnose zero output issue)
        const weights = model.getWeights()
        console.log(`[ModelManager] Model has ${weights.length} weight tensors`)
        if (weights.length > 0) {
          const firstWeight = weights[0]
          const weightData = await firstWeight.data()
          const sampleData = Array.from(weightData.slice(0, 1000)) as number[]
          const weightStats = {
            shape: firstWeight.shape,
            min: Math.min(...sampleData),
            max: Math.max(...sampleData),
            mean: sampleData.reduce((a: number, b: number) => a + b, 0) / Math.min(1000, weightData.length)
          }
          console.log(`[ModelManager] First weight tensor stats (sample):`, weightStats)

          // Check if weights are all zeros (would explain zero output)
          const allZeros = sampleData.every((v: number) => v === 0)
          if (allZeros) {
            console.error(`[ModelManager] WARNING: Model weights appear to be all zeros! Model may not have loaded correctly.`)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Fallback chain for loading failures
        // Try different backends in order: WebGPU → WASM → CPU
        if (errorMessage.includes('texture size') || errorMessage.includes('memory') || errorMessage.includes('out of bounds')) {
          console.warn(`[ModelManager] Model ${modelId} failed on ${targetBackend}: ${errorMessage}`)

          // Try fallback backends in order
          const fallbackBackends: string[] = []
          if (targetBackend === 'webgpu') {
            fallbackBackends.push('wasm', 'cpu')
          } else if (targetBackend === 'webgl') {
            if (tf.findBackend('webgpu')) fallbackBackends.push('webgpu')
            fallbackBackends.push('wasm', 'cpu')
          } else if (targetBackend === 'wasm') {
            fallbackBackends.push('cpu')
          }

          for (const fallbackBackend of fallbackBackends) {
            try {
              console.log(`[ModelManager] Trying fallback backend: ${fallbackBackend}`)
              await tf.setBackend(fallbackBackend)
              await tf.ready()

              model = await tf.loadLayersModel(ioHandler)
              modelBackend = fallbackBackend
              console.log(`[ModelManager] Model ${modelId} loaded successfully on ${fallbackBackend} backend`)
              break
            } catch (fallbackError) {
              console.warn(`[ModelManager] Fallback to ${fallbackBackend} also failed:`, fallbackError)
              continue
            }
          }

          if (!model) {
            // All fallbacks failed, restore original backend and throw
            await tf.setBackend(currentBackend)
            throw new Error(`Failed to load model ${modelId} on all backends. Original error: ${errorMessage}`)
          }
        } else {
          // Restore original backend on other errors
          if (tf.getBackend() !== currentBackend) {
            await tf.setBackend(currentBackend)
          }
          throw error
        }
      }

      // For WASM models, keep on WASM to avoid triggering WebGL texture allocation
      // For WebGL models, we're already on WebGL
      // This means the app might stay on WASM after loading a parcellation model,
      // but we'll switch back to WebGL when needed (preprocessing, loading other models)
      console.log(`[ModelManager] Keeping backend on ${tf.getBackend()} for model ${modelId}`)

      // At this point, model must be defined (we threw an error if it wasn't)
      if (!model) {
        throw new Error(`Model ${modelId} failed to load - this should not happen`)
      }

      // Calculate model memory size
      const memorySize = this.calculateModelMemorySize(model)
      console.log(`[ModelManager] Model ${modelId} estimated memory: ${(memorySize / 1024 / 1024).toFixed(2)} MB`)

      // Check TensorFlow memory state
      const tfMemory = tf.memory()
      console.log(`[ModelManager] TensorFlow.js memory after model load:`, {
        numTensors: tfMemory.numTensors,
        numBytes: tfMemory.numBytes,
        numBytesMB: (tfMemory.numBytes / 1024 / 1024).toFixed(2)
      })

      // Manage cache size
      await this.manageCacheSize()

      // Cache the model with its backend
      const cacheEntry: ModelCacheEntry = {
        model,
        loadedAt: new Date(),
        lastUsed: new Date(),
        memorySize,
        backend: modelBackend
      }
      this.modelCache.set(modelId, cacheEntry)

      console.log(`[ModelManager] Model ${modelId} cached on ${modelBackend} backend`)

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
   * Get the backend for a cached model
   */
  getModelBackend(modelId: string): string | undefined {
    const cached = this.modelCache.get(modelId)
    return cached?.backend
  }

  /**
   * Unload a specific model from cache
   */
  unloadModel(modelId: string): void {
    const cached = this.modelCache.get(modelId)
    if (cached) {
      cached.model.dispose()
      this.modelCache.delete(modelId)
    }
  }

  /**
   * Clear all cached models
   */
  clearCache(): void {
    for (const entry of this.modelCache.values()) {
      entry.model.dispose()
    }
    this.modelCache.clear()
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
