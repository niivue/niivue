/**
 * NVZarrHelper - Simplified zarr chunk management for NVImage.
 *
 * Attaches to a host NVImage and manages chunked loading of OME-Zarr data.
 * No zoom, no prefetching - just pan and level switching.
 * All coordinates are in current-level pixel space.
 */

import { NIFTI1 } from 'nifti-reader-js'

import { v4 as uuidv4 } from '@lukeed/uuid'
import { ZarrChunkClient, type ZarrPyramidInfo, type ChunkCoord } from './ZarrChunkClient.js'
import { ZarrChunkCache, type TypedArray } from './ZarrChunkCache.js'
import { NiiDataType } from '@/nvimage/utils.js'
import type { NVImage, TypedVoxelArray } from '@/nvimage/index.js'

export interface NVZarrHelperOptions {
    url: string
    level: number
    maxVolumeSize?: number
    maxTextureSize?: number
    channel?: number
    cacheSize?: number
}

/**
 * Map zarr dtype string to NIfTI datatype code
 */
function zarrDtypeToNifti(dtype: string): number {
    const normalized = dtype.toLowerCase().replace(/[<>|]/g, '')
    if (normalized === 'u1' || normalized === 'uint8') {
        return NiiDataType.DT_UINT8
    }
    if (normalized === 'i1' || normalized === 'int8') {
        return NiiDataType.DT_INT8
    }
    if (normalized === 'u2' || normalized === 'uint16') {
        return NiiDataType.DT_UINT16
    }
    if (normalized === 'i2' || normalized === 'int16') {
        return NiiDataType.DT_INT16
    }
    if (normalized === 'u4' || normalized === 'uint32') {
        return NiiDataType.DT_UINT32
    }
    if (normalized === 'i4' || normalized === 'int32') {
        return NiiDataType.DT_INT32
    }
    if (normalized === 'f4' || normalized === 'float32') {
        return NiiDataType.DT_FLOAT32
    }
    if (normalized === 'f8' || normalized === 'float64') {
        return NiiDataType.DT_FLOAT64
    }
    console.warn(`Unknown zarr dtype: ${dtype}, defaulting to uint8`)
    return NiiDataType.DT_UINT8
}

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

function createTypedVoxelArray(datatypeCode: number, size: number): TypedVoxelArray {
    switch (datatypeCode) {
        case NiiDataType.DT_UINT8:
        case NiiDataType.DT_INT8:
            return new Uint8Array(size)
        case NiiDataType.DT_UINT16:
            return new Uint16Array(size)
        case NiiDataType.DT_INT16:
        case NiiDataType.DT_INT32:
            return new Int16Array(size)
        case NiiDataType.DT_UINT32:
        case NiiDataType.DT_FLOAT32:
            return new Float32Array(size)
        case NiiDataType.DT_FLOAT64:
            return new Float64Array(size)
        default:
            return new Uint8Array(size)
    }
}

export class NVZarrHelper {
    private hostImage: NVImage
    private chunkClient: ZarrChunkClient
    private chunkCache: ZarrChunkCache
    private pyramidInfo: ZarrPyramidInfo
    private datatypeCode: number

    private pyramidLevel: number
    private levelDims: { width: number; height: number; depth: number }
    private volumeDims: { width: number; height: number; depth: number }
    private chunkSize: { width: number; height: number; depth: number }

    private voxelScales: { width: number; height: number; depth: number }

    private centerX: number
    private centerY: number
    private centerZ: number

    private channel: number
    private nonSpatialCoords: Record<string, number> = {}

    private isUpdating = false
    private needsUpdate = false
    private currentAbortController: AbortController | null = null
    private runningMin = Infinity
    private runningMax = -Infinity

    centerAtDragStart: { x: number; y: number; z: number } | null = null

    onChunksUpdated?: () => void

    private constructor(hostImage: NVImage) {
        this.hostImage = hostImage
        this.chunkClient = null as unknown as ZarrChunkClient
        this.chunkCache = null as unknown as ZarrChunkCache
        this.pyramidInfo = null as unknown as ZarrPyramidInfo
        this.datatypeCode = NiiDataType.DT_UINT8
        this.pyramidLevel = 0
        this.levelDims = { width: 0, height: 0, depth: 0 }
        this.volumeDims = { width: 0, height: 0, depth: 0 }
        this.chunkSize = { width: 0, height: 0, depth: 0 }
        this.voxelScales = { width: 1, height: 1, depth: 1 }
        this.centerX = 0
        this.centerY = 0
        this.centerZ = 0
        this.channel = 0
    }

