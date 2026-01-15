/**
 * LRU cache for pyramid tiles.
 * Automatically evicts least recently used tiles when capacity is reached.
 */

export class TiffTileCache {
    private cache: Map<string, ImageBitmap>
    private loadingSet: Set<string>
    private maxTiles: number

    constructor(maxTiles: number = 500) {
        this.cache = new Map()
        this.loadingSet = new Set()
        this.maxTiles = maxTiles
    }

    /**
     * Generate a cache key for a tile
     */
    static getKey(imageName: string, level: number, x: number, y: number): string {
        return `${imageName}:${level}/${x}/${y}`
    }

    /**
     * Check if a tile is in the cache
     */
    has(key: string): boolean {
        return this.cache.has(key)
    }

    /**
     * Get a tile from the cache
     * Moves the tile to the end of the map (most recently used)
     */
    get(key: string): ImageBitmap | undefined {
        const value = this.cache.get(key)
        if (value !== undefined) {
            // Move to end (most recently used) by re-inserting
            this.cache.delete(key)
            this.cache.set(key, value)
        }
        return value
    }

    /**
     * Add a tile to the cache
     * Evicts oldest tiles if capacity is exceeded
     */
    set(key: string, tile: ImageBitmap): void {
        // If key exists, delete it first to update order
        if (this.cache.has(key)) {
            this.cache.delete(key)
        }

        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxTiles) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey !== undefined) {
                const oldTile = this.cache.get(oldestKey)
                this.cache.delete(oldestKey)
                // Close the ImageBitmap to free resources
                oldTile?.close()
            }
        }

        this.cache.set(key, tile)
    }

    /**
     * Check if a tile is currently being loaded
     */
    isLoading(key: string): boolean {
        return this.loadingSet.has(key)
    }

    /**
     * Mark a tile as being loaded
     */
    startLoading(key: string): void {
        this.loadingSet.add(key)
    }

    /**
     * Mark a tile as done loading
     */
    doneLoading(key: string): void {
        this.loadingSet.delete(key)
    }

    /**
     * Get the number of tiles in the cache
     */
    get size(): number {
        return this.cache.size
    }

    /**
     * Get the number of tiles currently loading
     */
    get loadingCount(): number {
        return this.loadingSet.size
    }

    /**
     * Clear all cached tiles
     */
    clear(): void {
        // Close all ImageBitmaps to free resources
        for (const tile of this.cache.values()) {
            tile.close()
        }
        this.cache.clear()
        this.loadingSet.clear()
    }

    /**
     * Remove a specific tile from the cache
     */
    delete(key: string): boolean {
        const tile = this.cache.get(key)
        if (tile) {
            tile.close()
            this.cache.delete(key)
            return true
        }
        return false
    }

    /**
     * Get all keys in the cache (for debugging)
     */
    keys(): IterableIterator<string> {
        return this.cache.keys()
    }
}
