/**
 * ZarrViewport - Manages viewport state and coordinate transformations
 * for viewing zarr datasets as a virtual NIfTI volume.
 *
 * Follows the TIFF pattern: all coordinates are kept in Level 0 (full resolution)
 * space. The virtual volume size is FIXED - data is scaled to fill the texture
 * at any pyramid level. This ensures smooth zooming and stable positioning.
 *
 * For 3D datasets, this manages the "window" into the zarr - which region
 * of the larger zarr dataset is currently visible in the virtual volume.
 */

import type { ZarrPyramidInfo, ZarrPyramidLevel, ChunkCoord } from './ZarrChunkClient.js'

/**
 * Viewport state for 3D zarr viewing.
 * All coordinates are in Level 0 (full resolution) space.
 */
export interface ZarrViewportState {
    /** Center X in level 0 coordinates (NEVER changes on level switch) */
    centerX: number
    /** Center Y in level 0 coordinates */
    centerY: number
    /** Center Z in level 0 coordinates (for 3D) */
    centerZ: number
    /** Display zoom factor (1.0 = fit image to texture) */
    zoom: number
    /** Current pyramid level (0 = highest resolution) */
    pyramidLevel: number
}

/**
 * Dimensions of the virtual volume (capped by WebGL limits)
 */
export interface VirtualVolumeDimensions {
    width: number
    height: number
    depth: number
}

export class ZarrViewport {
    private pyramidInfo: ZarrPyramidInfo
    private volumeDims: VirtualVolumeDimensions
    private state: ZarrViewportState

    constructor(pyramidInfo: ZarrPyramidInfo, volumeDims: VirtualVolumeDimensions) {
        this.pyramidInfo = pyramidInfo
        this.volumeDims = volumeDims

        // Get level 0 dimensions
        const level0Dims = this.getLevelDimensions(0)

        // Find the best initial pyramid level where data fits in volume
        const bestLevel = this.findBestInitialLevel()

        // Start centered on the volume, with zoom = 1.0 (fit to texture)
        this.state = {
            centerX: level0Dims.width / 2,
            centerY: level0Dims.height / 2,
            centerZ: level0Dims.depth / 2,
            zoom: 1.0,
            pyramidLevel: bestLevel
        }
    }

    /**
     * Find the best initial pyramid level where data fits in virtual volume
     */
    private findBestInitialLevel(): number {
        for (let i = 0; i < this.pyramidInfo.levels.length; i++) {
            const dims = this.getLevelDimensions(i)
            if (dims.width <= this.volumeDims.width && dims.height <= this.volumeDims.height && dims.depth <= this.volumeDims.depth) {
                return i
            }
        }
        return this.pyramidInfo.levels.length - 1
    }

    /**
     * Get current viewport state
     */
    getState(): ZarrViewportState {
        return { ...this.state }
    }

    /**
     * Update viewport state
     */
    setState(newState: Partial<ZarrViewportState>): void {
        if (newState.centerX !== undefined) {
            this.state.centerX = newState.centerX
        }
        if (newState.centerY !== undefined) {
            this.state.centerY = newState.centerY
        }
        if (newState.centerZ !== undefined) {
            this.state.centerZ = newState.centerZ
        }
        if (newState.zoom !== undefined) {
            this.state.zoom = Math.max(0.1, Math.min(10000, newState.zoom))
        }
        if (newState.pyramidLevel !== undefined) {
            this.state.pyramidLevel = Math.max(0, Math.min(this.pyramidInfo.levels.length - 1, newState.pyramidLevel))
        }
        this.clampCenter()
    }

    /**
     * Get the current pyramid level info
     */
    getCurrentLevel(): ZarrPyramidLevel {
        return this.pyramidInfo.levels[this.state.pyramidLevel]
    }

    /**
     * Get data dimensions at a specific level
     */
    getLevelDimensions(level: number): { width: number; height: number; depth: number } {
        const levelInfo = this.pyramidInfo.levels[level]
        const shape = levelInfo.shape
        if (this.pyramidInfo.is3D && shape.length >= 3) {
            return { depth: shape[0], height: shape[1], width: shape[2] }
        }
        return { height: shape[0], width: shape[1], depth: 1 }
    }

