/**
 * Manages viewport state and coordinate transformations for pyramidal TIFF viewing.
 * Handles conversions between screen coordinates, texture coordinates, and pyramid level coordinates.
 */

import type { PyramidInfo, PyramidLevel, TileCoord } from './TiffTileClient.js'

export interface TiffViewportState {
    /** Center X in level 0 (full-res) coordinates */
    centerX: number
    /** Center Y in level 0 (full-res) coordinates */
    centerY: number
    /** Display zoom factor (1.0 = fit image to texture) */
    zoom: number
    /** Current pyramid level (0 = highest resolution) */
    pyramidLevel: number
}

export interface VisibleRegion {
    /** Left edge in level coordinates */
    left: number
    /** Top edge in level coordinates */
    top: number
    /** Right edge in level coordinates */
    right: number
    /** Bottom edge in level coordinates */
    bottom: number
    /** The pyramid level these coordinates are in */
    level: number
}

export class TiffViewport {
    private pyramidInfo: PyramidInfo
    private textureWidth: number
    private textureHeight: number
    private state: TiffViewportState

    constructor(pyramidInfo: PyramidInfo, textureWidth: number, textureHeight: number) {
        this.pyramidInfo = pyramidInfo
        this.textureWidth = textureWidth
        this.textureHeight = textureHeight

        // Start at lowest resolution level (highest index), centered
        const level0 = pyramidInfo.levels[0]
        const lowestLevel = pyramidInfo.levels.length - 1

        this.state = {
            centerX: level0.width / 2,
            centerY: level0.height / 2,
            zoom: 1.0,
            pyramidLevel: lowestLevel
        }
    }

    /**
     * Get current viewport state
     */
    getState(): TiffViewportState {
        return { ...this.state }
    }

    /**
     * Update viewport state
     */
    setState(newState: Partial<TiffViewportState>): void {
        if (newState.centerX !== undefined) {
            this.state.centerX = newState.centerX
        }
        if (newState.centerY !== undefined) {
            this.state.centerY = newState.centerY
        }
        if (newState.zoom !== undefined) {
            this.state.zoom = Math.max(0.1, Math.min(10000, newState.zoom))
        }
        if (newState.pyramidLevel !== undefined) {
            this.state.pyramidLevel = Math.max(0, Math.min(this.pyramidInfo.levels.length - 1, newState.pyramidLevel))
        }
        // Ensure center stays within valid bounds
        this.clampCenter()
    }

    /**
     * Get the current pyramid level info
     */
    getCurrentLevel(): PyramidLevel {
        return this.pyramidInfo.levels[this.state.pyramidLevel]
    }

    /**
     * Get the scale factor from level 0 to current level
     */
    getLevelScale(): number {
        const level0 = this.pyramidInfo.levels[0]
        const currentLevel = this.getCurrentLevel()
        return currentLevel.width / level0.width
    }

    /**
     * Get the base scale that fits the image to the texture
     */
    private getBaseScale(): number {
        const level0 = this.pyramidInfo.levels[0]
        return Math.min(this.textureWidth / level0.width, this.textureHeight / level0.height)
    }

    /**
     * Get the effective scale from level 0 coordinates to screen pixels
     */
    getEffectiveScale(): number {
        return this.getBaseScale() * this.state.zoom
    }

    /**
     * Pan by screen pixels
     */
    pan(deltaScreenX: number, deltaScreenY: number): void {
        const scale = this.getEffectiveScale()
        // Convert screen delta to level 0 coordinates
        this.state.centerX -= deltaScreenX / scale
        this.state.centerY -= deltaScreenY / scale
        this.clampCenter()
    }

    /**
     * Zoom around a screen point
     */
    zoomAt(factor: number, screenX: number, screenY: number): void {
        // Convert screen point to level 0 coordinates
        const imgPos = this.screenToImage(screenX, screenY)

        // Apply zoom
        this.state.zoom = Math.max(0.1, Math.min(10000, this.state.zoom * factor))

        // Adjust center so the image point stays under the screen point
        const newScale = this.getEffectiveScale()
        const centerScreenX = this.textureWidth / 2
        const centerScreenY = this.textureHeight / 2

        this.state.centerX = imgPos.x - (screenX - centerScreenX) / newScale
        this.state.centerY = imgPos.y - (screenY - centerScreenY) / newScale
        this.clampCenter()
    }

    /**
     * Change pyramid level (keeps center position in level 0 coordinates)
     */
    setLevel(level: number): void {
        this.state.pyramidLevel = Math.max(0, Math.min(this.pyramidInfo.levels.length - 1, level))
    }

    /**
     * Clamp center position to keep image in view.
     * Matches the working tile-viewer.ts implementation.
     */
    private clampCenter(): void {
        const level0 = this.pyramidInfo.levels[0]
        const scale = this.getEffectiveScale()
        const halfViewWidth = this.textureWidth / 2 / scale
        const halfViewHeight = this.textureHeight / 2 / scale

        // Clamp center so viewport stays within image bounds
        // Allow the viewport to extend to edges but not beyond
        this.state.centerX = Math.max(-halfViewWidth, Math.min(level0.width + halfViewWidth, this.state.centerX))
        this.state.centerY = Math.max(-halfViewHeight, Math.min(level0.height + halfViewHeight, this.state.centerY))
    }