    static async create(hostImage: NVImage, url: string, options: NVZarrHelperOptions): Promise<NVZarrHelper> {
        const helper = new NVZarrHelper(hostImage)

        helper.chunkClient = new ZarrChunkClient({ baseUrl: url })
        helper.pyramidInfo = await helper.chunkClient.fetchInfo()
        helper.chunkCache = new ZarrChunkCache(options.cacheSize ?? 500)

        const maxTexSize = options.maxTextureSize ?? 2048
        const maxDim = options.maxVolumeSize ?? 256
        helper.volumeDims = {
            width: Math.min(maxDim, maxTexSize),
            height: Math.min(maxDim, maxTexSize),
            depth: Math.min(maxDim, maxTexSize)
        }

        helper.datatypeCode = zarrDtypeToNifti(helper.pyramidInfo.levels[0].dtype)

        helper.channel = options.channel ?? 0
        const axisMapping = helper.pyramidInfo.axisMapping
        for (const nsa of axisMapping.nonSpatialAxes) {
            if (nsa.name === 'c') {
                helper.nonSpatialCoords[nsa.name] = helper.channel
            }
        }

        // Set pyramid level
        const level = Math.max(0, Math.min(options.level, helper.pyramidInfo.levels.length - 1))
        helper.pyramidLevel = level
        helper.updateLevelInfo()

        // Center on the level
        helper.centerX = helper.levelDims.width / 2
        helper.centerY = helper.levelDims.height / 2
        helper.centerZ = helper.levelDims.depth / 2

        // Configure the host NVImage
        helper.configureHostImage()

        // Load initial chunks
        await helper.updateVolume()

        return helper
    }

    private updateLevelInfo(): void {
        const levelInfo = this.pyramidInfo.levels[this.pyramidLevel]
        const shape = levelInfo.shape
        if (this.pyramidInfo.is3D && shape.length >= 3) {
            this.levelDims = { depth: shape[0], height: shape[1], width: shape[2] }
        } else {
            this.levelDims = { height: shape[0], width: shape[1], depth: 1 }
        }

        const chunks = levelInfo.chunks
        if (this.pyramidInfo.is3D && chunks.length >= 3) {
            this.chunkSize = { depth: chunks[0], height: chunks[1], width: chunks[2] }
        } else {
            this.chunkSize = { height: chunks[0], width: chunks[1], depth: 1 }
        }

        // Extract physical voxel scales from OME coordinateTransformations
        // scales are in [Z, Y, X] or [Y, X] order (matching spatial shape order)
        if (levelInfo.scales) {
            if (this.pyramidInfo.is3D && levelInfo.scales.length >= 3) {
                this.voxelScales = { depth: levelInfo.scales[0], height: levelInfo.scales[1], width: levelInfo.scales[2] }
            } else if (levelInfo.scales.length >= 2) {
                this.voxelScales = { height: levelInfo.scales[0], width: levelInfo.scales[1], depth: 1 }
            }
        } else {
            this.voxelScales = { width: 1, height: 1, depth: 1 }
        }
    }