    /**
     * Get data dimensions at level 0
     */
    getLevel0Dimensions(): { width: number; height: number; depth: number } {
        return this.getLevelDimensions(0)
    }

    /**
     * Get data dimensions at current level
     */
    getCurrentLevelDimensions(): { width: number; height: number; depth: number } {
        return this.getLevelDimensions(this.state.pyramidLevel)
    }

    /**
     * Get chunk dimensions at current level
     */
    getCurrentChunkDimensions(): { width: number; height: number; depth: number } {
        const level = this.getCurrentLevel()
        const chunks = level.chunks
        if (this.pyramidInfo.is3D && chunks.length >= 3) {
            return { depth: chunks[0], height: chunks[1], width: chunks[2] }
        }
        return { height: chunks[0], width: chunks[1], depth: 1 }
    }

    /**
     * Get the scale factor from level 0 to a specific level
     */
    getLevelScaleForLevel(level: number): number {
        const level0Dims = this.getLevel0Dimensions()
        const levelDims = this.getLevelDimensions(level)
        return levelDims.width / level0Dims.width
    }

    /**
     * Get the scale factor from level 0 to current level
     */
    getLevelScale(): number {
        return this.getLevelScaleForLevel(this.state.pyramidLevel)
    }

    /**
     * Get the base scale that fits the image to the virtual volume.
     * This is the scale factor from level 0 coordinates to texture coordinates
     * when zoom = 1.0.
     */
    getBaseScale(): number {
        const level0Dims = this.getLevel0Dimensions()
        return Math.min(this.volumeDims.width / level0Dims.width, this.volumeDims.height / level0Dims.height, this.volumeDims.depth / level0Dims.depth)
    }

    /**
     * Get the effective scale from level 0 coordinates to texture pixels.
     * effectiveScale = baseScale × zoom
     */
    getEffectiveScale(): number {
        return this.getBaseScale() * this.state.zoom
    }

    /**
     * Zoom around a screen point (in texture coordinates)
     * @param factor - Zoom factor (> 1 = zoom in, < 1 = zoom out)
     * @param screenX - Screen X coordinate (texture pixels)
     * @param screenY - Screen Y coordinate (texture pixels)
     * @param screenZ - Screen Z coordinate (optional, for 3D)
     */
    zoomAt(factor: number, screenX: number, screenY: number, screenZ?: number): void {
        // Convert screen point to level 0 coordinates BEFORE zoom
        const imgPos = this.screenToImage(screenX, screenY, screenZ)

        // Apply zoom
        this.state.zoom = Math.max(0.1, Math.min(10000, this.state.zoom * factor))

        // Adjust center so the image point stays under the screen point
        const newScale = this.getEffectiveScale()
        const centerScreenX = this.volumeDims.width / 2
        const centerScreenY = this.volumeDims.height / 2
        const centerScreenZ = this.volumeDims.depth / 2

        this.state.centerX = imgPos.x - (screenX - centerScreenX) / newScale
        this.state.centerY = imgPos.y - (screenY - centerScreenY) / newScale
        if (screenZ !== undefined) {
            this.state.centerZ = imgPos.z - (screenZ - centerScreenZ) / newScale
        }

        this.clampCenter()
    }

    /**
     * Pan by screen pixels (texture coordinates)
     */
    pan(deltaScreenX: number, deltaScreenY: number, deltaScreenZ: number = 0): void {
        const scale = this.getEffectiveScale()
        // Convert screen delta to level 0 coordinates
        this.state.centerX -= deltaScreenX / scale
        this.state.centerY -= deltaScreenY / scale
        this.state.centerZ -= deltaScreenZ / scale
        this.clampCenter()
    }

