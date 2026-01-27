# OME Zarr Image Viewing

This document describes how NiiVue handles OME Zarr image visualization using a lazy-loading, chunked pyramid architecture with support for both 2D and 3D datasets.

## Overview

The Zarr viewing system enables visualization of large OME-Zarr datasets (common in microscopy and large-scale imaging) by:
- Loading only visible chunks on demand
- Using multiple resolution levels (pyramid) for efficient zooming
- Caching chunks with LRU eviction to manage memory
- Assembling chunks into a fixed-size virtual volume for WebGL rendering
- Supporting both 2D and 3D data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              NVZarrImage (Integration Layer)            │
│   - Main API for NiiVue integration                     │
│   - Manages volume updates and chunk assembly           │
└────┬────────────────┬─────────────────────┬─────────────┘
     │                │                     │
     ▼                ▼                     ▼
┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
│ ZarrViewport │  │ ZarrChunkCache │  │ ZarrChunkClient  │
│ (Coordinates)│  │ (Memory Mgmt)  │  │ (Network+Zarrita)│
└──────────────┘  └────────────────┘  └──────────────────┘
```

## File Structure

| File | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `NVZarrImage.ts` | Integration class orchestrating all components |
| `ZarrViewport.ts` | Viewport state, coordinate transforms, pyramid level selection |
| `ZarrChunkCache.ts` | LRU cache for chunk TypedArrays |
| `ZarrChunkClient.ts` | HTTP client for discovering and fetching chunks via zarrita |

## Key Concepts

### Pyramid Structure

OME-Zarr datasets contain multiple resolution levels (multiscales):
- **Level 0**: Full resolution (highest detail)
- **Level N**: Progressively lower resolution

The system automatically selects the appropriate level based on current zoom.

### Fixed Virtual Volume

A key design principle: **the virtual volume size never changes**. Instead:
- Virtual volume is fixed (default 256×256×256)
- All coordinates kept in Level 0 (full resolution) space
- When zooming/panning, data is **scaled to fill the texture** at any pyramid level
- This enables smooth, seamless zooming between pyramid levels

### Coordinate Spaces

| Space | Description | Use Case |
|-------|-------------|----------|
| **Level 0** | Full-resolution image pixels | Source of truth for viewport state |
| **Level N** | Scaled by pyramid level factor | Chunk calculations |
| **Texture** | Virtual volume pixels (0-256) | Data assembly |
| **Screen** | Canvas pixels | User interaction |

## Chunk Loading Strategy

### Lazy Loading Flow

1. **Visible Region Calculation**: `viewport.getVisibleRegion()` determines the Level 0 area visible
2. **Chunk Identification**: `viewport.getVisibleChunks()` maps to chunk coordinates
3. **Two-Way Classification**:
   - Cached chunks → Assemble immediately
   - Uncached chunks → Fetch in parallel
4. **Progressive Assembly**: Chunks assembled as they arrive

### Request Management

- Maximum 1000 chunks per update to prevent memory explosion
- Loading state tracked via `ZarrChunkCache.loadingSet` to prevent duplicates
- Debounced updates via `requestAnimationFrame()` to batch rapid interactions

## Caching

### LRU Cache (`ZarrChunkCache`)

- **Default capacity**: 500 chunks
- **Storage format**: `TypedArray` (Uint8Array, Uint16Array, Float32Array, etc.)
- **Key format**: `${name}:${level}/${x}/${y}/${z}` (3D) or `${name}:${level}/${x}/${y}` (2D)
- **Eviction**: Oldest entry removed when capacity exceeded

### Loading State Tracking

```typescript
// Prevents duplicate fetches
cache.isLoading(key)   // Check if request in flight
cache.startLoading(key)  // Mark request started
cache.doneLoading(key)   // Mark request complete
```

## Viewport Management (`ZarrViewport`)

### State

```typescript
interface ZarrViewportState {
  centerX: number      // Level 0 coordinates
  centerY: number      // Level 0 coordinates
  centerZ: number      // Level 0 coordinates (for 3D)
  zoom: number         // Display zoom factor (1.0 = fit)
  pyramidLevel: number // 0 = highest res, n = lowest res
}
```

### Pan Operation

```typescript
pan(deltaX, deltaY, deltaZ) {
  scale = baseScale * zoom
  centerX -= deltaX / scale  // Convert to level 0 coords
  centerY -= deltaY / scale
  centerZ -= deltaZ / scale
}
```

### Zoom Operation

Zoom is applied around a point to keep the image location under the cursor:

```typescript
zoomAt(factor, screenX, screenY, screenZ) {
  imgPos = screenToImage(screenX, screenY, screenZ)
  zoom *= factor
  // Adjust center to keep imgPos under screen position
  centerX = imgPos.x - (screenX - volumeCenterX) / newScale
  // ... similar for Y and Z
}
```

### Automatic Level Selection with Hysteresis

To prevent flickering when zooming near level boundaries:

| Threshold | Condition | Action |
|-----------|-----------|--------|
| Upgrade | pixelRatio ≥ 1.2 | Switch to higher resolution |
| Downgrade | pixelRatio < 0.4 | Switch to lower resolution |
| Dead zone | 0.4 ≤ pixelRatio < 1.2 | Stay at current level |

## Rendering Pipeline

### NVImage Integration

The Zarr system creates a standard `NVImage` object:
- **Format**: Matches zarr dtype (Uint8, Uint16, Float32, etc.)
- **Dimensions**: Fixed virtual volume (default 256×256×256)
- **Data buffer**: TypedArray in `image.img`

NiiVue's standard WebGL renderer displays this as a regular volume, supporting all rendering modes (multiplanar, volume rendering, etc.).

### Chunk Assembly Process

1. **Get chunk placement**: `viewport.getChunkPlacement(chunkCoords)` returns destination position and scale
2. **Scale chunk data**: Apply `renderScale` factor to fill texture region
3. **Handle Y-axis flip**: WebGL origin at bottom, screen at top
4. **Nearest-neighbor interpolation**: For upscaling chunks to texture resolution
5. **Copy to volume buffer**: Write scaled data to `image.img` at calculated position

### Calibration

After assembly:
- Scan data to find min/max values for intensity window
- Sample every nth voxel for performance (step = max(1, length/10000))
- Update `cal_min`, `cal_max`, `robust_min`, `robust_max`

## Data Flow

```
User Interaction (pan/zoom)
        ↓
