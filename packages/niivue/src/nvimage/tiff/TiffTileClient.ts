/**
 * HTTP client for fetching tiles from a pyramidal TIFF tile server.
 * Compatible with tile servers following the pattern used by wsi-viewer.
 */

export interface TiffTileClientConfig {
    /** Base URL for tile server (e.g., "http://localhost:3000" or "" for relative URLs) */
    baseUrl: string
    /**
     * URL pattern for tiles. Placeholders: {name}, {level}, {x}, {y}
     * Default: "/api/images/{name}/tile/{level}/{x}/{y}"
     */
    tileUrlPattern?: string
    /**
     * URL pattern for image info. Placeholder: {name}
     * Default: "/api/images/{name}/info"
     */
    infoUrlPattern?: string
    /**
     * Custom fetch function for advanced use cases (auth, caching, etc.)
     */
    fetch?: typeof fetch
    /**
     * Request options to pass to fetch calls
     */
    fetchOptions?: RequestInit
}

export interface PyramidLevel {
    index: number
    width: number
    height: number
    tileWidth: number
    tileHeight: number
}

export interface PyramidInfo {
    name: string
    levels: PyramidLevel[]
}

export interface TileCoord {
    level: number
    x: number
    y: number
}

const DEFAULT_TILE_URL_PATTERN = '/api/images/{name}/tile/{level}/{x}/{y}'
const DEFAULT_INFO_URL_PATTERN = '/api/images/{name}/info'

export class TiffTileClient {
    private baseUrl: string
    private tileUrlPattern: string
    private infoUrlPattern: string
    private fetchFn: typeof fetch
    private fetchOptions: RequestInit

    constructor(config: TiffTileClientConfig) {
        this.baseUrl = config.baseUrl
        this.tileUrlPattern = config.tileUrlPattern ?? DEFAULT_TILE_URL_PATTERN
        this.infoUrlPattern = config.infoUrlPattern ?? DEFAULT_INFO_URL_PATTERN
        this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis)
        this.fetchOptions = config.fetchOptions ?? {}
    }

    /**
     * Get the URL for a specific tile
     */
    getTileUrl(name: string, level: number, x: number, y: number): string {
        const path = this.tileUrlPattern.replace('{name}', encodeURIComponent(name)).replace('{level}', String(level)).replace('{x}', String(x)).replace('{y}', String(y))
        return this.baseUrl + path
    }

    /**
     * Get the URL for image info
     */
    getInfoUrl(name: string): string {
        const path = this.infoUrlPattern.replace('{name}', encodeURIComponent(name))
        return this.baseUrl + path
    }

    /**
     * Fetch pyramid metadata from server
     */
    async fetchInfo(imageName: string): Promise<PyramidInfo> {
        const url = this.getInfoUrl(imageName)
        const response = await this.fetchFn(url, this.fetchOptions)
        if (!response.ok) {
            throw new Error(`Failed to fetch image info: ${response.statusText}`)
        }
        const data = await response.json()
        return {
            name: imageName,
            levels: data.levels as PyramidLevel[]
        }
    }

    /**
     * Fetch a single tile as ImageBitmap (for fast canvas drawing)
     * @returns Promise that resolves to the loaded ImageBitmap, or null on error
     */
    async fetchTile(imageName: string, level: number, x: number, y: number): Promise<ImageBitmap | null> {
        const url = this.getTileUrl(imageName, level, x, y)
        try {
            const response = await this.fetchFn(url, this.fetchOptions)
            if (!response.ok) {
                return null
            }
            const blob = await response.blob()
            return await createImageBitmap(blob)
        } catch {
            return null
        }
    }

    /**
     * Fetch multiple tiles in parallel
     * @returns Map from tile key to ImageBitmap
     */
    async fetchTiles(imageName: string, tiles: TileCoord[]): Promise<Map<string, ImageBitmap>> {
        const results = new Map<string, ImageBitmap>()

        const promises = tiles.map(async (tile) => {
            const bitmap = await this.fetchTile(imageName, tile.level, tile.x, tile.y)
            if (bitmap) {
                const key = `${tile.level}/${tile.x}/${tile.y}`
                results.set(key, bitmap)
            }
        })

        await Promise.all(promises)
        return results
    }
}
