/**
 * NVZarrHelper - Simplified zarr chunk management for NVImage.
 *
 * Attaches to a host NVImage and manages chunked loading of OME-Zarr data.
 * No zoom, no prefetching - just pan and level switching.
 * All coordinates are in current-level pixel space.
 *
 * Spatial dimensions are kept in OME metadata order throughout.
 * The mapping to NIfTI layout is:
 *   - OME dim[0] (slowest in C-order) → NIfTI dim 3 (depth, slowest in Fortran-order)
 *   - OME dim[1]                       → NIfTI dim 2 (height)
 *   - OME dim[2] (fastest in C-order)  → NIfTI dim 1 (width, fastest in Fortran-order)
 * This means chunk data can be copied directly without stride remapping.
 * The affine matrix maps NIfTI (i, j, k) indices to physical (x, y, z) space
 * using the OME axis names.
 */

import { NIFTI1 } from 'nifti-reader-js'

import { v4 as uuidv4 } from '@lukeed/uuid'
import { copyAffine } from '../affineUtils'
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
    /** Convert OME spatial units to millimeters for NIfTI compatibility (default: true) */
    convertUnitsToMm?: boolean
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

/**
 * Convert a value from an OME spatial unit to millimeters.
 * Returns the value unchanged if the unit is unrecognized or absent.
 */
function omeUnitToMm(value: number, unit?: string): number {
    if (!unit) {
        return value
    }
    switch (unit.toLowerCase()) {
        case 'micrometer':
        case 'um':
        case 'µm':
            return value / 1000
        case 'nanometer':
        case 'nm':
            return value / 1_000_000
        case 'millimeter':
        case 'mm':
            return value
        case 'centimeter':
        case 'cm':
            return value * 10
        case 'meter':
        case 'm':
            return value * 1000
        default:
            return value
    }
}

export class NVZarrHelper {
    private hostImage: NVImage
    private chunkClient: ZarrChunkClient
    private chunkCache: ZarrChunkCache
    private pyramidInfo: ZarrPyramidInfo
    private datatypeCode: number

    private pyramidLevel: number
    /** Level dimensions in OME metadata order: depth=dim[0], height=dim[1], width=dim[2] */
    private levelDims: { width: number; height: number; depth: number }
    private volumeDims: { width: number; height: number; depth: number }
    private chunkSize: { width: number; height: number; depth: number }

    /** Voxel scales in OME metadata order: depth=dim[0], height=dim[1], width=dim[2] */
    private voxelScales: { width: number; height: number; depth: number }
    /** Voxel translations in OME metadata order */
    private voxelTranslations: { width: number; height: number; depth: number }
    private hasTranslations: boolean
    private convertUnitsToMm: boolean

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
        this.voxelTranslations = { width: 0, height: 0, depth: 0 }
        this.hasTranslations = false
        this.convertUnitsToMm = true
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

        // Check if level 0 (highest resolution) fits within the max volume size.
        // If so, use the actual dimensions directly instead of a virtual volume.
        const level0 = helper.pyramidInfo.levels[0]
        const level0Shape = level0.shape
        const level0FitsInVolume = level0Shape.every((dim) => dim <= maxDim && dim <= maxTexSize)

        if (level0FitsInVolume) {
            // Full dataset fits — use exact dimensions (reversed: depth=dim[0], height=dim[1], width=dim[2])
            if (helper.pyramidInfo.is3D && level0Shape.length >= 3) {
                helper.volumeDims = { depth: level0Shape[0], height: level0Shape[1], width: level0Shape[2] }
            } else {
                helper.volumeDims = { height: level0Shape[0], width: level0Shape[1], depth: 1 }
            }
        } else {
            helper.volumeDims = {
                width: Math.min(maxDim, maxTexSize),
                height: Math.min(maxDim, maxTexSize),
                depth: Math.min(maxDim, maxTexSize)
            }
        }

        helper.datatypeCode = zarrDtypeToNifti(helper.pyramidInfo.levels[0].dtype)
        helper.convertUnitsToMm = options.convertUnitsToMm ?? true

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
        // Map OME spatial dims to NIfTI: dim[0]→depth (slowest), dim[1]→height, dim[2]→width (fastest)
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

        // Extract physical voxel scales from OME coordinateTransformations (in metadata order)
        if (levelInfo.scales) {
            if (this.pyramidInfo.is3D && levelInfo.scales.length >= 3) {
                this.voxelScales = { depth: levelInfo.scales[0], height: levelInfo.scales[1], width: levelInfo.scales[2] }
            } else if (levelInfo.scales.length >= 2) {
                this.voxelScales = { height: levelInfo.scales[0], width: levelInfo.scales[1], depth: 1 }
            }
        } else {
            this.voxelScales = { width: 1, height: 1, depth: 1 }
        }

