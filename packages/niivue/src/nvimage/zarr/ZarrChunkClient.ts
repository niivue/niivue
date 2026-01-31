/**
 * ZarrChunkClient - HTTP client for fetching zarr array data using zarrita.js.
 *
 * Handles pyramid discovery and chunk fetching for OME-ZARR and regular zarr stores.
 */

import * as zarr from 'zarrita'
import type { TypedArray } from './ZarrChunkCache.js'

export interface ZarrChunkClientConfig {
    /** Base URL for zarr store (e.g., "http://localhost:8090/lightsheet.zarr") */
    baseUrl: string
}

export interface ZarrPyramidLevel {
    /** Level index (0 = highest resolution) */
    index: number
    /** Path to this level in the zarr hierarchy (e.g., "/0", "/1") */
    path: string
    /** Spatial-only shape in [Z, Y, X] or [Y, X] order (non-spatial dims stripped) */
    shape: number[]
    /** Spatial-only chunk dimensions matching shape order */
    chunks: number[]
    /** Data type (e.g., "uint8", "uint16", "float32") */
    dtype: string
    /** Physical scale factors per spatial axis in [Z, Y, X] or [Y, X] order from OME coordinateTransformations */
    scales?: number[]
}

/**
 * Mapping from spatial chunk coordinates (z, y, x) to full zarr array chunk coordinates.
 * Handles non-spatial dimensions like channel (c) and time (t).
 */
export interface AxisMapping {
    /** Total number of dimensions in the original zarr array */
    originalNdim: number
    /** Indices of spatial axes in the original array, ordered [Z, Y, X] or [Y, X] */
    spatialIndices: number[]
    /** Non-spatial axes: their index in the original array, chunk size, and default chunk coord */
    nonSpatialAxes: Array<{ index: number; name: string; chunkSize: number; defaultChunkCoord: number }>
}

export interface ZarrPyramidInfo {
    /** Name/URL of the zarr store */
    name: string
    /** Pyramid levels (index 0 = highest resolution) */
    levels: ZarrPyramidLevel[]
    /** Whether this is a 3D dataset (based on spatial dimensions) */
    is3D: boolean
    /** Number of spatial dimensions (2 or 3) */
    ndim: number
    /** Mapping from spatial to full array coordinates */
    axisMapping: AxisMapping
}

export interface ChunkCoord {
    /** Pyramid level */
    level: number
    /** Chunk X index */
    x: number
    /** Chunk Y index */
    y: number
    /** Chunk Z index (for 3D) */
    z?: number
}

// Type for zarr Array (simplified for our use)
type ZarrArray = zarr.Array<zarr.DataType, zarr.Readable>

// Interface for OME multiscales metadata
interface OmeMultiscalesDataset {
    path: string
    coordinateTransformations?: Array<{
        type: string
        scale?: number[]
        translation?: number[]
    }>
}

interface OmeMultiscales {
    axes?: Array<{ name: string; type: string }>
    datasets: OmeMultiscalesDataset[]
    name?: string
}

export class ZarrChunkClient {
    private store: zarr.FetchStore
    private baseUrl: string
    private arrays: Map<number, ZarrArray> = new Map()
    /** Maps level index to actual path in the zarr store */
    private levelPaths: Map<number, string> = new Map()
    /** Axis mapping for coordinate translation */
    private axisMapping: AxisMapping | null = null

    constructor(config: ZarrChunkClientConfig) {
        this.baseUrl = config.baseUrl
        this.store = new zarr.FetchStore(config.baseUrl)
    }

