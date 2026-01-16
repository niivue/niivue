# OME TIFF Tiled WSI Image Viewing

This document describes how NiiVue handles OME TIFF tiled Whole Slide Imaging (WSI) visualization using a lazy-loading, pyramidal tile architecture.

## Overview

The TIFF viewing system enables visualization of large pyramidal TIFF images (common in pathology/histology) by:
- Loading only visible tiles on demand
- Using multiple resolution levels (pyramid) for efficient zooming
- Caching tiles with LRU eviction to manage memory
- Compositing tiles into a fixed-size WebGL texture

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              NVTiffImage (Integration Layer)            │
│   - Main API for NiiVue integration                     │
│   - Manages texture updates and tile compositing        │
└────┬────────────────┬─────────────────────┬─────────────┘
     │                │                     │
     ▼                ▼                     ▼
┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
│ TiffViewport │  │ TiffTileCache  │  │ TiffTileClient   │
│ (Coordinates)│  │ (Memory Mgmt)  │  │ (Network)        │
└──────────────┘  └────────────────┘  └──────────────────┘
```

## File Structure

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `NVTiffImage.ts` | Integration class orchestrating all components |
| `TiffViewport.ts` | Viewport state, coordinate transforms, pyramid level selection |
| `TiffTileCache.ts` | LRU cache for tile ImageBitmaps |
| `TiffTileClient.ts` | HTTP tile fetching and pyramid metadata |

## Key Concepts

### Pyramid Structure

TIFF pyramids contain multiple resolution levels:
- **Level 0**: Full resolution (highest detail)
- **Level N**: Progressively lower resolution (each level typically 2x smaller)

The system automatically selects the appropriate level based on current zoom.

### Coordinate Spaces

| Space | Description | Use Case |
|-------|-------------|----------|
| **Level 0** | Full-resolution image pixels | Source of truth for pan/zoom state |
| **Current Level** | Downsampled pyramid level pixels | Tile calculations |
| **Screen/Texture** | Viewport center-relative | Pixel drawing to texture |

All viewport state (center, zoom) is maintained in Level 0 coordinates for consistency across level changes.

## Tile Loading Strategy

### Lazy Loading Flow

1. **Visible Tile Identification**: `viewport.getVisibleTiles()` determines which tiles intersect the current view
2. **Three-Way Classification**:
   - Cached tiles → Draw immediately
   - Loading tiles → Skip (avoid duplicate requests)
   - Uncached tiles → Fetch in parallel
3. **Parallel Fetching**: All uncached tiles fetched concurrently via `Promise.all()`
4. **Incremental Drawing**: Tiles drawn as they arrive (with level validation)

### Request Management

- Maximum 100 tiles per update to prevent runaway requests
- Loading state tracked via `TiffTileCache.loadingSet` to prevent duplicates
- Debounced updates via `requestAnimationFrame()` to batch rapid interactions

## Caching

### LRU Cache (`TiffTileCache`)

- **Default capacity**: 500 tiles
- **Storage format**: `ImageBitmap` (GPU-backed, efficient)
- **Key format**: `${level}/${x}/${y}`
- **Eviction**: Oldest entry removed when capacity exceeded
- **Resource cleanup**: `ImageBitmap.close()` called on eviction to free GPU memory

### Loading State Tracking

```typescript
// Prevents duplicate fetches
cache.isLoading(key)  // Check if request in flight
cache.startLoading(key)  // Mark request started
cache.doneLoading(key)  // Mark request complete
```

## Viewport Management (`TiffViewport`)

### State

```typescript
interface TiffViewportState {
  centerX: number      // Level 0 coordinates
  centerY: number      // Level 0 coordinates
  zoom: number         // Display zoom factor (1.0 = fit)
  pyramidLevel: number // 0 = highest res, n = lowest res
}
```

### Pan Operation

```typescript
pan(deltaScreenX, deltaScreenY) {
  scale = baseScale * zoom
  centerX -= deltaScreenX / scale  // Convert screen pixels to level 0 coords
  centerY -= deltaScreenY / scale
}
```

### Zoom Operation

Zoom is applied around a screen point to keep the image point under the cursor:

```typescript
zoomAt(factor, screenX, screenY) {
  imgPos = screenToImage(screenX, screenY)  // Point to keep under cursor
  zoom *= factor
  centerX = imgPos.x - (screenX - centerScreenX) / newScale
  centerY = imgPos.y - (screenY - centerScreenY) / newScale
}
```

### Automatic Level Selection with Hysteresis

To prevent flickering when zooming near level boundaries:

| Threshold | Condition | Action |
|-----------|-----------|--------|
| Upgrade | pixelRatio ≥ 1.2 | Switch to higher resolution |
| Downgrade | pixelRatio < 0.4 | Switch to lower resolution |
| Dead zone | 0.4 ≤ pixelRatio < 1.2 | Stay at current level |

Algorithm:
1. Calculate pixel ratio: `effectiveScale / levelScale`
2. If oversampled (≥1.2), try next higher resolution level
3. If undersampled (<0.4), try next lower resolution level
4. Otherwise, maintain current level

## Rendering Pipeline

### NVImage Integration

The TIFF system creates a synthetic `NVImage` that acts as a viewport-sized texture:
- **Format**: RGBA32 (DT_RGBA32)
- **Dimensions**: Configurable (default 1024×1024)
- **Data buffer**: `Uint8Array` in `image.img`

NiiVue's standard WebGL renderer displays this texture like any other 2D image.

### Tile Compositing Process

1. **Get tile draw info**: `viewport.getTileDrawInfo(tileX, tileY)` returns destination position and scale
2. **Calculate destination rectangle**: Clamp to texture bounds for partial tiles at edges
3. **Scale and sample tile**: Use `OffscreenCanvas` to draw `ImageBitmap` with scaling
4. **Copy to RGBA buffer**: Y-coordinate flipping (WebGL origin at bottom), pixel-by-pixel copy

### Background

Canvas cleared with dark blue background (RGB: 26, 26, 46) before each draw. Unfilled regions show this background.

## Data Flow

```
User Interaction (pan/zoom)
        ↓
