/**
 * ZarrChunkCache - LRU cache for zarr chunks (TypedArrays).
 *
 * Similar to TiffTileCache but stores TypedArrays instead of ImageBitmaps.
 * TypedArrays are garbage collected automatically, so no explicit cleanup needed.
 */

export type TypedArray = Uint8Array | Uint16Array | Int16Array | Int32Array | Uint32Array | Float32Array | Float64Array

export class ZarrChunkCache {
    private cache: Map<string, TypedArray>
    private loadingSet: Set<string>
    private maxChunks: number

    constructor(maxChunks: number = 500) {
        this.cache = new Map()
        this.loadingSet = new Set()
        this.maxChunks = maxChunks
    }

    /**
     * Generate a unique key for a chunk.
     * Format: "{name}:{level}/{x}/{y}" for 2D or "{name}:{level}/{x}/{y}/{z}" for 3D
     */
    static getKey(name: string, level: number, x: number, y: number, z?: number): string {
        if (z !== undefined) {
            return `${name}:${level}/${x}/${y}/${z}`
        }
        return `${name}:${level}/${x}/${y}`
    }

    /**
     * Check if a chunk is in the cache
     */
    has(key: string): boolean {
        return this.cache.has(key)
    }

    /**
     * Get a chunk from the cache.
     * Also moves the entry to the end (most recently used).
     */
    get(key: string): TypedArray | undefined {
        const chunk = this.cache.get(key)
        if (chunk) {
            // Move to end (LRU: most recently used)
            this.cache.delete(key)
            this.cache.set(key, chunk)
        }
        return chunk
    }

    /**
     * Store a chunk in the cache.
     * Evicts oldest entries if capacity is exceeded.
     */
    set(key: string, chunk: TypedArray): void {
        // If already exists, delete first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key)
        }

        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxChunks) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey) {
                this.cache.delete(oldestKey)
            } else {
                break
            }
        }

        this.cache.set(key, chunk)
    }

    /**
     * Check if a chunk is currently being loaded
     */
    isLoading(key: string): boolean {
        return this.loadingSet.has(key)
    }

    /**
     * Mark a chunk as loading (to prevent duplicate requests)
     */
    startLoading(key: string): void {
        this.loadingSet.add(key)
    }

    /**
     * Mark a chunk as done loading
     */
    doneLoading(key: string): void {
        this.loadingSet.delete(key)
    }

    /**
     * Get the number of cached chunks
     */
    get size(): number {
        return this.cache.size
    }

    /**
     * Get the number of chunks currently loading
     */
    get loadingCount(): number {
        return this.loadingSet.size
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear()
        this.loadingSet.clear()
    }

    /**
     * Delete a specific chunk from cache
     */
    delete(key: string): boolean {
        this.loadingSet.delete(key)
        return this.cache.delete(key)
    }

    /**
     * Get all cached keys
     */
    keys(): IterableIterator<string> {
        return this.cache.keys()
    }
}