    /**
     * Convert screen coordinates (texture pixels) to level 0 image coordinates
     */
    screenToImage(screenX: number, screenY: number, screenZ?: number): { x: number; y: number; z: number } {
        const scale = this.getEffectiveScale()
        const centerScreenX = this.volumeDims.width / 2
        const centerScreenY = this.volumeDims.height / 2
        const centerScreenZ = this.volumeDims.depth / 2

        return {
            x: this.state.centerX + (screenX - centerScreenX) / scale,
            y: this.state.centerY + (screenY - centerScreenY) / scale,
            z: this.state.centerZ + ((screenZ ?? centerScreenZ) - centerScreenZ) / scale
        }
    }

    /**
     * Convert level 0 image coordinates to screen coordinates (texture pixels)
     */
    imageToScreen(imageX: number, imageY: number, imageZ?: number): { x: number; y: number; z: number } {
        const scale = this.getEffectiveScale()
        const centerScreenX = this.volumeDims.width / 2
        const centerScreenY = this.volumeDims.height / 2
        const centerScreenZ = this.volumeDims.depth / 2

        return {
            x: centerScreenX + (imageX - this.state.centerX) * scale,
            y: centerScreenY + (imageY - this.state.centerY) * scale,
            z: centerScreenZ + ((imageZ ?? this.state.centerZ) - this.state.centerZ) * scale
        }
    }

    /**
     * Change pyramid level (keeps center position in level 0 coordinates)
     */
    setLevel(level: number): void {
        this.state.pyramidLevel = Math.max(0, Math.min(this.pyramidInfo.levels.length - 1, level))
    }

    /**
     * Clamp center position to keep image in view
     */
    private clampCenter(): void {
        const level0Dims = this.getLevel0Dimensions()
        const scale = this.getEffectiveScale()
        const halfViewWidth = this.volumeDims.width / 2 / scale
        const halfViewHeight = this.volumeDims.height / 2 / scale
        const halfViewDepth = this.volumeDims.depth / 2 / scale

        // Clamp center so viewport stays within image bounds
        // Allow the viewport to extend to edges but not beyond
        this.state.centerX = Math.max(-halfViewWidth, Math.min(level0Dims.width + halfViewWidth, this.state.centerX))
        this.state.centerY = Math.max(-halfViewHeight, Math.min(level0Dims.height + halfViewHeight, this.state.centerY))
        this.state.centerZ = Math.max(-halfViewDepth, Math.min(level0Dims.depth + halfViewDepth, this.state.centerZ))
    }

    /**
     * Get the best pyramid level for the current zoom
     */
    getBestLevelForZoom(): number {
        const effectiveScale = this.getEffectiveScale()
        const level0Dims = this.getLevel0Dimensions()

        // Find the highest resolution level where we don't oversample too much
        for (let i = 0; i < this.pyramidInfo.levels.length; i++) {
            const levelDims = this.getLevelDimensions(i)
            const levelScale = levelDims.width / level0Dims.width
            const pixelRatio = effectiveScale / levelScale

            // If this level gives at least 0.5 texture pixels per image pixel, use it
            if (pixelRatio >= 0.5) {
                return i
            }
        }

        return this.pyramidInfo.levels.length - 1
    }

    /**
     * Get the best pyramid level with hysteresis to prevent rapid switching.
     * Uses asymmetric thresholds to avoid flickering at zoom boundaries.
     * @param currentLevel - Current pyramid level for hysteresis comparison
     */
    getBestLevelForZoomWithHysteresis(currentLevel: number): number {
        const effectiveScale = this.getEffectiveScale()
        const level0Dims = this.getLevel0Dimensions()

        // Asymmetric thresholds prevent flickering at boundaries
        // pixelRatio = texture pixels per current-level image pixel = effectiveScale / levelScale
        const UPGRADE_THRESHOLD = 1.2 // Go to higher res when we have > 1.2 texture pixels per image pixel
        const DOWNGRADE_THRESHOLD = 0.4 // Go to lower res when we have < 0.4 texture pixels per image pixel

        // Check if we should upgrade to higher resolution (lower index)
        if (currentLevel > 0) {
            const currentLevelDims = this.getLevelDimensions(currentLevel)
            const currentLevelScale = currentLevelDims.width / level0Dims.width
            const currentPixelRatio = effectiveScale / currentLevelScale

            if (currentPixelRatio >= UPGRADE_THRESHOLD) {
                return this.getBestLevelForZoomWithHysteresis(currentLevel - 1)
            }
        }

        // Check if we should downgrade to lower resolution (higher index)
        const currentLevelDims = this.getLevelDimensions(currentLevel)
        const currentLevelScale = currentLevelDims.width / level0Dims.width
        const currentPixelRatio = effectiveScale / currentLevelScale

        if (currentPixelRatio < DOWNGRADE_THRESHOLD && currentLevel < this.pyramidInfo.levels.length - 1) {
            return this.getBestLevelForZoomWithHysteresis(currentLevel + 1)
        }

        return currentLevel
    }

