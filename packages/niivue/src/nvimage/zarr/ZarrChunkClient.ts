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
    /** Array shape [X, Y] for 2D or [X, Y, Z] or other orderings for 3D+ */
    shape: number[]
    /** Chunk dimensions matching shape order */
    chunks: number[]
    /** Data type (e.g., "uint8", "uint16", "float32") */
    dtype: string
}

export interface ZarrPyramidInfo {
    /** Name/URL of the zarr store */
    name: string
    /** Pyramid levels (index 0 = highest resolution) */
    levels: ZarrPyramidLevel[]
    /** Whether this is a 3D dataset */
    is3D: boolean
    /** Number of dimensions (2 or 3 typically) */
    ndim: number
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
        const levels: ZarrPyramidLevel[] = []

        // Try to open as a single array first (non-pyramidal case)
        try {
            const arr = await zarr.open(root, { kind: 'array' })
            levels.push({
                index: 0,
                path: '/',
                shape: arr.shape,
                chunks: arr.chunks,
                dtype: arr.dtype
            })
            this.arrays.set(0, arr)
            this.levelPaths.set(0, '/')
        } catch {
            // Not a single array, try to open as a group and read OME metadata
            let omeMultiscales: OmeMultiscales | null = null

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

            if (omeMultiscales && omeMultiscales.datasets && omeMultiscales.datasets.length > 0) {
                // Use OME multiscales paths
                for (let i = 0; i < omeMultiscales.datasets.length; i++) {
                    const dataset = omeMultiscales.datasets[i]
                    const path = dataset.path.startsWith('/') ? dataset.path : `/${dataset.path}`
                    try {
                        const loc = root.resolve(path)
                        const arr = await zarr.open(loc, { kind: 'array' })
                        levels.push({
                            index: i,
                            path,
                            shape: arr.shape,
                            chunks: arr.chunks,
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
                        levels.push({
                            index: i,
                            path,
                            shape: arr.shape,
                            chunks: arr.chunks,
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

        if (levels.length === 0) {
            throw new Error(`No zarr arrays found at ${this.baseUrl}`)
        }

        // Determine dimensionality from the first level
        const level0 = levels[0]
        const ndim = level0.shape.length
        const is3D = ndim >= 3

        return {
            name: this.baseUrl,
            levels,
            is3D,
            ndim
        }
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
     * Fetch a single chunk by coordinates.
     * Returns the decoded TypedArray data.
     */
    async fetchChunk(level: number, x: number, y: number, z?: number): Promise<TypedArray | null> {
        try {
            const arr = await this.openLevel(level)

            // Build chunk coordinates based on array dimensions
            let chunkCoords: number[]
            if (z !== undefined && arr.shape.length >= 3) {
                // 3D case - order depends on zarr array layout
                // Common orderings: [Z, Y, X] or [X, Y, Z] or [C, Z, Y, X]
                // For now, assume [Z, Y, X] which is common for microscopy data
                chunkCoords = [z, y, x]
            } else {
                // 2D case - assume [Y, X] order
                chunkCoords = [y, x]
            }

            const chunk = await arr.getChunk(chunkCoords)
            return chunk.data as TypedArray
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

            // Build slices based on array dimensions
            // Assume [Z, Y, X] or [Y, X] order
            let result
            if (region.zStart !== undefined && region.zEnd !== undefined && arr.shape.length >= 3) {
                const zSlice = zarr.slice(region.zStart, region.zEnd)
                const ySlice = zarr.slice(region.yStart, region.yEnd)
                const xSlice = zarr.slice(region.xStart, region.xEnd)
                result = await zarr.get(arr, [zSlice, ySlice, xSlice])
            } else {
                const ySlice = zarr.slice(region.yStart, region.yEnd)
                const xSlice = zarr.slice(region.xStart, region.xEnd)
                result = await zarr.get(arr, [ySlice, xSlice])
            }
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
