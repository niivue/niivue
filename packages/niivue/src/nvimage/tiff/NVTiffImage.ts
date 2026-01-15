/**
 * NVTiffImage - Integration class for viewing pyramidal TIFF images in NiiVue.
 * Creates a viewport-sized NVImage that acts as a window into a tiled pyramid.
 */

import { NIFTI1 } from 'nifti-reader-js'
import { mat4 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { TiffTileClient, type TiffTileClientConfig, type PyramidInfo, type TileCoord } from './TiffTileClient.js'
import { TiffTileCache } from './TiffTileCache.js'
import { TiffViewport, type TiffViewportState } from './TiffViewport.js'
import { NiiDataType } from '@/nvimage/utils.js'
import { NVImage } from '@/nvimage/index.js'

export interface TileLoadInfo {
    level: number
    tilesLoaded: number
    tilesTotal: number
}

export interface LevelChangeInfo {
    level: number
    totalLevels: number
    levelWidth: number
    levelHeight: number
}

export interface NVTiffImageOptions {
    /** Base URL for tile server */
    tileServerUrl: string
    /** Image name/path on server */
    imageName: string
    /** Texture width (defaults to canvas width, capped by maxTextureSize) */
    textureWidth?: number
    /** Texture height (defaults to canvas height, capped by maxTextureSize) */
    textureHeight?: number
    /** Maximum texture size (from WebGL MAX_TEXTURE_SIZE) */
    maxTextureSize?: number
    /** Tile cache size (default 500) */
    cacheSize?: number
    /** URL patterns for tile server */
    tileUrlPattern?: string
    infoUrlPattern?: string
    /** Callback when tiles are loaded */
    onTileLoad?: (info: TileLoadInfo) => void
    /** Callback when pyramid level changes */
    onLevelChange?: (info: LevelChangeInfo) => void
}

export class NVTiffImage {
    private image: NVImage
    private tileClient: TiffTileClient
    private tileCache: TiffTileCache
    private viewport: TiffViewport
    private pyramidInfo: PyramidInfo
    private tileCanvas: OffscreenCanvas // Small canvas for extracting tile pixels
    private tileCtx: OffscreenCanvasRenderingContext2D
    private imageName: string
    private textureWidth: number
    private textureHeight: number
    private onTileLoad?: (info: TileLoadInfo) => void
    private onLevelChange?: (info: LevelChangeInfo) => void
    private pendingUpdate: boolean = false

    private constructor() {
        // Private constructor - use static create() method
        this.image = new NVImage()
        this.tileClient = null as unknown as TiffTileClient
        this.tileCache = null as unknown as TiffTileCache
        this.viewport = null as unknown as TiffViewport
        this.pyramidInfo = null as unknown as PyramidInfo
        this.tileCanvas = null as unknown as OffscreenCanvas
        this.tileCtx = null as unknown as OffscreenCanvasRenderingContext2D
        this.imageName = ''
        this.textureWidth = 0
        this.textureHeight = 0
    }

    /**
     * Factory method to create and initialize NVTiffImage
     */
    static async create(options: NVTiffImageOptions): Promise<NVTiffImage> {
        const instance = new NVTiffImage()

        // Create tile client
        const clientConfig: TiffTileClientConfig = {
            baseUrl: options.tileServerUrl,
            tileUrlPattern: options.tileUrlPattern,
            infoUrlPattern: options.infoUrlPattern
        }
        instance.tileClient = new TiffTileClient(clientConfig)

        // Fetch pyramid info
        instance.pyramidInfo = await instance.tileClient.fetchInfo(options.imageName)
        instance.imageName = options.imageName

        // Determine texture size
        const maxSize = options.maxTextureSize ?? 8192
        instance.textureWidth = Math.min(options.textureWidth ?? 1024, maxSize)
        instance.textureHeight = Math.min(options.textureHeight ?? 1024, maxSize)

        // Create tile cache
        instance.tileCache = new TiffTileCache(options.cacheSize ?? 500)

        // Create viewport manager
        instance.viewport = new TiffViewport(instance.pyramidInfo, instance.textureWidth, instance.textureHeight)

        // Create small canvas for extracting pixel data from tiles
        // Size it to the largest tile dimension we might encounter
        const maxTileSize = Math.max(
            ...instance.pyramidInfo.levels.map((l) => Math.max(l.tileWidth, l.tileHeight))
        )
        instance.tileCanvas = new OffscreenCanvas(maxTileSize, maxTileSize)
        const ctx = instance.tileCanvas.getContext('2d')
        if (!ctx) {
            throw new Error('Failed to create 2D rendering context')
        }
        instance.tileCtx = ctx

        // Store callbacks
        instance.onTileLoad = options.onTileLoad
        instance.onLevelChange = options.onLevelChange

        // Create the underlying NVImage
        instance.createNVImage()

        // Load initial tiles
        await instance.updateTexture()

        return instance
    }

    /**
     * Create the underlying NVImage with RGBA format
     */
    private createNVImage(): void {
        // Create a NIfTI header for a 2D RGBA image
        const hdr = new NIFTI1()
        hdr.littleEndian = true
        hdr.dims = [3, this.textureWidth, this.textureHeight, 1, 0, 0, 0, 0]
        hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
        hdr.datatypeCode = NiiDataType.DT_RGBA32
        hdr.numBitsPerVoxel = 32
        hdr.scl_inter = 0
        hdr.scl_slope = 1
        hdr.sform_code = 2
        hdr.magic = 'n+1'
        hdr.vox_offset = 352

        // Create identity affine
        hdr.affine = [
            [1, 0, 0, -this.textureWidth / 2],
            [0, 1, 0, -this.textureHeight / 2],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ]

        // Initialize image
        this.image = new NVImage()
        this.image.name = `tiff:${this.imageName}`
        this.image.id = uuidv4()
        this.image._colormap = 'gray'
        this.image._opacity = 1.0
        this.image.hdr = hdr
        this.image.nFrame4D = 1
        this.image.frame4D = 0
        this.image.nTotalFrame4D = 1
        this.image.nVox3D = this.textureWidth * this.textureHeight
        this.image.dims = [this.textureWidth, this.textureHeight, 1]
        this.image.pixDims = [1, 1, 1]

        // Create RGBA image data buffer
        this.image.img = new Uint8Array(this.textureWidth * this.textureHeight * 4)

        // Set up matrices
        this.image.matRAS = mat4.create()
        mat4.identity(this.image.matRAS)
        this.image.toRAS = mat4.create()
        mat4.identity(this.image.toRAS)
        this.image.toRASvox = mat4.create()
        mat4.identity(this.image.toRASvox)

        // Set RAS dimensions - format is [ndims, width, height, depth] to match NIfTI convention
        this.image.dimsRAS = [3, this.textureWidth, this.textureHeight, 1]
        this.image.pixDimsRAS = [1, 1, 1, 1]
        this.image.permRAS = [1, 2, 3]

        // Set frac2mm transform (maps fractional coords to mm)
        // For a 2D image, this scales from [0,1] to [0, width/height]
        const frac2mm = mat4.create()
        frac2mm[0] = this.textureWidth
        frac2mm[5] = this.textureHeight
        frac2mm[10] = 1
        frac2mm[12] = -this.textureWidth / 2
        frac2mm[13] = -this.textureHeight / 2
        frac2mm[14] = -0.5
        this.image.frac2mm = frac2mm

        // Set orthographic frac2mm (same as frac2mm for non-oblique 2D)
        this.image.frac2mmOrtho = mat4.clone(frac2mm)

        // mm2ortho is identity for non-oblique images
        this.image.mm2ortho = mat4.create()
        mat4.identity(this.image.mm2ortho)

        // Set ortho extents
        this.image.extentsMinOrtho = [-this.textureWidth / 2, -this.textureHeight / 2, -0.5]
        this.image.extentsMaxOrtho = [this.textureWidth / 2, this.textureHeight / 2, 0.5]

        // Set calibration
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
     * Pan by screen pixels
     */
    async pan(deltaX: number, deltaY: number): Promise<void> {
        this.viewport.pan(deltaX, deltaY)
        await this.updateTexture()
    }

    /**
     * Zoom around a screen point with automatic pyramid level selection
     */
    async zoomAt(factor: number, screenX: number, screenY: number): Promise<void> {
        this.viewport.zoomAt(factor, screenX, screenY)

        // Auto-select optimal pyramid level for new zoom
        const currentLevel = this.viewport.getState().pyramidLevel
        const bestLevel = this.viewport.getBestLevelForZoomWithHysteresis(currentLevel)

        if (bestLevel !== currentLevel) {
            this.viewport.setLevel(bestLevel)

            // Fire level change callback
            const levelInfo = this.pyramidInfo.levels[bestLevel]
            this.onLevelChange?.({
                level: bestLevel,
                totalLevels: this.pyramidInfo.levels.length,
                levelWidth: levelInfo.width,
                levelHeight: levelInfo.height
            })
        }

        await this.updateTexture()
    }

    /**
     * Set the current pyramid level
     */
    async setPyramidLevel(level: number): Promise<void> {
        const oldLevel = this.viewport.getState().pyramidLevel
        this.viewport.setLevel(level)

        if (oldLevel !== level) {
            const levelInfo = this.pyramidInfo.levels[level]
            this.onLevelChange?.({
                level,
                totalLevels: this.pyramidInfo.levels.length,
                levelWidth: levelInfo.width,
                levelHeight: levelInfo.height
            })
        }

        await this.updateTexture()
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
    getPyramidInfo(): PyramidInfo {
        return this.pyramidInfo
    }

    /**
     * Get current viewport state
     */
    getViewportState(): TiffViewportState {
        return this.viewport.getState()
    }

    /**
     * Set viewport state with automatic pyramid level selection
     */
    async setViewportState(state: Partial<TiffViewportState>): Promise<void> {
        this.viewport.setState(state)

        // Auto-select optimal pyramid level for current zoom
        const currentLevel = this.viewport.getState().pyramidLevel
        const bestLevel = this.viewport.getBestLevelForZoomWithHysteresis(currentLevel)

        if (bestLevel !== currentLevel) {
            this.viewport.setLevel(bestLevel)

            // Fire level change callback
            const levelInfo = this.pyramidInfo.levels[bestLevel]
            this.onLevelChange?.({
                level: bestLevel,
                totalLevels: this.pyramidInfo.levels.length,
                levelWidth: levelInfo.width,
                levelHeight: levelInfo.height
            })
        }

        await this.updateTexture()
    }

    /**
     * Convert screen coordinates to image coordinates (level 0)
     */
    screenToImage(screenX: number, screenY: number): { x: number; y: number } {
        return this.viewport.screenToImage(screenX, screenY)
    }

    /**
     * Update texture dimensions (e.g., on canvas resize)
     */
    async setTextureDimensions(width: number, height: number): Promise<void> {
        if (width === this.textureWidth && height === this.textureHeight) {
            return
        }

        this.textureWidth = width
        this.textureHeight = height

        // Update viewport
        this.viewport.setTextureDimensions(width, height)

        // Recreate NVImage with new dimensions
        this.createNVImage()

        // Update texture
        await this.updateTexture()
    }

    /**
     * Update the texture by fetching and compositing visible tiles
     */
    private async updateTexture(): Promise<void> {
        // Debounce rapid updates - prevents concurrent tile fetching during rapid pan/zoom
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

        // Clear NVImage.img with background color (dark blue: #1a1a2e = rgb(26, 26, 46))
        this.clearImageData(26, 26, 46, 255)

        // Load and draw visible tiles directly to NVImage.img
        await this.compositeVisibleTiles()

        // Reset pendingUpdate AFTER compositing completes to prevent concurrent operations
        this.pendingUpdate = false
    }

    /**
     * Clear NVImage.img with a solid color
     */
    private clearImageData(r: number, g: number, b: number, a: number): void {
        const img = this.image.img as Uint8Array
        for (let i = 0; i < img.length; i += 4) {
            img[i] = r
            img[i + 1] = g
            img[i + 2] = b
            img[i + 3] = a
        }
    }

    /**
     * Fetch visible tiles and write them directly to NVImage.img
     */
    private async compositeVisibleTiles(): Promise<void> {
        // Get visible tiles
        const tiles = this.viewport.getVisibleTiles()
        const level = this.viewport.getState().pyramidLevel

        // Separate cached and uncached tiles
        const cachedTiles: TileCoord[] = []
        const uncachedTiles: TileCoord[] = []

        for (const tile of tiles) {
            const key = TiffTileCache.getKey(this.imageName, tile.level, tile.x, tile.y)
            if (this.tileCache.has(key)) {
                cachedTiles.push(tile)
            } else if (!this.tileCache.isLoading(key)) {
                uncachedTiles.push(tile)
            }
        }

        // Draw cached tiles immediately
        for (const tile of cachedTiles) {
            const key = TiffTileCache.getKey(this.imageName, tile.level, tile.x, tile.y)
            const bitmap = this.tileCache.get(key)
            if (bitmap) {
                this.drawTileToImage(tile, bitmap)
            }
        }

        // Fetch uncached tiles in parallel
        if (uncachedTiles.length > 0) {
            const loadPromises = uncachedTiles.map(async (tile) => {
                const key = TiffTileCache.getKey(this.imageName, tile.level, tile.x, tile.y)
                this.tileCache.startLoading(key)

                const bitmap = await this.tileClient.fetchTile(this.imageName, tile.level, tile.x, tile.y)

                this.tileCache.doneLoading(key)

                if (bitmap) {
                    this.tileCache.set(key, bitmap)
                    // Draw tile if we're still at the same level
                    if (this.viewport.getState().pyramidLevel === tile.level) {
                        this.drawTileToImage(tile, bitmap)
                    }
                }
            })

            // Report progress
            let loaded = cachedTiles.length
            const total = tiles.length

            for (const promise of loadPromises) {
                await promise
                loaded++
                this.onTileLoad?.({
                    level,
                    tilesLoaded: loaded,
                    tilesTotal: total
                })
            }
        } else {
            // All tiles were cached
            this.onTileLoad?.({
                level,
                tilesLoaded: tiles.length,
                tilesTotal: tiles.length
            })
        }
    }

    /**
     * Draw a tile directly to NVImage.img at the correct position.
     * Tiles are scaled to fill the texture based on render scale.
     */
    private drawTileToImage(tile: TileCoord, bitmap: ImageBitmap): void {
        const drawInfo = this.viewport.getTileDrawInfo(tile.x, tile.y)

        // Calculate destination bounds, clamped to texture dimensions
        const destX = Math.max(0, Math.floor(drawInfo.destX))
        const destY = Math.max(0, Math.floor(drawInfo.destY))
        const destRight = Math.min(this.textureWidth, Math.ceil(drawInfo.destX + drawInfo.destWidth))
        const destBottom = Math.min(this.textureHeight, Math.ceil(drawInfo.destY + drawInfo.destHeight))

        const drawW = destRight - destX
        const drawH = destBottom - destY

        if (drawW <= 0 || drawH <= 0) {
            return // Tile is outside visible area
        }

        // Calculate source rectangle in the bitmap
        // If destination starts before 0, we need to offset into the source
        const srcOffsetX = drawInfo.destX < 0 ? -drawInfo.destX / drawInfo.renderScale : 0
        const srcOffsetY = drawInfo.destY < 0 ? -drawInfo.destY / drawInfo.renderScale : 0
        const srcWidth = drawW / drawInfo.renderScale
        const srcHeight = drawH / drawInfo.renderScale

        // Ensure the tile canvas is large enough for scaled output
        if (this.tileCanvas.width < drawW || this.tileCanvas.height < drawH) {
            this.tileCanvas.width = Math.max(this.tileCanvas.width, drawW)
            this.tileCanvas.height = Math.max(this.tileCanvas.height, drawH)
        }

        // Draw the tile to canvas with scaling
        this.tileCtx.clearRect(0, 0, drawW, drawH)
        this.tileCtx.drawImage(
            bitmap,
            srcOffsetX, srcOffsetY, srcWidth, srcHeight, // source rectangle
            0, 0, drawW, drawH // destination (scaled)
        )

        // Extract pixel data from tile canvas
        const tileImageData = this.tileCtx.getImageData(0, 0, drawW, drawH)
        const tilePixels = tileImageData.data

        // Copy pixels directly to NVImage.img at the correct position
        // Y is flipped because WebGL has Y=0 at bottom, but screen coords have Y=0 at top
        const img = this.image.img as Uint8Array
        const textureW = this.textureWidth
        const textureH = this.textureHeight

        for (let row = 0; row < drawH; row++) {
            const srcRowStart = row * drawW * 4
            // Flip Y: screen row (destY + row) maps to buffer row (textureH - 1 - destY - row)
            const dstRow = textureH - 1 - destY - row
            const dstRowStart = (dstRow * textureW + destX) * 4

            // Copy entire row at once for efficiency
            for (let col = 0; col < drawW; col++) {
                const srcIdx = srcRowStart + col * 4
                const dstIdx = dstRowStart + col * 4
                img[dstIdx] = tilePixels[srcIdx]
                img[dstIdx + 1] = tilePixels[srcIdx + 1]
                img[dstIdx + 2] = tilePixels[srcIdx + 2]
                img[dstIdx + 3] = tilePixels[srcIdx + 3]
            }
        }
    }

    /**
     * Clear tile cache
     */
    clearCache(): void {
        this.tileCache.clear()
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; loading: number } {
        return {
            size: this.tileCache.size,
            loading: this.tileCache.loadingCount
        }
    }
}
