# TIFF Pyramidal Image Reader - Implementation Progress

## Overview

Adding support for large pyramidal TIFF files (WSI images) to NiiVue. The approach loads TIFF tiles into a virtual NIfTI volume that NiiVue can render. Tiles are fetched on-demand as the user navigates (pan, zoom). Pyramid levels are automatically selected based on zoom level.

## Architecture

### Key Files

- `src/nvimage/tiff/TiffTileClient.ts` - HTTP client for fetching tiles from a tile server
- `src/nvimage/tiff/TiffTileCache.ts` - LRU cache for tile ImageBitmaps
- `src/nvimage/tiff/TiffViewport.ts` - Manages viewport state, coordinate transformations, and automatic pyramid level selection
- `src/nvimage/tiff/NVTiffImage.ts` - Main integration class, writes tiles to NVImage buffer with Y-flip for WebGL
- `src/niivue/index.ts` - NiiVue integration (loadTiffFromServer, wheel zoom handler with DPR support)
- `src/index_tiff.html` - Demo page

### Data Flow

1. User loads TIFF via `niivue.loadTiffFromServer(serverUrl, imageName)`
2. `NVTiffImage` creates a virtual NVImage with RGBA format sized to canvas dimensions
3. `TiffViewport` calculates which tiles are visible based on pan/zoom
4. Pyramid level is automatically selected via `getBestLevelForZoomWithHysteresis()`
5. Visible tiles are fetched via `TiffTileClient` and cached in `TiffTileCache`
6. Tiles are drawn to `NVImage.img` buffer via `drawTileToImage()` with Y-flip for WebGL
7. `updateGLVolume()` uploads the buffer to WebGL for rendering

### Coordinate Systems

- **Level 0 coordinates**: Full resolution image space (used for viewport state: centerX, centerY)
- **Current level coordinates**: Pyramid level pixel space (used for tile positions)
- **Screen coordinates**: Canvas pixels, scaled by device pixel ratio (DPR)
- **Buffer coordinates**: Position within NVImage.img buffer (Y-flipped for WebGL)

## User Controls

- **Drag**: Pan the image
- **Scroll wheel**: Zoom toward cursor position (pyramid levels change automatically)

## Unified Zoom System

The TIFF viewer uses a unified zoom system where pyramid levels are automatically selected based on the zoom factor. This provides a seamless zooming experience without requiring manual level switching.

### Automatic Pyramid Level Selection

The `getBestLevelForZoomWithHysteresis()` method selects the optimal pyramid level:

```typescript
// pixelRatio = screen pixels per current-level image pixel
// pixelRatio = effectiveScale / levelScale

const UPGRADE_THRESHOLD = 1.2   // Go to higher res when oversampling
const DOWNGRADE_THRESHOLD = 0.4 // Go to lower res when undersampling

// Upgrade: when current level shows > 1.2 screen pixels per image pixel
// Downgrade: when current level shows < 0.4 screen pixels per image pixel
// Hysteresis zone (0.4 - 1.2): maintains current level to prevent flickering
```

### Zoom Limits

- Minimum zoom: 0.1 (zoomed out)
- Maximum zoom: 10,000 (allows deep zoom into very large WSI images)

### Device Pixel Ratio (DPR) Support

Screen coordinates from mouse events are multiplied by `this.uiData.dpr` to convert from CSS pixels to canvas pixels, ensuring correct behavior on high-DPI displays (e.g., Retina).

## Coordinate Transformation

### Screen to Image

```typescript
screenToImage(screenX: number, screenY: number): { x: number; y: number } {
    const scale = this.getEffectiveScale()
    return {
        x: this.state.centerX + (screenX - textureWidth / 2) / scale,
        y: this.state.centerY + (screenY - textureHeight / 2) / scale
    }
}
```

### Tile Positioning

Tiles are positioned relative to the viewport center, which is always at the screen center:

```typescript
getTileDrawInfo(tileX, tileY) {
    const centerLevelX = this.state.centerX * levelScale
    const centerLevelY = this.state.centerY * levelScale

    const destX = textureWidth / 2 + (tileLevelX - centerLevelX) * renderScale
    const destY = textureHeight / 2 + (tileLevelY - centerLevelY) * renderScale

    return { destX, destY, destWidth, destHeight, renderScale }
}
```

### Y-Flip for WebGL

When writing tiles to the NVImage buffer, Y coordinates are flipped because WebGL has Y=0 at the bottom while screen coordinates have Y=0 at the top:

```typescript
// In drawTileToImage():
const dstRow = textureHeight - 1 - destY - row
```

## Scale Calculations

```typescript
// Base scale: fits entire image in texture at zoom=1.0
baseScale = min(textureWidth / level0.width, textureHeight / level0.height)

// Effective scale: screen pixels per level 0 pixel
effectiveScale = baseScale * zoom

// Level scale: ratio of current level to level 0
levelScale = currentLevel.width / level0.width

// Render scale: screen pixels per current-level pixel
renderScale = effectiveScale / levelScale

// Pixel ratio: for level selection (screen pixels per current-level image pixel)
pixelRatio = effectiveScale / levelScale
```

## Current State

The TIFF viewer now supports:
- ✅ Unified zoom with automatic pyramid level selection
- ✅ Zoom toward cursor position at all zoom levels
- ✅ Correct image orientation (Y-flip handled)
- ✅ High-DPI display support (DPR scaling)
- ✅ Consistent coordinate transformations across all pyramid levels
- ✅ Pan without excessive tile fetching
- ✅ Deep zoom into very large WSI images (zoom up to 10,000x)
- ✅ Hysteresis to prevent rapid level switching at zoom boundaries

## Bug Fixes

### Panning Infinite Loop Fix (Jan 2026)

**Problem**: Right-clicking to initiate a pan gesture triggered runaway tile fetching (thousands of requests) before any actual drag movement occurred.

**Root Cause**: The `dragForPanZoom()` method was called during every `drawScene()` while dragging. It unconditionally called `setViewportState()`, which after completing would call `drawScene()` again via its `.then()` callback, creating an infinite loop:

```
drawScene() → dragForPanZoom() → setViewportState() → updateTexture()
    → .then() → drawScene() → dragForPanZoom() → ... (infinite)
```

**Fixes Applied**:

1. **Loop prevention in `dragForPanZoom()`** (`src/niivue/index.ts`):
   - Skip update when `deltaX === 0 && deltaY === 0` (click without movement)
   - Skip update when new center position ≈ current center (prevents loop after drag stops)

2. **Debouncing fix in `updateTexture()`** (`src/nvimage/tiff/NVTiffImage.ts`):
   - Moved `pendingUpdate = false` to AFTER `compositeVisibleTiles()` completes
   - Prevents concurrent tile fetch operations during rapid panning

3. **Auto pyramid level selection** (`src/nvimage/tiff/NVTiffImage.ts`):
   - Added automatic level selection to `setViewportState()`
   - Ensures optimal pyramid level is maintained during pan operations

4. **Safety guard in `getVisibleTiles()`** (`src/nvimage/tiff/TiffViewport.ts`):
   - Added MAX_TILES = 100 cap to prevent runaway requests
   - Logs warning if cap is reached (indicates suboptimal pyramid level)

## Potential Future Enhancements

- **Tile prefetching**: Preload tiles for adjacent pyramid levels during zoom
- **Smooth level transitions**: Fade between levels during pyramid level changes
- **Touch gestures**: Pinch-to-zoom support for touch devices