    /**
     * Discover pyramid structure by reading OME-ZARR multiscales metadata,
     * or falling back to probing for arrays at /0, /1, /2, etc.
     */
    async fetchInfo(): Promise<ZarrPyramidInfo> {
        const root = zarr.root(this.store)

        // Raw levels before axis stripping (with full original shapes)
        const rawLevels: Array<{ index: number; path: string; shape: number[]; chunks: number[]; dtype: string }> = []
        let omeAxes: Array<{ name: string; type: string }> | null = null
        let omeMultiscales: OmeMultiscales | null = null

        // Try to open as a single array first (non-pyramidal case)
        try {
            const arr = await zarr.open(root, { kind: 'array' })
            rawLevels.push({
                index: 0,
                path: '/',
                shape: [...arr.shape],
                chunks: [...arr.chunks],
                dtype: arr.dtype
            })
            this.arrays.set(0, arr)
            this.levelPaths.set(0, '/')
        } catch {
            // Not a single array, try to open as a group and read OME metadata

            try {
                const group = await zarr.open(root, { kind: 'group' })
                // Look for OME multiscales metadata in attributes
                // Can be at .ome.multiscales (v0.5) or .multiscales (older)
                const attrs = group.attrs as Record<string, unknown>
                if (attrs.ome && typeof attrs.ome === 'object') {
                    const ome = attrs.ome as { multiscales?: OmeMultiscales[] }
                    if (ome.multiscales && Array.isArray(ome.multiscales) && ome.multiscales.length > 0) {
                        omeMultiscales = ome.multiscales[0]
                    }
                } else if (attrs.multiscales && Array.isArray(attrs.multiscales) && attrs.multiscales.length > 0) {
                    omeMultiscales = attrs.multiscales[0] as OmeMultiscales
                }
            } catch {
                // Could not open as group
            }

            // Extract OME axes metadata if available
            if (omeMultiscales?.axes && Array.isArray(omeMultiscales.axes)) {
                omeAxes = omeMultiscales.axes
            }

            if (omeMultiscales && omeMultiscales.datasets && omeMultiscales.datasets.length > 0) {
                // Use OME multiscales paths
                for (let i = 0; i < omeMultiscales.datasets.length; i++) {
                    const dataset = omeMultiscales.datasets[i]
                    const path = dataset.path.startsWith('/') ? dataset.path : `/${dataset.path}`
                    try {
                        const loc = root.resolve(path)
                        const arr = await zarr.open(loc, { kind: 'array' })
                        rawLevels.push({
                            index: i,
                            path,
                            shape: [...arr.shape],
                            chunks: [...arr.chunks],
                            dtype: arr.dtype
                        })
                        this.arrays.set(i, arr)
                        this.levelPaths.set(i, path)
                    } catch (err) {
                        console.warn(`Failed to open array at path ${path}:`, err)
                    }
                }
            } else {
                // No OME metadata, probe for arrays at /0, /1, /2, ... until we get an error
                for (let i = 0; i < 20; i++) {
                    const path = `/${i}`
                    try {
                        const loc = root.resolve(path)
                        const arr = await zarr.open(loc, { kind: 'array' })
                        rawLevels.push({
                            index: i,
                            path,
                            shape: [...arr.shape],
                            chunks: [...arr.chunks],
                            dtype: arr.dtype
                        })
                        this.arrays.set(i, arr)
                        this.levelPaths.set(i, path)
                    } catch {
                        // No more levels
                        break
                    }
                }
            }
        }

        if (rawLevels.length === 0) {
            throw new Error(`No zarr arrays found at ${this.baseUrl}`)
        }

        // Build axis mapping: identify spatial vs non-spatial dimensions
        const originalNdim = rawLevels[0].shape.length
        const axisMapping = this.buildAxisMapping(originalNdim, rawLevels[0].chunks, omeAxes)
        this.axisMapping = axisMapping

        // Strip non-spatial dimensions from shape and chunks, and extract per-level scales
        const levels: ZarrPyramidLevel[] = rawLevels.map((raw) => {
            const level: ZarrPyramidLevel = {
                index: raw.index,
                path: raw.path,
                shape: axisMapping.spatialIndices.map((i) => raw.shape[i]),
                chunks: axisMapping.spatialIndices.map((i) => raw.chunks[i]),
                dtype: raw.dtype
            }

            // Extract spatial scale factors from OME coordinateTransformations
            if (omeMultiscales?.datasets?.[raw.index]?.coordinateTransformations) {
                const transforms = omeMultiscales.datasets[raw.index].coordinateTransformations!
                const scaleTransform = transforms.find((t) => t.type === 'scale' && t.scale)
                if (scaleTransform?.scale) {
                    // Extract scales for spatial axes only, in the reordered [Z, Y, X] order
                    level.scales = axisMapping.spatialIndices.map((i) => scaleTransform.scale![i])
                }
            }

            return level
        })

        // Determine dimensionality from spatial axes
        const spatialNdim = axisMapping.spatialIndices.length
        const is3D = spatialNdim >= 3

        console.log(
            `Zarr axis mapping: original ndim=${originalNdim}, spatial ndim=${spatialNdim}, ` +
                `spatial indices=${JSON.stringify(axisMapping.spatialIndices)}, ` +
                `non-spatial=${JSON.stringify(axisMapping.nonSpatialAxes.map((a) => a.name))}`
        )

        return {
            name: this.baseUrl,
            levels,
            is3D,
            ndim: spatialNdim,
            axisMapping
        }
    }