    private configureHostImage(): void {
        const { width, height, depth } = this.volumeDims
        const bytesPerVoxel = getBytesPerVoxel(this.datatypeCode)

        // Use physical voxel scales from OME coordinateTransformations (default 1.0)
        const sx = this.voxelScales.width
        const sy = this.voxelScales.height
        const sz = this.voxelScales.depth

        const hdr = new NIFTI1()
        hdr.littleEndian = true
        hdr.dims = [3, width, height, depth, 1, 0, 0, 0]
        hdr.pixDims = [1, sx, sy, sz, 1, 0, 0, 0]
        hdr.datatypeCode = this.datatypeCode
        hdr.numBitsPerVoxel = bytesPerVoxel * 8
        hdr.scl_inter = 0
        hdr.scl_slope = 1
        hdr.sform_code = 2
        hdr.magic = 'n+1'
        hdr.vox_offset = 352

        // Build affine with physical scales and Y/Z negation
        // Consistent with the non-chunked zarr path (ImageReaders/zarr.ts)
        hdr.affine = [
            [sx, 0, 0, -(width - 2) * 0.5 * sx],
            [0, -sy, 0, (height - 2) * 0.5 * sy],
            [0, 0, -sz, (depth - 2) * 0.5 * sz],
            [0, 0, 0, 1]
        ]

        const img = this.hostImage
        img.name = `zarr:${this.pyramidInfo.name}`
        img.id = uuidv4()
        img._colormap = 'gray'
        img._opacity = 1.0
        img.hdr = hdr
        img.nFrame4D = 1
        img.frame4D = 0
        img.nTotalFrame4D = 1
        img.nVox3D = width * height * depth
        img.dims = [width, height, depth]
        img.pixDims = [sx, sy, sz]

        img.img = createTypedVoxelArray(this.datatypeCode, width * height * depth)

        // Use the standard NIfTI orientation pipeline to derive all coordinate
        // matrices (matRAS, toRAS, toRASvox, frac2mm, frac2mmOrtho, extents, etc.)
        // from the affine. This ensures crosshair positioning is consistent between
        // 2D slices and the 3D render.
        img.calculateRAS()

        img.cal_min = 0
        img.cal_max = 255
        img.robust_min = 0
        img.robust_max = 255
        img.global_min = 0
        img.global_max = 255
    }

    beginDrag(): void {
        this.centerAtDragStart = { x: this.centerX, y: this.centerY, z: this.centerZ }
    }

    async panBy(dx: number, dy: number, dz: number = 0): Promise<void> {
        this.centerX -= dx
        this.centerY -= dy
        this.centerZ -= dz
        this.clampCenter()
        await this.updateVolume()
    }

    async panTo(newCenterX: number, newCenterY: number, newCenterZ?: number): Promise<void> {
        this.centerX = newCenterX
        this.centerY = newCenterY
        if (newCenterZ !== undefined) {
            this.centerZ = newCenterZ
        }
        this.clampCenter()
        await this.updateVolume()
    }

    async setPyramidLevel(level: number): Promise<void> {
        const newLevel = Math.max(0, Math.min(this.pyramidInfo.levels.length - 1, level))
        if (newLevel === this.pyramidLevel) {
            return
        }

        // Convert center from old level coords to new level coords
        const oldDims = this.levelDims
        this.pyramidLevel = newLevel
        this.updateLevelInfo()
        const newDims = this.levelDims

        this.centerX = (this.centerX / oldDims.width) * newDims.width
        this.centerY = (this.centerY / oldDims.height) * newDims.height
        this.centerZ = (this.centerZ / oldDims.depth) * newDims.depth
        this.clampCenter()

        await this.updateVolume()
    }