    /**
     * Convert screen coordinates to level 0 image coordinates
     */
    screenToImage(screenX: number, screenY: number): { x: number; y: number } {
        const scale = this.getEffectiveScale()
        const centerScreenX = this.textureWidth / 2
        const centerScreenY = this.textureHeight / 2

        return {
            x: this.state.centerX + (screenX - centerScreenX) / scale,
            y: this.state.centerY + (screenY - centerScreenY) / scale
        }
    }

    /**
     * Convert level 0 image coordinates to screen coordinates
     */
    imageToScreen(imageX: number, imageY: number): { x: number; y: number } {
        const scale = this.getEffectiveScale()
        const centerScreenX = this.textureWidth / 2
        const centerScreenY = this.textureHeight / 2

        return {
            x: centerScreenX + (imageX - this.state.centerX) * scale,
            y: centerScreenY + (imageY - this.state.centerY) * scale
        }
    }

    /**
     * Get the visible region in current pyramid level coordinates.
     * Output is clamped to level bounds to prevent requesting tiles outside the image.
     */
    getVisibleRegion(): VisibleRegion {
        const scale = this.getEffectiveScale()
        const levelScale = this.getLevelScale()
        const currentLevel = this.getCurrentLevel()

        // Calculate visible region in level 0 coords
        const halfWidth = this.textureWidth / 2 / scale
        const halfHeight = this.textureHeight / 2 / scale

        const left0 = this.state.centerX - halfWidth
        const top0 = this.state.centerY - halfHeight
        const right0 = this.state.centerX + halfWidth
        const bottom0 = this.state.centerY + halfHeight

        // Convert to current level coordinates and clamp to level bounds
        return {
            left: Math.max(0, left0 * levelScale),
            top: Math.max(0, top0 * levelScale),
            right: Math.min(currentLevel.width, right0 * levelScale),
            bottom: Math.min(currentLevel.height, bottom0 * levelScale),
            level: this.state.pyramidLevel
        }
    }

    /**
     * Get the visible region in level 0 (full resolution) coordinates
     */
    getVisibleRegionLevel0(): { left: number; top: number; right: number; bottom: number } {
        const scale = this.getEffectiveScale()

        // Calculate visible region in level 0 coords
        const halfWidth = this.textureWidth / 2 / scale
        const halfHeight = this.textureHeight / 2 / scale

        return {
            left: this.state.centerX - halfWidth,
            top: this.state.centerY - halfHeight,
            right: this.state.centerX + halfWidth,
            bottom: this.state.centerY + halfHeight
        }
    }