NVTiffImage.pan/zoomAt()
        ↓
TiffViewport updates state
        ↓
Auto-select pyramid level (hysteresis)
        ↓
NVTiffImage.updateTexture() [debounced]
        ↓
TiffViewport.getVisibleTiles()
        ↓
Separate: cached / uncached / loading
        ↓
Draw cached tiles immediately
        ↓
Fetch uncached tiles in parallel
        ↓
Cache tiles (LRU eviction if needed)
        ↓
Draw each tile via getTileDrawInfo()
        ↓
Composite to NVImage.img buffer
        ↓
NiiVue WebGL renderer displays
```

## Public API

### NVTiffImage Methods

| Method | Description |
|--------|-------------|
| `create(url, options)` | Factory method for initialization |
| `pan(deltaX, deltaY)` | Pan viewport by screen pixels |
| `zoomAt(factor, screenX, screenY)` | Zoom around a point |
| `setPyramidLevel(level)` | Manually set resolution level |
| `setViewportState(state)` | Set complete viewport state |
| `getViewportState()` | Get current viewport state |
| `updateTexture()` | Force texture refresh |

### Events/Callbacks

- `onTileLoad`: Fired when tiles finish loading
- `onLevelChange`: Fired when pyramid level changes

## Performance Considerations

### Memory Management
- Tiles stored as `ImageBitmap` for GPU efficiency
- Explicit `ImageBitmap.close()` on eviction frees resources
- Configurable texture size (capped by WebGL MAX_TEXTURE_SIZE)
- LRU cache bounds memory usage

### Optimization Strategies
- Parallel tile fetching
- Request deduplication
- Debounced updates
- Level change validation (discard stale tiles)

### Current Limitations
- No prefetching (tiles fetched only when visible)
- Fixed tile count cap (100 per update)
- Nearest-neighbor interpolation only

## Example Usage

```typescript
const tiffImage = await NVTiffImage.create({
  url: 'https://example.com/slide.tif',
  textureWidth: 1024,
  textureHeight: 1024,
  maxCachedTiles: 500,
  onTileLoad: (loaded, total) => {
    console.log(`Loaded ${loaded}/${total} tiles`)
  }
})

// Add to NiiVue
nv.addVolume(tiffImage.image)

// Interact
tiffImage.zoomAt(1.5, canvas.width/2, canvas.height/2)
tiffImage.pan(100, 50)
```