    getViewportState(): { centerX: number; centerY: number; centerZ: number; level: number } {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            centerZ: this.centerZ,
            level: this.pyramidLevel
        }
    }

    getPyramidInfo(): ZarrPyramidInfo {
        return this.pyramidInfo
    }

    getPyramidLevel(): number {
        return this.pyramidLevel
    }

    getLevelDims(): { width: number; height: number; depth: number } {
        return { ...this.levelDims }
    }

    getVolumeDims(): { width: number; height: number; depth: number } {
        return { ...this.volumeDims }
    }

    private clampCenter(): void {
        const halfW = this.volumeDims.width / 2
        const halfH = this.volumeDims.height / 2
        const halfD = this.volumeDims.depth / 2

        this.centerX = Math.max(-halfW, Math.min(this.levelDims.width + halfW, this.centerX))
        this.centerY = Math.max(-halfH, Math.min(this.levelDims.height + halfH, this.centerY))
        this.centerZ = Math.max(-halfD, Math.min(this.levelDims.depth + halfD, this.centerZ))
    }

    private getVisibleChunks(): ChunkCoord[] {
        const MAX_CHUNKS = 1000
        const { width, height, depth } = this.volumeDims
        const level = this.pyramidLevel

        // Visible region in level coords
        const minX = Math.max(0, Math.floor(this.centerX - width / 2))
        const maxX = Math.min(this.levelDims.width, Math.ceil(this.centerX + width / 2))
        const minY = Math.max(0, Math.floor(this.centerY - height / 2))
        const maxY = Math.min(this.levelDims.height, Math.ceil(this.centerY + height / 2))
        const minZ = Math.max(0, Math.floor(this.centerZ - depth / 2))
        const maxZ = Math.min(this.levelDims.depth, Math.ceil(this.centerZ + depth / 2))

        const startCX = Math.max(0, Math.floor(minX / this.chunkSize.width))
        const startCY = Math.max(0, Math.floor(minY / this.chunkSize.height))
        const startCZ = Math.max(0, Math.floor(minZ / this.chunkSize.depth))
        const endCX = Math.min(Math.ceil(this.levelDims.width / this.chunkSize.width), Math.ceil(maxX / this.chunkSize.width))
        const endCY = Math.min(Math.ceil(this.levelDims.height / this.chunkSize.height), Math.ceil(maxY / this.chunkSize.height))
        const endCZ = Math.min(Math.ceil(this.levelDims.depth / this.chunkSize.depth), Math.ceil(maxZ / this.chunkSize.depth))

        const chunks: ChunkCoord[] = []
        for (let z = startCZ; z < endCZ; z++) {
            for (let y = startCY; y < endCY; y++) {
                for (let x = startCX; x < endCX; x++) {
                    if (this.pyramidInfo.is3D) {
                        chunks.push({ level, x, y, z })
                    } else {
                        chunks.push({ level, x, y })
                    }
                    if (chunks.length >= MAX_CHUNKS) {
                        break
                    }
                }
                if (chunks.length >= MAX_CHUNKS) {
                    break
                }
            }
            if (chunks.length >= MAX_CHUNKS) {
                break
            }
        }

        // Sort by distance from center chunk (closest first)
        const centerCX = (startCX + endCX) / 2
        const centerCY = (startCY + endCY) / 2
        const centerCZ = (startCZ + endCZ) / 2
        chunks.sort((a, b) => {
            const distA = (a.x - centerCX) ** 2 + (a.y - centerCY) ** 2 + ((a.z ?? 0) - centerCZ) ** 2
            const distB = (b.x - centerCX) ** 2 + (b.y - centerCY) ** 2 + ((b.z ?? 0) - centerCZ) ** 2
            return distA - distB
        })

        return chunks
    }

    private async updateVolume(): Promise<void> {
        if (this.isUpdating) {
            this.needsUpdate = true
            this.currentAbortController?.abort()
            return
        }

        this.isUpdating = true
        try {
            do {
                this.needsUpdate = false
                this.currentAbortController?.abort()
                const abortController = new AbortController()
                this.currentAbortController = abortController

                this.runningMin = Infinity
                this.runningMax = -Infinity

                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => resolve())
                })

                if (this.needsUpdate) {
                    continue
                }

                this.clearVolumeData()
                await this.assembleVisibleChunks(abortController.signal)
            } while (this.needsUpdate)
        } finally {
            this.isUpdating = false
        }
    }

    private clearVolumeData(): void {
        const img = this.hostImage.img as TypedArray
        if (img.fill) {
            img.fill(0)
        } else {
            for (let i = 0; i < img.length; i++) {
                img[i] = 0
            }
        }
    }

    private async assembleVisibleChunks(signal?: AbortSignal): Promise<void> {
        const chunks = this.getVisibleChunks()
        const name = this.pyramidInfo.name
        const level = this.pyramidLevel

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

        // Phase 1: assemble cached chunks synchronously
        for (const chunk of cachedChunks) {
            const key = ZarrChunkCache.getKey(name, chunk.level, chunk.x, chunk.y, chunk.z)
            const data = this.chunkCache.get(key)
            if (data) {
                this.assembleChunkIntoVolume(chunk, data)
            }
        }

        if (cachedChunks.length > 0) {
            this.updateCalibration()
            this.onChunksUpdated?.()
        }

        // Phase 2: fetch uncached chunks with progressive rendering
        if (uncachedChunks.length > 0) {
            const fetchPromises = uncachedChunks.map(async (chunk) => {
                const key = ZarrChunkCache.getKey(name, chunk.level, chunk.x, chunk.y, chunk.z)
                this.chunkCache.startLoading(key)

                try {
                    const data = await this.chunkClient.fetchChunk(chunk.level, chunk.x, chunk.y, chunk.z, this.nonSpatialCoords, signal)
                    this.chunkCache.doneLoading(key)

                    if (signal?.aborted) {
                        return
                    }

                    if (data) {
                        this.chunkCache.set(key, data)
                        if (this.pyramidLevel === level) {
                            this.assembleChunkIntoVolume(chunk, data)
                            this.updateCalibration()
                            this.onChunksUpdated?.()
                        }
                    }
                } catch (err: unknown) {
                    this.chunkCache.doneLoading(key)
                    if (err instanceof DOMException && err.name === 'AbortError') {
                        return
                    }
                    console.warn(`Failed to fetch chunk ${key}:`, err)
                }
            })

            await Promise.all(fetchPromises)
        }
    }

    private assembleChunkIntoVolume(chunk: ChunkCoord, data: TypedArray): void {
        const { width, height, depth } = this.volumeDims
        const img = this.hostImage.img as TypedArray

        // Chunk pixel position in level coords
        const chunkStartX = chunk.x * this.chunkSize.width
        const chunkStartY = chunk.y * this.chunkSize.height
        const chunkStartZ = (chunk.z ?? 0) * this.chunkSize.depth

        // Volume starts at center - volumeDims/2
        const volStartX = this.centerX - width / 2
        const volStartY = this.centerY - height / 2
        const volStartZ = this.centerZ - depth / 2

        // Destination in volume texture
        const destX = Math.round(chunkStartX - volStartX)
        const destY = Math.round(chunkStartY - volStartY)
        const destZ = Math.round(chunkStartZ - volStartZ)

        // Actual chunk size (may be smaller at edges)
        const actualChunkW = Math.min(this.chunkSize.width, this.levelDims.width - chunkStartX)
        const actualChunkH = Math.min(this.chunkSize.height, this.levelDims.height - chunkStartY)
        const actualChunkD = Math.min(this.chunkSize.depth, this.levelDims.depth - chunkStartZ)

        if (actualChunkW <= 0 || actualChunkH <= 0 || actualChunkD <= 0) {
            return
        }

        // Track min/max for calibration
        const step = Math.max(1, Math.floor(data.length / 2000))
        for (let i = 0; i < data.length; i += step) {
            const val = data[i]
            if (val < this.runningMin) {
                this.runningMin = val
            }
            if (val > this.runningMax) {
                this.runningMax = val
            }
        }

        // Copy chunk data into volume (no scaling - 1:1 pixel mapping)
        // Zarr chunk layout: [Z, Y, X], NIfTI: X + Y*width + Z*width*height
        for (let dz = 0; dz < actualChunkD; dz++) {
            const vZ = destZ + dz
            if (vZ < 0 || vZ >= depth) {
                continue
            }
            for (let dy = 0; dy < actualChunkH; dy++) {
                const vY = destY + dy
                if (vY < 0 || vY >= height) {
                    continue
                }
                for (let dx = 0; dx < actualChunkW; dx++) {
                    const vX = destX + dx
                    if (vX < 0 || vX >= width) {
                        continue
                    }
                    const srcIdx = dz * this.chunkSize.height * this.chunkSize.width + dy * this.chunkSize.width + dx
                    const dstIdx = vX + vY * width + vZ * width * height
                    if (srcIdx >= 0 && srcIdx < data.length && dstIdx >= 0 && dstIdx < img.length) {
                        img[dstIdx] = data[srcIdx]
                    }
                }
            }
        }
    }

    private updateCalibration(): void {
        // if (this.runningMin < Infinity && this.runningMax > -Infinity) {
        //     this.hostImage.cal_min = this.runningMin
        //     this.hostImage.cal_max = this.runningMax
        //     this.hostImage.robust_min = this.runningMin
        //     this.hostImage.robust_max = this.runningMax
        //     this.hostImage.global_min = this.runningMin
        //     this.hostImage.global_max = this.runningMax
        // }
    }

    clearCache(): void {
        this.chunkCache.clear()
    }

    async refresh(): Promise<void> {
        await this.updateVolume()
    }
}