    /**
     * Get the tiles needed to cover the visible region
     */
    getVisibleTiles(): TileCoord[] {
        const MAX_TILES = 100 // Reasonable limit for viewport to prevent runaway requests
        const region = this.getVisibleRegion()
        const level = this.getCurrentLevel()
        const tiles: TileCoord[] = []

        // Calculate tile bounds
        const startTileX = Math.max(0, Math.floor(region.left / level.tileWidth))
        const startTileY = Math.max(0, Math.floor(region.top / level.tileHeight))
        const endTileX = Math.min(Math.ceil(level.width / level.tileWidth), Math.ceil(region.right / level.tileWidth))
        const endTileY = Math.min(Math.ceil(level.height / level.tileHeight), Math.ceil(region.bottom / level.tileHeight))

        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                tiles.push({
                    level: this.state.pyramidLevel,
                    x,
                    y
                })
                // Safety guard: cap tile count to prevent excessive requests
                if (tiles.length >= MAX_TILES) {
                    console.warn(`TIFF: Tile count capped at ${MAX_TILES}. Consider using a lower resolution pyramid level.`)
                    return tiles
                }
            }
        }

        return tiles
    }

    /**
     * Get the render info for mapping the visible region to the texture.
     * Uses effectiveScale consistently to match screenToImage coordinate transformation.
     * The viewport center (centerX, centerY) is always at the screen center.
     */
    getRenderInfo(): {
        renderScale: number
        offsetX: number
        offsetY: number
        regionWidth: number
        regionHeight: number
    } {
        const region = this.getVisibleRegion()
        const regionWidth = region.right - region.left
        const regionHeight = region.bottom - region.top

        // Use effectiveScale / levelScale to get screen pixels per current-level pixel
        // This ensures consistency with screenToImage coordinate transformation
        const effectiveScale = this.getEffectiveScale()
        const levelScale = this.getLevelScale()
        const renderScale = effectiveScale / levelScale

        // The viewport center (centerX, centerY in level 0 coords) is at screen center.
        // Offset is always 0 because we position tiles relative to the viewport center,
        // not by centering the clamped region.
        const offsetX = 0
        const offsetY = 0

        return { renderScale, offsetX, offsetY, regionWidth, regionHeight }
    }

    /**
     * Calculate the position and size of a tile in the texture buffer.
     * Tiles are positioned relative to the viewport center (centerX, centerY),
     * which is always at the screen center (textureWidth/2, textureHeight/2).
     * This ensures consistency with screenToImage coordinate transformation.
     */
    getTileDrawInfo(
        tileX: number,
        tileY: number
    ): {
        destX: number
        destY: number
        destWidth: number
        destHeight: number
        renderScale: number
    } {
        const level = this.getCurrentLevel()
        const levelScale = this.getLevelScale()
        const { renderScale } = this.getRenderInfo()

        // Tile position in current level pixel coordinates
        const tileLevelX = tileX * level.tileWidth
        const tileLevelY = tileY * level.tileHeight

        // Viewport center in current level coordinates
        const centerLevelX = this.state.centerX * levelScale
        const centerLevelY = this.state.centerY * levelScale

        // Position tile relative to viewport center, then offset to screen center
        // Screen center is at (textureWidth/2, textureHeight/2)
        const destX = this.textureWidth / 2 + (tileLevelX - centerLevelX) * renderScale
        const destY = this.textureHeight / 2 + (tileLevelY - centerLevelY) * renderScale

        return {
            destX,
            destY,
            destWidth: level.tileWidth * renderScale,
            destHeight: level.tileHeight * renderScale,
            renderScale
        }
    }

    /**
     * Get the best pyramid level for the current zoom
     * Higher zoom should use lower level numbers (higher resolution)
     */
    getBestLevelForZoom(): number {
        const effectiveScale = this.getEffectiveScale()
        const level0 = this.pyramidInfo.levels[0]

        // Find the highest resolution level where we don't oversample too much
        // pixelRatio = screen pixels per current-level image pixel
        //            = (screen pixels per level0 pixel) / (level pixels per level0 pixel)
        //            = effectiveScale / levelScale
        for (let i = 0; i < this.pyramidInfo.levels.length; i++) {
            const level = this.pyramidInfo.levels[i]
            const levelScale = level.width / level0.width
            const pixelRatio = effectiveScale / levelScale

            // If this level would give us at least 0.5 screen pixels per image pixel,
            // it's a good choice (not oversampling too much)
            if (pixelRatio >= 0.5) {
                return i
            }
        }

        // Default to lowest resolution
        return this.pyramidInfo.levels.length - 1
    }

    /**
     * Get the best pyramid level with hysteresis to prevent rapid switching.
     * Uses asymmetric thresholds to avoid flickering at zoom boundaries.
     * @param currentLevel - Current pyramid level for hysteresis comparison
     */
    getBestLevelForZoomWithHysteresis(currentLevel: number): number {
        const effectiveScale = this.getEffectiveScale()
        const level0 = this.pyramidInfo.levels[0]

        // Asymmetric thresholds prevent flickering at boundaries
        // pixelRatio = screen pixels per current-level image pixel = effectiveScale / levelScale
        const UPGRADE_THRESHOLD = 1.2 // Go to higher res when we have > 1.2 screen pixels per image pixel
        const DOWNGRADE_THRESHOLD = 0.4 // Go to lower res when we have < 0.4 screen pixels per image pixel

        // Check if we should upgrade to higher resolution (lower index)
        // We upgrade when the CURRENT level is oversampled (too many screen pixels per image pixel)
        if (currentLevel > 0) {
            const currentLevelInfo = this.pyramidInfo.levels[currentLevel]
            const currentLevelScale = currentLevelInfo.width / level0.width
            const currentPixelRatio = effectiveScale / currentLevelScale

            if (currentPixelRatio >= UPGRADE_THRESHOLD) {
                return this.getBestLevelForZoomWithHysteresis(currentLevel - 1)
            }
        }

        // Check if we should downgrade to lower resolution (higher index)
        // We downgrade when the current level is undersampled (too few screen pixels per image pixel)
        const currentLevelInfo = this.pyramidInfo.levels[currentLevel]
        const currentLevelScale = currentLevelInfo.width / level0.width
        const currentPixelRatio = effectiveScale / currentLevelScale

        if (currentPixelRatio < DOWNGRADE_THRESHOLD && currentLevel < this.pyramidInfo.levels.length - 1) {
            return this.getBestLevelForZoomWithHysteresis(currentLevel + 1)
        }

        return currentLevel
    }

    /**
     * Update texture dimensions (e.g., on canvas resize)
     */
    setTextureDimensions(width: number, height: number): void {
        this.textureWidth = width
        this.textureHeight = height
    }

    /**
     * Get texture dimensions
     */
    getTextureDimensions(): { width: number; height: number } {
        return {
            width: this.textureWidth,
            height: this.textureHeight
        }
    }

    /**
     * Get pyramid info
     */
    getPyramidInfo(): PyramidInfo {
        return this.pyramidInfo
    }
}