    /**
     * Build axis mapping from OME axes metadata or infer from array dimensions.
     * Identifies spatial (x, y, z) vs non-spatial (c, t) dimensions and returns
     * indices for extracting spatial-only shape/chunks.
     */
    private buildAxisMapping(originalNdim: number, originalChunks: number[], omeAxes: Array<{ name: string; type: string }> | null): AxisMapping {
        const spatialIndices: number[] = []
        const nonSpatialAxes: AxisMapping['nonSpatialAxes'] = []

        if (omeAxes && omeAxes.length === originalNdim) {
            // Use OME axes metadata to identify spatial vs non-spatial
            // Collect spatial axes with their names for reordering
            const spatialAxesWithNames: Array<{ index: number; name: string }> = []
            for (let i = 0; i < omeAxes.length; i++) {
                const axis = omeAxes[i]
                if (axis.type === 'space') {
                    spatialAxesWithNames.push({ index: i, name: axis.name.toLowerCase() })
                } else {
                    nonSpatialAxes.push({
                        index: i,
                        name: axis.name,
                        chunkSize: originalChunks[i],
                        defaultChunkCoord: 0
                    })
                }
            }

            // Reorder spatial indices to ensure [Z, Y, X] (3D) or [Y, X] (2D) order
            // based on axis names from the OME metadata
            if (spatialAxesWithNames.length >= 3) {
                const zAxis = spatialAxesWithNames.find((a) => a.name === 'z')
                const yAxis = spatialAxesWithNames.find((a) => a.name === 'y')
                const xAxis = spatialAxesWithNames.find((a) => a.name === 'x')
                if (zAxis && yAxis && xAxis) {
                    spatialIndices.push(zAxis.index, yAxis.index, xAxis.index)
                } else {
                    // Unrecognized axis names — keep original order and warn
                    console.warn(
                        `OME spatial axis names not recognized as z/y/x: ${spatialAxesWithNames.map((a) => a.name).join(', ')}. ` +
                            `Assuming order is [Z, Y, X].`
                    )
                    for (const a of spatialAxesWithNames) {
                        spatialIndices.push(a.index)
                    }
                }
            } else if (spatialAxesWithNames.length === 2) {
                const yAxis = spatialAxesWithNames.find((a) => a.name === 'y')
                const xAxis = spatialAxesWithNames.find((a) => a.name === 'x')
                if (yAxis && xAxis) {
                    spatialIndices.push(yAxis.index, xAxis.index)
                } else {
                    for (const a of spatialAxesWithNames) {
                        spatialIndices.push(a.index)
                    }
                }
            } else {
                for (const a of spatialAxesWithNames) {
                    spatialIndices.push(a.index)
                }
            }
        } else {
            // No OME axes metadata — infer from ndim.
            // OME convention: leading dims are non-spatial (t, c), trailing are spatial (z, y, x)
            if (omeAxes === null) {
                console.warn('No OME axes metadata found — inferring axis layout from array dimensions')
            }
            if (originalNdim <= 3) {
                // 2D [Y, X] or 3D [Z, Y, X] — all spatial
                for (let i = 0; i < originalNdim; i++) {
                    spatialIndices.push(i)
                }
            } else if (originalNdim === 4) {
                // Assume [C, Z, Y, X]
                nonSpatialAxes.push({ index: 0, name: 'c', chunkSize: originalChunks[0], defaultChunkCoord: 0 })
                spatialIndices.push(1, 2, 3)
            } else if (originalNdim === 5) {
                // Assume [T, C, Z, Y, X]
                nonSpatialAxes.push({ index: 0, name: 't', chunkSize: originalChunks[0], defaultChunkCoord: 0 })
                nonSpatialAxes.push({ index: 1, name: 'c', chunkSize: originalChunks[1], defaultChunkCoord: 0 })
                spatialIndices.push(2, 3, 4)
            } else {
                // Unknown layout — treat last 3 as spatial, rest as non-spatial
                for (let i = 0; i < originalNdim - 3; i++) {
                    nonSpatialAxes.push({ index: i, name: `dim${i}`, chunkSize: originalChunks[i], defaultChunkCoord: 0 })
                }
                for (let i = originalNdim - 3; i < originalNdim; i++) {
                    spatialIndices.push(i)
                }
            }
        }

        return { originalNdim, spatialIndices, nonSpatialAxes }
    }

