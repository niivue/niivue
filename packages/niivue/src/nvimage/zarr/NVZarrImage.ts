/**
 * NVZarrImage - Integration class for viewing zarr datasets in NiiVue.
 * Creates a virtual NIfTI volume that acts as a window into a larger zarr dataset.
 *
 * Follows the TIFF unified zoom pattern:
 * - Virtual volume size is FIXED (never changes on level switch)
 * - All coordinates are in Level 0 (full resolution) space
 * - Data is scaled to fill the texture at any pyramid level
 * - Smooth zooming with automatic level selection via hysteresis
 */

import { NIFTI1 } from 'nifti-reader-js'
import { mat4 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { ZarrChunkClient, type ZarrPyramidInfo, type ChunkCoord } from './ZarrChunkClient.js'
import { ZarrChunkCache, type TypedArray } from './ZarrChunkCache.js'
import { ZarrViewport, type ZarrViewportState, type VirtualVolumeDimensions } from './ZarrViewport.js'
import { NiiDataType } from '@/nvimage/utils.js'
import { NVImage, type TypedVoxelArray } from '@/nvimage/index.js'

export interface ChunkLoadInfo {
  level: number
  chunksLoaded: number
  chunksTotal: number
}

export interface ZarrLevelChangeInfo {
  level: number
  totalLevels: number
  levelWidth: number
  levelHeight: number
  levelDepth?: number
}

export interface NVZarrImageOptions {
  /** Zarr store URL (e.g., "http://localhost:8090/lightsheet.zarr") */
  storeUrl: string
  /** Maximum dimension for virtual volume (default 256, capped by WebGL limits) */
  maxVolumeSize?: number
  /** Maximum texture size from WebGL (typically 2048 for 3D) */
  maxTextureSize?: number
  /** Chunk cache size (default 500) */
  cacheSize?: number
  /** Callback when chunks are loaded */
  onChunkLoad?: (info: ChunkLoadInfo) => void
  /** Callback when pyramid level changes */
  onLevelChange?: (info: ZarrLevelChangeInfo) => void
}

/**
 * Map zarr dtype string to NIfTI datatype code
 */
function zarrDtypeToNifti(dtype: string): number {
  // Handle zarr v2 dtype strings like "<u2", "|u1", "<f4", etc.
  // Also handle zarr v3 dtype strings like "uint8", "uint16", etc.
  const normalized = dtype.toLowerCase().replace(/[<>|]/g, '')

  if (normalized === 'u1' || normalized === 'uint8') return NiiDataType.DT_UINT8
  if (normalized === 'i1' || normalized === 'int8') return NiiDataType.DT_INT8
  if (normalized === 'u2' || normalized === 'uint16') return NiiDataType.DT_UINT16
  if (normalized === 'i2' || normalized === 'int16') return NiiDataType.DT_INT16
  if (normalized === 'u4' || normalized === 'uint32') return NiiDataType.DT_UINT32
  if (normalized === 'i4' || normalized === 'int32') return NiiDataType.DT_INT32
  if (normalized === 'f4' || normalized === 'float32') return NiiDataType.DT_FLOAT32
  if (normalized === 'f8' || normalized === 'float64') return NiiDataType.DT_FLOAT64

  // Default to uint8 if unknown
  console.warn(`Unknown zarr dtype: ${dtype}, defaulting to uint8`)
  return NiiDataType.DT_UINT8
}

/**
 * Get bytes per voxel for a NIfTI datatype
 */
function getBytesPerVoxel(datatypeCode: number): number {
  switch (datatypeCode) {
    case NiiDataType.DT_UINT8:
    case NiiDataType.DT_INT8:
      return 1
    case NiiDataType.DT_UINT16:
    case NiiDataType.DT_INT16:
      return 2
    case NiiDataType.DT_UINT32:
    case NiiDataType.DT_INT32:
    case NiiDataType.DT_FLOAT32:
      return 4
    case NiiDataType.DT_FLOAT64:
      return 8
    default:
      return 1
  }
}

/**
 * Create a typed array of the appropriate type for a NIfTI datatype.
 * Returns TypedVoxelArray compatible types for NVImage.img.
 * Note: Some zarr types (int8, uint32, int32) are mapped to compatible NIfTI types.
 */
function createTypedVoxelArray(datatypeCode: number, size: number): TypedVoxelArray {
  switch (datatypeCode) {
    case NiiDataType.DT_UINT8:
    case NiiDataType.DT_INT8: // Map int8 to uint8
      return new Uint8Array(size)
    case NiiDataType.DT_UINT16:
      return new Uint16Array(size)
    case NiiDataType.DT_INT16:
    case NiiDataType.DT_INT32: // Map int32 to int16 (may lose precision)
      return new Int16Array(size)
    case NiiDataType.DT_UINT32: // Map uint32 to float32 (maintains precision better)
    case NiiDataType.DT_FLOAT32:
      return new Float32Array(size)
    case NiiDataType.DT_FLOAT64:
      return new Float64Array(size)
    default:
      return new Uint8Array(size)
  }
}

export class NVZarrImage {
  private image: NVImage
  private chunkClient: ZarrChunkClient
  private chunkCache: ZarrChunkCache
  private viewport: ZarrViewport
  private pyramidInfo: ZarrPyramidInfo
  private volumeDims: VirtualVolumeDimensions
  private datatypeCode: number
  private onChunkLoad?: (info: ChunkLoadInfo) => void
  private onLevelChange?: (info: ZarrLevelChangeInfo) => void
  private pendingUpdate: boolean = false

  private constructor() {
    // Private constructor - use static create() method
    this.image = new NVImage()
    this.chunkClient = null as unknown as ZarrChunkClient
    this.chunkCache = null as unknown as ZarrChunkCache
    this.viewport = null as unknown as ZarrViewport
    this.pyramidInfo = null as unknown as ZarrPyramidInfo
    this.volumeDims = { width: 0, height: 0, depth: 0 }
    this.datatypeCode = NiiDataType.DT_UINT8
  }

  /**
   * Factory method to create and initialize NVZarrImage
   */
  static async create(options: NVZarrImageOptions): Promise<NVZarrImage> {
    const instance = new NVZarrImage()

    // Create chunk client
    instance.chunkClient = new ZarrChunkClient({
      baseUrl: options.storeUrl
    })

    // Fetch pyramid info
    instance.pyramidInfo = await instance.chunkClient.fetchInfo()

    // Determine max volume size constraints
    const maxTexSize = options.maxTextureSize ?? 2048
    const maxDim = options.maxVolumeSize ?? 256

    // Create FIXED volume dimensions (never change on level switch)
    // This is the key difference from the old implementation
    instance.volumeDims = {
      width: Math.min(maxDim, maxTexSize),
      height: Math.min(maxDim, maxTexSize),
      depth: Math.min(maxDim, maxTexSize)
    }

    // Create chunk cache
    instance.chunkCache = new ZarrChunkCache(options.cacheSize ?? 500)

    // Create viewport manager with FIXED volume dimensions
    instance.viewport = new ZarrViewport(instance.pyramidInfo, instance.volumeDims)

    // Determine data type from level 0
    const level0 = instance.pyramidInfo.levels[0]
    instance.datatypeCode = zarrDtypeToNifti(level0.dtype)

    // Store callbacks
    instance.onChunkLoad = options.onChunkLoad
    instance.onLevelChange = options.onLevelChange

    // Create the underlying NVImage with FIXED dimensions
    instance.createNVImage()

    // Load initial chunks
    await instance.updateVolume()

    // Notify about initial level
    const state = instance.viewport.getState()
    const dims = instance.viewport.getCurrentLevelDimensions()
    instance.onLevelChange?.({
      level: state.pyramidLevel,
      totalLevels: instance.pyramidInfo.levels.length,
      levelWidth: dims.width,
      levelHeight: dims.height,
      levelDepth: dims.depth
    })

    return instance
  }

  /**
   * Create the underlying NVImage as a 3D volume with FIXED dimensions
   */
  private createNVImage(): void {
    const { width, height, depth } = this.volumeDims
    const bytesPerVoxel = getBytesPerVoxel(this.datatypeCode)

    // Create a NIfTI header for a 3D volume
    const hdr = new NIFTI1()
    hdr.littleEndian = true
    hdr.dims = [3, width, height, depth, 1, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.datatypeCode = this.datatypeCode
    hdr.numBitsPerVoxel = bytesPerVoxel * 8
    hdr.scl_inter = 0
    hdr.scl_slope = 1
    hdr.sform_code = 2
    hdr.magic = 'n+1'
    hdr.vox_offset = 352

    // Create affine to center the volume
    hdr.affine = [
      [1, 0, 0, -width / 2],
      [0, 1, 0, -height / 2],
      [0, 0, 1, -depth / 2],
      [0, 0, 0, 1]
    ]

    // Initialize image
    this.image = new NVImage()
    this.image.name = `zarr:${this.pyramidInfo.name}`
    this.image.id = uuidv4()
    this.image._colormap = 'gray'
    this.image._opacity = 1.0
    this.image.hdr = hdr
    this.image.nFrame4D = 1
    this.image.frame4D = 0
    this.image.nTotalFrame4D = 1
    this.image.nVox3D = width * height * depth
    this.image.dims = [width, height, depth]
    this.image.pixDims = [1, 1, 1]

    // Create image data buffer with appropriate type
    this.image.img = createTypedVoxelArray(this.datatypeCode, width * height * depth)

    // Set up matrices
    this.image.matRAS = mat4.create()
    mat4.identity(this.image.matRAS)
    this.image.toRAS = mat4.create()
    mat4.identity(this.image.toRAS)
    this.image.toRASvox = mat4.create()
    mat4.identity(this.image.toRASvox)

    // Set RAS dimensions
    this.image.dimsRAS = [3, width, height, depth]
    this.image.pixDimsRAS = [1, 1, 1, 1]
    this.image.permRAS = [1, 2, 3]

    // Set frac2mm transform
    const frac2mm = mat4.create()
    frac2mm[0] = width
    frac2mm[5] = height
    frac2mm[10] = depth
    frac2mm[12] = -width / 2
    frac2mm[13] = -height / 2
    frac2mm[14] = -depth / 2
    this.image.frac2mm = frac2mm
    this.image.frac2mmOrtho = mat4.clone(frac2mm)

    this.image.mm2ortho = mat4.create()
    mat4.identity(this.image.mm2ortho)

    // Set ortho extents
    this.image.extentsMinOrtho = [-width / 2, -height / 2, -depth / 2]
    this.image.extentsMaxOrtho = [width / 2, height / 2, depth / 2]

    // Set calibration (will be updated based on actual data)
    this.image.cal_min = 0
    this.image.cal_max = 255
    this.image.robust_min = 0
    this.image.robust_max = 255
    this.image.global_min = 0
    this.image.global_max = 255
  }

  /**
   * Get the underlying NVImage for use with NiiVue
   */
  getNVImage(): NVImage {
    return this.image
  }

  /**
   * Zoom toward a screen point with automatic level selection.
   * This is the main entry point for wheel zoom - mirrors TiffViewport.zoomAt().
   *
   * @param factor - Zoom factor (> 1 = zoom in, < 1 = zoom out)
   * @param screenX - Screen X coordinate (canvas/texture pixels)
   * @param screenY - Screen Y coordinate (canvas/texture pixels)
   * @param screenZ - Screen Z coordinate (optional, for 3D)
   */
  async zoomAt(factor: number, screenX: number, screenY: number, screenZ?: number): Promise<void> {
    // Apply zoom at screen point
    this.viewport.zoomAt(factor, screenX, screenY, screenZ)

    // Auto-select best level with hysteresis
    const currentLevel = this.viewport.getState().pyramidLevel
    const bestLevel = this.viewport.getBestLevelForZoomWithHysteresis(currentLevel)

    if (bestLevel !== currentLevel) {
      this.viewport.setLevel(bestLevel)
      const dims = this.viewport.getCurrentLevelDimensions()
      this.onLevelChange?.({
        level: bestLevel,
        totalLevels: this.pyramidInfo.levels.length,
        levelWidth: dims.width,
        levelHeight: dims.height,
        levelDepth: dims.depth
      })
    }

    // Update volume with new chunks
    await this.updateVolume()
  }

  /**
   * Pan the viewport by screen pixels.
   * @param deltaX - Delta X in screen pixels
   * @param deltaY - Delta Y in screen pixels
   * @param deltaZ - Delta Z in screen pixels (optional)
   */
  async panBy(deltaX: number, deltaY: number, deltaZ: number = 0): Promise<void> {
    this.viewport.pan(deltaX, deltaY, deltaZ)
    await this.updateVolume()
  }

  /**
   * Set the current pyramid level manually
   */
  async setPyramidLevel(level: number): Promise<void> {
    const oldLevel = this.viewport.getState().pyramidLevel
    this.viewport.setLevel(level)

    if (oldLevel !== level) {
      const dims = this.viewport.getCurrentLevelDimensions()
      this.onLevelChange?.({
        level,
        totalLevels: this.pyramidInfo.levels.length,
        levelWidth: dims.width,
        levelHeight: dims.height,
        levelDepth: dims.depth
      })
    }

    await this.updateVolume()
  }

  /**
   * Get current pyramid level
   */
  getPyramidLevel(): number {
    return this.viewport.getState().pyramidLevel
  }

  /**
   * Get pyramid info
   */
  getPyramidInfo(): ZarrPyramidInfo {
    return this.pyramidInfo
  }

  /**
   * Get current viewport state
   */
  getViewportState(): ZarrViewportState {
    return this.viewport.getState()
  }

  /**
   * Set viewport state
   */
  async setViewportState(state: Partial<ZarrViewportState>): Promise<void> {
    const oldLevel = this.viewport.getState().pyramidLevel
    this.viewport.setState(state)

    const newLevel = this.viewport.getState().pyramidLevel
    if (oldLevel !== newLevel) {
      const dims = this.viewport.getCurrentLevelDimensions()
      this.onLevelChange?.({
        level: newLevel,
        totalLevels: this.pyramidInfo.levels.length,
        levelWidth: dims.width,
        levelHeight: dims.height,
        levelDepth: dims.depth
      })
    }

    await this.updateVolume()
  }

  /**
   * Get virtual volume dimensions (FIXED, never changes)
   */
  getVolumeDimensions(): VirtualVolumeDimensions {
    return this.viewport.getVolumeDimensions()
  }

  /**
   * Get the effective scale for coordinate conversions
   */
  getEffectiveScale(): number {
    return this.viewport.getEffectiveScale()
  }

  /**
   * Get the base scale (image fitted to volume)
   */
  getBaseScale(): number {
    return this.viewport.getBaseScale()
  }

  /**
   * Update the virtual volume by fetching and assembling chunks
   */
  private async updateVolume(): Promise<void> {
    // Debounce rapid updates
    if (this.pendingUpdate) {
      return
    }
    this.pendingUpdate = true

    // Wait for next animation frame
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })

    // Clear volume buffer
    this.clearVolumeData()

    // Fetch and assemble visible chunks
    await this.assembleVisibleChunks()

    this.pendingUpdate = false
  }

  /**
   * Clear the volume data buffer
   */
  private clearVolumeData(): void {
    const img = this.image.img as TypedArray
    if (img.fill) {
      img.fill(0)
    } else {
      for (let i = 0; i < img.length; i++) {
        img[i] = 0
      }
    }
  }

  /**
   * Fetch visible chunks and assemble them into the volume
   */
  private async assembleVisibleChunks(): Promise<void> {
    const chunks = this.viewport.getVisibleChunks()
    const level = this.viewport.getState().pyramidLevel
    const name = this.pyramidInfo.name

    // Separate cached and uncached chunks
    const cachedChunks: ChunkCoord[] = []
    const uncachedChunks: ChunkCoord[] = []

    for (const chunk of chunks) {
      const key = ZarrChunkCache.getKey(name, chunk.level, chunk.x, chunk.y, chunk.z)
      if (this.chunkCache.has(key)) {
        cachedChunks.push(chunk)
      } else if (!this.chunkCache.isLoading(key)) {
        uncachedChunks.push(chunk)
      }
    }

    // Assemble cached chunks immediately
    for (const chunk of cachedChunks) {
      const key = ZarrChunkCache.getKey(name, chunk.level, chunk.x, chunk.y, chunk.z)
      const data = this.chunkCache.get(key)
      if (data) {
        this.assembleChunkIntoVolume(chunk, data)
      }
    }

    // Fetch uncached chunks in parallel
    if (uncachedChunks.length > 0) {
      const loadPromises = uncachedChunks.map(async (chunk) => {
        const key = ZarrChunkCache.getKey(name, chunk.level, chunk.x, chunk.y, chunk.z)
        this.chunkCache.startLoading(key)

        const data = await this.chunkClient.fetchChunk(chunk.level, chunk.x, chunk.y, chunk.z)

        this.chunkCache.doneLoading(key)

        if (data) {
          this.chunkCache.set(key, data)
          // Assemble chunk if still at same level
          if (this.viewport.getState().pyramidLevel === chunk.level) {
            this.assembleChunkIntoVolume(chunk, data)
          }
        }
      })

      // Report progress
      let loaded = cachedChunks.length
      const total = chunks.length

      for (const promise of loadPromises) {
        await promise
        loaded++
        this.onChunkLoad?.({
          level,
          chunksLoaded: loaded,
          chunksTotal: total
        })
      }
    } else {
      // All chunks were cached
      this.onChunkLoad?.({
        level,
        chunksLoaded: chunks.length,
        chunksTotal: chunks.length
      })
    }

    // Update calibration based on data
    this.updateCalibration()
  }

  /**
   * Assemble a single chunk into the virtual volume with scaling.
   * Uses the center-based coordinate system where data is scaled
   * to fill the texture based on the current zoom level.
   */
  private assembleChunkIntoVolume(chunk: ChunkCoord, data: TypedArray): void {
    const placement = this.viewport.getChunkPlacement(chunk.x, chunk.y, chunk.z)
    const chunkDims = this.viewport.getCurrentChunkDimensions()
    const { width, height, depth } = this.volumeDims
    const img = this.image.img as TypedArray
    const renderScale = placement.renderScale

    // Skip if nothing to copy
    if (placement.copyWidth <= 0 || placement.copyHeight <= 0 || placement.copyDepth <= 0) {
      return
    }

    // Calculate the destination size after scaling
    const destWidth = Math.ceil(placement.copyWidth * renderScale)
    const destHeight = Math.ceil(placement.copyHeight * renderScale)
    const destDepth = Math.ceil(placement.copyDepth * renderScale)

    // Copy chunk data into volume with scaling
    // Uses nearest-neighbor interpolation for simplicity
    // Zarr chunk layout is typically [Z, Y, X] (row-major)
    // NIfTI layout is [X, Y, Z] (column-major in terms of fastest varying)
    for (let dz = 0; dz < destDepth; dz++) {
      // Map destination Z to source Z
      const sz = Math.min(Math.floor(dz / renderScale), placement.copyDepth - 1)
      const destZ = Math.round(placement.destZ + dz)

      if (destZ < 0 || destZ >= depth) continue

      for (let dy = 0; dy < destHeight; dy++) {
        // Map destination Y to source Y
        const sy = Math.min(Math.floor(dy / renderScale), placement.copyHeight - 1)
        const rawDestY = Math.round(placement.destY + dy)

        // Flip Y-axis: WebGL has Y=0 at bottom, screen has Y=0 at top
        const destY = height - 1 - rawDestY

        if (destY < 0 || destY >= height) continue

        for (let dx = 0; dx < destWidth; dx++) {
          // Map destination X to source X
          const sx = Math.min(Math.floor(dx / renderScale), placement.copyWidth - 1)
          const destX = Math.round(placement.destX + dx)

          if (destX < 0 || destX >= width) continue

          // Source index in chunk (assuming [Z, Y, X] order)
          const srcZ = placement.srcOffsetZ + sz
          const srcY = placement.srcOffsetY + sy
          const srcX = placement.srcOffsetX + sx
          const srcIdx = srcZ * chunkDims.height * chunkDims.width + srcY * chunkDims.width + srcX

          // Destination index in volume (NIfTI is X + Y*width + Z*width*height)
          const dstIdx = destX + destY * width + destZ * width * height

          // Copy value
          if (srcIdx >= 0 && srcIdx < data.length && dstIdx >= 0 && dstIdx < img.length) {
            img[dstIdx] = data[srcIdx]
          }
        }
      }
    }
  }

  /**
   * Update calibration values based on actual data
   */
  private updateCalibration(): void {
    const img = this.image.img as TypedArray
    let min = Infinity
    let max = -Infinity

    // Sample the data to find min/max (don't scan entire volume for performance)
    const step = Math.max(1, Math.floor(img.length / 10000))
    for (let i = 0; i < img.length; i += step) {
      const val = img[i]
      if (val < min) min = val
      if (val > max) max = val
    }

    if (min < Infinity && max > -Infinity) {
      this.image.cal_min = min
      this.image.cal_max = max
      this.image.robust_min = min
      this.image.robust_max = max
      this.image.global_min = min
      this.image.global_max = max
    }
  }

  /**
   * Clear chunk cache
   */
  clearCache(): void {
    this.chunkCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; loading: number } {
    return {
      size: this.chunkCache.size,
      loading: this.chunkCache.loadingCount
    }
  }

  /**
   * Force refresh of the volume (refetch all chunks)
   */
  async refresh(): Promise<void> {
    await this.updateVolume()
  }
}