NVZarrImage.zoomAt/panBy()
        ↓
ZarrViewport updates state
        ↓
Auto-select pyramid level (hysteresis)
        ↓
NVZarrImage.updateVolume() [debounced]
        ↓
Clear volume buffer
        ↓
ZarrViewport.getVisibleChunks()
        ↓
Separate: cached / uncached
        ↓
Assemble cached chunks immediately
        ↓
Fetch uncached chunks via zarrita
        ↓
Cache chunks (LRU eviction if needed)
        ↓
Assemble newly fetched chunks
        ↓
Calibrate intensity range
        ↓
NiiVue WebGL renderer displays
```

## Pyramid Discovery

The `ZarrChunkClient` discovers pyramid structure in order:

1. **Single array**: Try opening as non-pyramidal zarr array
2. **OME metadata**: Look for `.ome.multiscales` attribute
3. **Legacy metadata**: Fall back to `.multiscales` attribute
4. **Probe**: Try `/0`, `/1`, `/2`, ... up to 20 levels

## Datatype Support

| Zarr dtype | NIfTI type | TypedArray |
|------------|------------|------------|
| uint8, int8 | DT_UINT8 | Uint8Array |
| uint16 | DT_UINT16 | Uint16Array |
| int16, int32 | DT_INT16 | Int16Array |
| uint32 | DT_FLOAT32 | Float32Array |
| float32 | DT_FLOAT32 | Float32Array |
| float64 | DT_FLOAT64 | Float64Array |

## Public API

### NVZarrImage Methods

| Method | Description |
|--------|-------------|
| `create(url, options)` | Factory method for initialization |
| `panBy(deltaX, deltaY, deltaZ)` | Pan viewport by screen pixels |
| `zoomAt(factor, screenX, screenY)` | Zoom around a point |
| `setPyramidLevel(level)` | Manually set resolution level |
| `setViewportState(state)` | Set complete viewport state |
| `getViewportState()` | Get current viewport state |
| `updateVolume()` | Force volume refresh |

### Events/Callbacks

- `onChunkLoad`: Fired during chunk loading with progress `(loaded, total)`
- `onLevelChange`: Fired when pyramid level changes

## Performance Considerations

### Memory Management
- Chunks stored as TypedArrays matching source dtype
- LRU cache with configurable capacity bounds memory usage
- Fixed virtual volume size prevents resize overhead

### Optimization Strategies
- Parallel chunk fetching via `Promise.all()`
- Request deduplication via loading set
- Debounced updates
- Level change validation (discard stale chunks)
- Sampled calibration for large volumes

### Current Limitations
- No prefetching (chunks fetched only when visible)
- Nearest-neighbor interpolation only (no bilinear/trilinear)
- Y-axis flip done per-voxel during assembly

## Example Usage

```typescript
const zarrImage = await NVZarrImage.create({
  url: 'https://example.com/dataset.zarr',
  volumeWidth: 256,
  volumeHeight: 256,
  volumeDepth: 256,
  maxCachedChunks: 500,
  onChunkLoad: (loaded, total) => {
    console.log(`Loaded ${loaded}/${total} chunks`)
  }
})

// Add to NiiVue
nv.addVolume(zarrImage.image)

// Interact
zarrImage.zoomAt(1.5, canvas.width/2, canvas.height/2)
zarrImage.panBy(100, 50, 0)
```

## 2D vs 3D Handling

The Zarr system supports both:
- **2D datasets**: Single Z slice, chunk coordinates `[y, x]`
- **3D datasets**: Full volume, chunk coordinates `[z, y, x]`

Chunk ordering follows microscopy conventions where Z is the slowest-varying dimension.