        // Extract physical voxel translations from OME coordinateTransformations (in metadata order)
        if (levelInfo.translations) {
            if (this.pyramidInfo.is3D && levelInfo.translations.length >= 3) {
                this.voxelTranslations = { depth: levelInfo.translations[0], height: levelInfo.translations[1], width: levelInfo.translations[2] }
            } else if (levelInfo.translations.length >= 2) {
                this.voxelTranslations = { height: levelInfo.translations[0], width: levelInfo.translations[1], depth: 0 }
            }
            this.hasTranslations = true
        } else {
            this.voxelTranslations = { width: 0, height: 0, depth: 0 }
            this.hasTranslations = false
        }
    }

    private configureHostImage(): void {
        const { width, height, depth } = this.volumeDims
        const bytesPerVoxel = getBytesPerVoxel(this.datatypeCode)

        // Get unit-converted scales for pixDims
        const { scaleW, scaleH, scaleD } = this.getConvertedScales()

        const hdr = new NIFTI1()
        hdr.littleEndian = true
        hdr.dims = [3, width, height, depth, 1, 0, 0, 0]
        hdr.pixDims = [1, scaleW, scaleH, scaleD, 1, 0, 0, 0]
        hdr.datatypeCode = this.datatypeCode
        hdr.numBitsPerVoxel = bytesPerVoxel * 8
        hdr.scl_inter = 0
        hdr.scl_slope = 1
        hdr.sform_code = 2
        hdr.magic = 'n+1'
        hdr.vox_offset = 352

        // Placeholder affine — updateAffine() will set the real one
        hdr.affine = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
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
        img.pixDims = [scaleW, scaleH, scaleD]

        img.img = createTypedVoxelArray(this.datatypeCode, width * height * depth)

        // Set the affine based on current center position and call calculateRAS()
        this.updateAffine()

        // Store original affine so resetVolumeAffine() works on zarr volumes
        img.originalAffine = copyAffine(hdr.affine)

        img.cal_min = NaN
        img.cal_max = NaN
        img.robust_min = NaN
        img.robust_max = NaN
        img.global_min = NaN
        img.global_max = NaN
    }

    /** Get unit-converted voxel scales */
    private getConvertedScales(): { scaleW: number; scaleH: number; scaleD: number } {
        const units = this.pyramidInfo.spatialUnits
        let scaleD = this.voxelScales.depth
        let scaleH = this.voxelScales.height
        let scaleW = this.voxelScales.width
        if (this.convertUnitsToMm && units) {
            if (units.length >= 3) {
                scaleD = omeUnitToMm(scaleD, units[0])
                scaleH = omeUnitToMm(scaleH, units[1])
                scaleW = omeUnitToMm(scaleW, units[2])
            } else if (units.length >= 2) {
                scaleH = omeUnitToMm(scaleH, units[0])
                scaleW = omeUnitToMm(scaleW, units[1])
            }
        }
        return { scaleW, scaleH, scaleD }
    }

    /** Get unit-converted voxel translations */
    private getConvertedTranslations(): { transW: number; transH: number; transD: number } {
        const units = this.pyramidInfo.spatialUnits
        let transD = this.voxelTranslations.depth
        let transH = this.voxelTranslations.height
        let transW = this.voxelTranslations.width
        if (this.convertUnitsToMm && units) {
            if (units.length >= 3) {
                transD = omeUnitToMm(transD, units[0])
                transH = omeUnitToMm(transH, units[1])
                transW = omeUnitToMm(transW, units[2])
            } else if (units.length >= 2) {
                transH = omeUnitToMm(transH, units[0])
                transW = omeUnitToMm(transW, units[1])
            }
        }
        return { transW, transH, transD }
    }

    /**
     * Build the NIfTI affine from OME axis names, scales, and translations.
     *
     * NIfTI dimensions map to OME spatial dimensions as:
     *   i (dim 1, width)  = OME spatial[-1] (last, fastest in C-order)
     *   j (dim 2, height) = OME spatial[-2]
     *   k (dim 3, depth)  = OME spatial[-3] (first, slowest in C-order)
     *
     * The affine maps (i, j, k) → physical (x, y, z):
     *   physical_axis = scale * nifti_dim + translation
     * where nifti_dim is the column index (0=i, 1=j, 2=k) and
     * physical_axis row is determined by the OME axis name.
     */
    private updateAffine(): void {
        const hdr = this.hostImage.hdr
        if (!hdr) {
            return
        }

        const { width, height, depth } = this.volumeDims
        const axisNames = this.pyramidInfo.axisMapping.spatialAxisNames

        if (this.hasTranslations && axisNames.length >= 3) {
            const { scaleW, scaleH, scaleD } = this.getConvertedScales()
            const { transW, transH, transD } = this.getConvertedTranslations()

            // Volume window offsets in level coords
            const volStartW = this.centerX - width / 2 // width = last OME dim
            const volStartH = this.centerY - height / 2 // height = middle OME dim
            const volStartD = this.centerZ - depth / 2 // depth = first OME dim

            // Scale + offset for each OME spatial dimension, indexed by NIfTI column:
            //   column 0 (i=width)  → OME dim[-1]: scaleW, transW + volStartW * scaleW
            //   column 1 (j=height) → OME dim[-2]: scaleH, transH + volStartH * scaleH
            //   column 2 (k=depth)  → OME dim[-3]: scaleD, transD + volStartD * scaleD
            const niftiCols = [
                { name: axisNames[axisNames.length - 1], scale: scaleW, trans: transW + volStartW * scaleW },
                { name: axisNames[axisNames.length - 2], scale: scaleH, trans: transH + volStartH * scaleH },
                { name: axisNames[axisNames.length - 3], scale: scaleD, trans: transD + volStartD * scaleD }
            ]

            // Map physical axis name → affine row: x→0, y→1, z→2
            const affine: number[][] = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 1]
            ]
            for (let col = 0; col < 3; col++) {
                const row = niftiCols[col].name === 'x' ? 0 : niftiCols[col].name === 'y' ? 1 : 2
                affine[row][col] = niftiCols[col].scale
                affine[row][3] = niftiCols[col].trans
            }
            hdr.affine = affine
        } else {
            // No OME translations — calculate offset based on pan position
            const { scaleW, scaleH, scaleD } = this.getConvertedScales()

            // Volume window offsets in level coords (same calculation as 3D path)
            const volStartW = this.centerX - width / 2
            const volStartH = this.centerY - height / 2
            const volStartD = this.centerZ - depth / 2

            if (axisNames.length >= 2) {
                // Build affine based on axis names for 2D data
                // NIfTI cols: 0=width (last spatial), 1=height (2nd-to-last), 2=depth
                const niftiCols = [
                    { name: axisNames[axisNames.length - 1], scale: scaleW, trans: volStartW * scaleW },
                    { name: axisNames[axisNames.length - 2], scale: scaleH, trans: volStartH * scaleH },
                    { name: 'z', scale: scaleD, trans: volStartD * scaleD }
                ]

                const affine: number[][] = [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [0, 0, 0, 1]
                ]
                for (let col = 0; col < 3; col++) {
                    const row = niftiCols[col].name === 'x' ? 0 : niftiCols[col].name === 'y' ? 1 : 2
                    affine[row][col] = niftiCols[col].scale
                    affine[row][3] = niftiCols[col].trans
                }
                hdr.affine = affine
            } else {
                // Fallback: simple diagonal affine with pan position
                hdr.affine = [
                    [scaleW, 0, 0, volStartW * scaleW],
                    [0, -scaleH, 0, volStartH * scaleH],
                    [0, 0, -scaleD, volStartD * scaleD],
                    [0, 0, 0, 1]
                ]
            }
        }

        this.hostImage.calculateRAS()

        // Keep originalAffine in sync so resetVolumeAffine() restores the
        // current zarr-computed affine (correct for this level/pan), not the
        // one from initial load.
        this.hostImage.originalAffine = copyAffine(this.hostImage.hdr.affine)
    }

    beginDrag(): void {
        this.centerAtDragStart = { x: this.centerX, y: this.centerY, z: this.centerZ }
    }

    async panBy(dx: number, dy: number, dz: number = 0): Promise<void> {
        this.centerX -= dx
        this.centerY -= dy
        this.centerZ -= dz
        this.clampCenter()
        this.updateAffine()
        await this.updateVolume()
    }

    async panTo(newCenterX: number, newCenterY: number, newCenterZ?: number): Promise<void> {
        this.centerX = newCenterX
        this.centerY = newCenterY
        if (newCenterZ !== undefined) {
            this.centerZ = newCenterZ
        }
        this.clampCenter()
        this.updateAffine()
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
        this.updateAffine()

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

        // Copy chunk data into volume (no scaling - 1:1 pixel mapping).
        // Since spatial indices are kept in OME metadata order (not reordered),
        // the zarr C-order layout naturally aligns with NIfTI Fortran-order:
        //   - dz iterates depth  = OME dim[0] (slowest in both C-order and NIfTI)
        //   - dy iterates height = OME dim[1]
        //   - dx iterates width  = OME dim[2] (fastest in both C-order and NIfTI)
        // srcIdx uses C-order strides based on the actual chunk data dimensions.
        // Edge chunks may be padded (full chunk size) or truncated.
        const fullChunkVol = this.chunkSize.width * this.chunkSize.height * this.chunkSize.depth
        const srcChunkW = data.length >= fullChunkVol ? this.chunkSize.width : actualChunkW
        const srcChunkH = data.length >= fullChunkVol ? this.chunkSize.height : actualChunkH
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
                    const srcIdx = dz * srcChunkH * srcChunkW + dy * srcChunkW + dx
                    const dstIdx = vX + vY * width + vZ * width * height
                    if (srcIdx >= 0 && srcIdx < data.length && dstIdx >= 0 && dstIdx < img.length) {
                        img[dstIdx] = data[srcIdx]
                    }
                }
            }
        }
    }

    private updateCalibration(): void {
        if (this.runningMin < Infinity && this.runningMax > -Infinity) {
            this.hostImage.cal_min = this.runningMin
            this.hostImage.cal_max = this.runningMax
            this.hostImage.robust_min = this.runningMin
            this.hostImage.robust_max = this.runningMax
            this.hostImage.global_min = this.runningMin
            this.hostImage.global_max = this.runningMax
        }
    }

    clearCache(): void {
        this.chunkCache.clear()
    }

    async refresh(): Promise<void> {
        await this.updateVolume()
    }
}