    /**
     * Get the visible region in level 0 (full resolution) coordinates.
     * This is the region of the image that is visible in the current view.
     */
    getVisibleRegionLevel0(): {
        left: number
        top: number
        right: number
        bottom: number
        front: number
        back: number
    } {
        const scale = this.getEffectiveScale()

        const halfWidth = this.volumeDims.width / 2 / scale
        const halfHeight = this.volumeDims.height / 2 / scale
        const halfDepth = this.volumeDims.depth / 2 / scale

        return {
            left: this.state.centerX - halfWidth,
            right: this.state.centerX + halfWidth,
            top: this.state.centerY - halfHeight,
            bottom: this.state.centerY + halfHeight,
            front: this.state.centerZ - halfDepth,
            back: this.state.centerZ + halfDepth
        }
    }

    /**
     * Get the visible region in current level coordinates.
     * Output is clamped to level bounds.
     */
    getVisibleRegion(): {
        minX: number
        minY: number
        minZ: number
        maxX: number
        maxY: number
        maxZ: number
        level: number
    } {
        const region0 = this.getVisibleRegionLevel0()
        const levelScale = this.getLevelScale()
        const levelDims = this.getCurrentLevelDimensions()

        return {
            minX: Math.max(0, Math.floor(region0.left * levelScale)),
            maxX: Math.min(levelDims.width, Math.ceil(region0.right * levelScale)),
            minY: Math.max(0, Math.floor(region0.top * levelScale)),
            maxY: Math.min(levelDims.height, Math.ceil(region0.bottom * levelScale)),
            minZ: Math.max(0, Math.floor(region0.front * levelScale)),
            maxZ: Math.min(levelDims.depth, Math.ceil(region0.back * levelScale)),
            level: this.state.pyramidLevel
        }
    }

    /**
     * Get the chunks needed to cover the visible region
     */
    getVisibleChunks(): ChunkCoord[] {
        const MAX_CHUNKS = 1000 // Safety limit
        const region = this.getVisibleRegion()
        const chunkDims = this.getCurrentChunkDimensions()
        const levelDims = this.getCurrentLevelDimensions()
        const level = this.state.pyramidLevel
        const chunks: ChunkCoord[] = []

        // Calculate chunk bounds
        const startChunkX = Math.max(0, Math.floor(region.minX / chunkDims.width))
        const startChunkY = Math.max(0, Math.floor(region.minY / chunkDims.height))
        const startChunkZ = Math.max(0, Math.floor(region.minZ / chunkDims.depth))

        const endChunkX = Math.min(Math.ceil(levelDims.width / chunkDims.width), Math.ceil(region.maxX / chunkDims.width))
        const endChunkY = Math.min(Math.ceil(levelDims.height / chunkDims.height), Math.ceil(region.maxY / chunkDims.height))
        const endChunkZ = Math.min(Math.ceil(levelDims.depth / chunkDims.depth), Math.ceil(region.maxZ / chunkDims.depth))

        for (let z = startChunkZ; z < endChunkZ; z++) {
            for (let y = startChunkY; y < endChunkY; y++) {
                for (let x = startChunkX; x < endChunkX; x++) {
                    if (this.pyramidInfo.is3D) {
                        chunks.push({ level, x, y, z })
                    } else {
                        chunks.push({ level, x, y })
                    }

                    if (chunks.length >= MAX_CHUNKS) {
                        console.warn(`Zarr: Chunk count capped at ${MAX_CHUNKS}. Consider using a lower resolution level.`)
                        return chunks
                    }
                }
            }
        }

        return chunks
    }