    /**
     * Open a zarr array at a specific pyramid level.
     * Uses cached arrays when available.
     */
    private async openLevel(level: number): Promise<ZarrArray> {
        if (this.arrays.has(level)) {
            return this.arrays.get(level)!
        }

        const root = zarr.root(this.store)
        // Use stored path from fetchInfo, or fall back to numbered path
        const path = this.levelPaths.get(level) ?? (level === 0 ? '/' : `/${level}`)

        try {
            const loc = root.resolve(path)
            const arr = await zarr.open(loc, { kind: 'array' })
            this.arrays.set(level, arr)
            this.levelPaths.set(level, path)
            return arr
        } catch {
            // Fallback: try root for level 0
            if (level === 0) {
                const arr = await zarr.open(root, { kind: 'array' })
                this.arrays.set(level, arr)
                this.levelPaths.set(level, '/')
                return arr
            }
            throw new Error(`Cannot open zarr array at level ${level}`)
        }
    }

    /**
     * Fetch a single chunk by spatial coordinates.
     * Uses the axis mapping to build full chunk coordinates including non-spatial dims.
     * Returns the spatial-only decoded TypedArray data.
     *
     * @param level - Pyramid level
     * @param x - Spatial X chunk index
     * @param y - Spatial Y chunk index
     * @param z - Spatial Z chunk index (for 3D)
     * @param nonSpatialCoords - Optional overrides for non-spatial dimensions (e.g., channel index)
     */
    async fetchChunk(level: number, x: number, y: number, z?: number, nonSpatialCoords?: Record<string, number>, signal?: AbortSignal): Promise<TypedArray | null> {
        try {
            const arr = await this.openLevel(level)
            const mapping = this.axisMapping

            let chunkCoords: number[]

            if (mapping && mapping.originalNdim > mapping.spatialIndices.length) {
                // Build full chunk coordinates using axis mapping
                chunkCoords = new Array(mapping.originalNdim).fill(0)

                // Set non-spatial axes to default values (or overrides)
                for (const nsa of mapping.nonSpatialAxes) {
                    chunkCoords[nsa.index] = nonSpatialCoords?.[nsa.name] ?? nsa.defaultChunkCoord
                }

                // Set spatial axes — spatialIndices are in [Z, Y, X] or [Y, X] order
                const spatialCoords = z !== undefined && mapping.spatialIndices.length >= 3 ? [z, y, x] : [y, x]

                for (let i = 0; i < spatialCoords.length && i < mapping.spatialIndices.length; i++) {
                    chunkCoords[mapping.spatialIndices[i]] = spatialCoords[i]
                }
            } else {
                // No non-spatial dims — use spatial coords directly
                if (z !== undefined && arr.shape.length >= 3) {
                    chunkCoords = [z, y, x]
                } else {
                    chunkCoords = [y, x]
                }
            }

            const chunk = await arr.getChunk(chunkCoords, { signal })
            let data = chunk.data as TypedArray

            // If there are non-spatial dimensions, extract the spatial-only slice.
            // For non-spatial chunk sizes of 1 (common case), data starts at offset 0
            // and has exactly spatialSize elements — no slicing needed.
            if (mapping && mapping.nonSpatialAxes.length > 0) {
                const spatialSize = mapping.spatialIndices.reduce((acc, idx) => acc * arr.chunks[idx], 1)
                if (data.length > spatialSize) {
                    // Compute offset for the requested non-spatial chunk coords
                    // Data is in row-major order: leading dims have largest strides
                    let offset = 0
                    let stride = data.length
                    for (let d = 0; d < mapping.originalNdim; d++) {
                        stride = Math.floor(stride / arr.chunks[d])
                        const isSpatial = mapping.spatialIndices.includes(d)
                        if (!isSpatial) {
                            // Use 0 within the chunk (we fetched the right chunk coord already)
                            // This handles the case where non-spatial chunk size > 1
                            offset += 0 * stride
                        }
                    }
                    data = data.subarray(offset, offset + spatialSize) as TypedArray
                }
            }

            return data
        } catch (err) {
            console.warn(`Failed to fetch chunk at level ${level}, x=${x}, y=${y}, z=${z}:`, err)
            return null
        }
    }