    /**
     * Calculate where a chunk should be placed in the virtual volume texture.
     * Uses the center-based coordinate system - tiles are positioned relative
     * to the viewport center, which is always at texture center.
     */
    getChunkPlacement(
        chunkX: number,
        chunkY: number,
        chunkZ?: number
    ): {
        // Position in virtual volume texture where this chunk starts
        destX: number
        destY: number
        destZ: number
        // How much of the chunk to copy (may be partial at edges)
        srcOffsetX: number
        srcOffsetY: number
        srcOffsetZ: number
        copyWidth: number
        copyHeight: number
        copyDepth: number
        // Scale factor for rendering (texture pixels per current-level image pixel)
        renderScale: number
    } {
        const levelScale = this.getLevelScale()
        const effectiveScale = this.getEffectiveScale()
        const renderScale = effectiveScale / levelScale
        const chunkDims = this.getCurrentChunkDimensions()
        const levelDims = this.getCurrentLevelDimensions()

        // Chunk position in current level pixel coordinates
        const chunkStartX = chunkX * chunkDims.width
        const chunkStartY = chunkY * chunkDims.height
        const chunkStartZ = (chunkZ ?? 0) * chunkDims.depth

        // Viewport center in current level coordinates
        const centerLevelX = this.state.centerX * levelScale
        const centerLevelY = this.state.centerY * levelScale
        const centerLevelZ = this.state.centerZ * levelScale

        // Position chunk relative to viewport center, then offset to texture center
        // Texture center is at (volumeDims/2)
        const destX = this.volumeDims.width / 2 + (chunkStartX - centerLevelX) * renderScale
        const destY = this.volumeDims.height / 2 + (chunkStartY - centerLevelY) * renderScale
        const destZ = this.volumeDims.depth / 2 + (chunkStartZ - centerLevelZ) * renderScale

        // Calculate actual chunk size (may be smaller at edges)
        const actualChunkWidth = Math.min(chunkDims.width, levelDims.width - chunkStartX)
        const actualChunkHeight = Math.min(chunkDims.height, levelDims.height - chunkStartY)
        const actualChunkDepth = Math.min(chunkDims.depth, levelDims.depth - chunkStartZ)

        return {
            destX,
            destY,
            destZ,
            srcOffsetX: 0,
            srcOffsetY: 0,
            srcOffsetZ: 0,
            copyWidth: actualChunkWidth,
            copyHeight: actualChunkHeight,
            copyDepth: actualChunkDepth,
            renderScale
        }
    }

    /**
     * Get render info for scaling chunk data to fill the texture.
     * Similar to TiffViewport.getRenderInfo().
     */
    getRenderInfo(): {
        renderScale: number
        levelScale: number
        effectiveScale: number
    } {
        const effectiveScale = this.getEffectiveScale()
        const levelScale = this.getLevelScale()
        const renderScale = effectiveScale / levelScale

        return { renderScale, levelScale, effectiveScale }
    }

    /**
     * Get virtual volume dimensions
     */
    getVolumeDimensions(): VirtualVolumeDimensions {
        return { ...this.volumeDims }
    }

    /**
     * Set virtual volume dimensions (call after construction to match actual NVImage)
     */
    setVolumeDimensions(dims: VirtualVolumeDimensions): void {
        this.volumeDims = { ...dims }
    }

    /**
     * Get the initial/best pyramid level (set during construction)
     */
    getInitialLevel(): number {
        return this.state.pyramidLevel
    }

    /**
     * Get pyramid info
     */
    getPyramidInfo(): ZarrPyramidInfo {
        return this.pyramidInfo
    }
}