    /**
     * Fetch multiple chunks in parallel.
     * Returns a Map from chunk key to TypedArray.
     */
    async fetchChunks(name: string, level: number, coords: ChunkCoord[]): Promise<Map<string, TypedArray>> {
        const results = new Map<string, TypedArray>()

        const promises = coords.map(async (coord) => {
            const data = await this.fetchChunk(level, coord.x, coord.y, coord.z)
            if (data) {
                const key = coord.z !== undefined ? `${name}:${level}/${coord.x}/${coord.y}/${coord.z}` : `${name}:${level}/${coord.x}/${coord.y}`
                results.set(key, data)
            }
        })

        await Promise.all(promises)
        return results
    }

    /**
     * Fetch a rectangular region using zarr.get with slices.
     * Useful for fetching exact viewport regions rather than whole chunks.
     * Uses axis mapping to handle non-spatial dimensions.
     */
    async fetchRegion(
        level: number,
        region: {
            xStart: number
            xEnd: number
            yStart: number
            yEnd: number
            zStart?: number
            zEnd?: number
        }
    ): Promise<{ data: TypedArray; shape: number[] } | null> {
        try {
            const arr = await this.openLevel(level)
            const mapping = this.axisMapping

            // Build slice selections for all dimensions
            const selections: Array<ReturnType<typeof zarr.slice> | number> = []

            if (mapping && mapping.originalNdim > mapping.spatialIndices.length) {
                // Build full selections with non-spatial dims fixed to 0
                for (let d = 0; d < mapping.originalNdim; d++) {
                    const spatialIdx = mapping.spatialIndices.indexOf(d)
                    if (spatialIdx === -1) {
                        // Non-spatial dim — select index 0
                        selections.push(0)
                    } else if (mapping.spatialIndices.length >= 3) {
                        // Spatial dim in [Z, Y, X] order
                        if (spatialIdx === 0 && region.zStart !== undefined && region.zEnd !== undefined) {
                            selections.push(zarr.slice(region.zStart, region.zEnd))
                        } else if (spatialIdx === 1) {
                            selections.push(zarr.slice(region.yStart, region.yEnd))
                        } else if (spatialIdx === 2) {
                            selections.push(zarr.slice(region.xStart, region.xEnd))
                        } else {
                            selections.push(zarr.slice(0, arr.shape[d]))
                        }
                    } else {
                        // 2D spatial: [Y, X]
                        if (spatialIdx === 0) {
                            selections.push(zarr.slice(region.yStart, region.yEnd))
                        } else {
                            selections.push(zarr.slice(region.xStart, region.xEnd))
                        }
                    }
                }
            } else {
                // No non-spatial dims — use spatial coords directly
                if (region.zStart !== undefined && region.zEnd !== undefined && arr.shape.length >= 3) {
                    selections.push(zarr.slice(region.zStart, region.zEnd))
                    selections.push(zarr.slice(region.yStart, region.yEnd))
                    selections.push(zarr.slice(region.xStart, region.xEnd))
                } else {
                    selections.push(zarr.slice(region.yStart, region.yEnd))
                    selections.push(zarr.slice(region.xStart, region.xEnd))
                }
            }

            const result = await zarr.get(arr, selections)
            return {
                data: result.data as TypedArray,
                shape: result.shape
            }
        } catch (err) {
            console.warn(`Failed to fetch region at level ${level}:`, err)
            return null
        }
    }

    /**
     * Get the zarr store URL
     */
    getUrl(): string {
        return this.baseUrl
    }

    /**
     * Clear cached array references
     */
    clearArrayCache(): void {
        this.arrays.clear()
        this.levelPaths.clear()
    }
}
