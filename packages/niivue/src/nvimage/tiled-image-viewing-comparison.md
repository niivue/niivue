# TIFF vs Zarr Image Viewing: Comparison

This document compares the OME TIFF and OME Zarr image viewing implementations in NiiVue, highlighting their similarities and key differences.

## Architectural Similarities

Both implementations share the same fundamental architecture:

```
Main Class (NVTiffImage / NVZarrImage)
    ├── Viewport (TiffViewport / ZarrViewport)
    ├── Cache (TiffTileCache / ZarrChunkCache)
    └── Client (TiffTileClient / ZarrChunkClient)
```

### Shared Design Patterns

| Pattern | Description |
|---------|-------------|
| **Lazy Loading** | Data only fetched when visible in viewport |
| **Pyramid Resolution** | Multiple resolution levels for efficient zooming |
| **LRU Caching** | Bounded memory with least-recently-used eviction |
| **Level 0 Coordinates** | All viewport state stored in full-resolution space |
| **Hysteresis Level Selection** | Prevents flickering with upgrade (≥1.2) / downgrade (<0.4) thresholds |
| **Request Deduplication** | Loading set prevents duplicate fetches |
| **Debounced Updates** | `requestAnimationFrame()` batches rapid interactions |
| **NVImage Integration** | Both create standard NVImage objects for NiiVue rendering |

### Identical Viewport Logic

Both implementations use the same formulas for:
- **Pan**: `center -= delta / effectiveScale`
- **Zoom**: Keeps point under cursor by adjusting center
- **Level Selection**: Same hysteresis thresholds (1.2 upgrade, 0.4 downgrade)
- **Coordinate Transforms**: Screen ↔ Image ↔ Level conversions

### Shared Cache Design

Both caches:
- Use `Map` for O(1) lookup with insertion-order iteration
- Default to 500 items maximum
- Track loading state with a separate `Set`
- Provide `has()`, `get()`, `set()`, `isLoading()`, `startLoading()`, `doneLoading()` methods

## Key Differences

### 1. Dimensionality

| Aspect | TIFF | Zarr |
|--------|------|------|
| **Primary Use** | 2D WSI (pathology slides) | 2D and 3D (microscopy volumes) |
| **Coordinate System** | X, Y only | X, Y, Z |
| **Output** | 2D RGBA texture | 3D volume texture |

### 2. Data Format & Storage

| Aspect | TIFF | Zarr |
|--------|------|------|
| **Cached Type** | `ImageBitmap` (GPU-backed) | `TypedArray` (CPU memory) |
| **Resource Cleanup** | `ImageBitmap.close()` needed | Garbage collected automatically |
| **Color Support** | RGBA (4 channels) | Single channel (grayscale) |
| **Data Types** | Always RGBA32 | Multiple (uint8, uint16, float32, etc.) |

### 3. Texture/Volume Strategy

| Aspect | TIFF | Zarr |
|--------|------|------|
| **Output Size** | Configurable texture (default 1024×1024) | Fixed virtual volume (default 256×256×256) |
| **Scaling Approach** | Tiles drawn at destination scale via `OffscreenCanvas` | Chunks scaled during assembly via manual interpolation |
| **Background** | Dark blue fill (26, 26, 46) | Zero-filled volume |

### 4. Network Layer

| Aspect | TIFF | Zarr |
|--------|------|------|
| **Protocol** | HTTP tile server with URL patterns | Zarrita library for zarr arrays |
| **Discovery** | Tile server provides PyramidInfo | OME metadata or level probing |
| **Fetch Unit** | Pre-rendered image tiles | Raw array chunks |
| **Response Format** | Image blob → `createImageBitmap()` | Binary → TypedArray |

### 5. Pyramid Discovery

**TIFF:**
- Single HTTP request to tile server for `PyramidInfo`
- Server provides level count, dimensions, tile size

**Zarr:**
- Multi-step discovery:
  1. Try as single array
  2. Check `.ome.multiscales` metadata
  3. Fall back to `.multiscales`
  4. Probe levels 0-19 if needed

### 6. Request Limits

| Limit | TIFF | Zarr |
|-------|------|------|
| **Max per update** | 100 tiles | 1000 chunks |

### 7. Calibration

| Aspect | TIFF | Zarr |
|--------|------|------|
| **Intensity Window** | Not needed (pre-rendered RGBA) | Computed from assembled data |
| **Post-Assembly** | None | Samples voxels to find min/max |

### 8. Rendering Integration

**TIFF:**
- Creates 2D RGBA texture
- Tiles composited directly to RGBA buffer
- Y-axis flip during pixel copy
- Suitable for 2D orthogonal display

**Zarr:**
- Creates 3D volume
- Chunks assembled into typed array buffer
- Y-axis flip during assembly
- Supports all NiiVue rendering modes (multiplanar, volume rendering, etc.)

## Code Structure Comparison

### Main Class Methods

| Method | TIFF | Zarr |
|--------|------|------|
| Factory | `create(url, options)` | `create(url, options)` |
| Pan | `pan(deltaX, deltaY)` | `panBy(deltaX, deltaY, deltaZ)` |
| Zoom | `zoomAt(factor, x, y)` | `zoomAt(factor, x, y)` |
| Update | `updateTexture()` | `updateVolume()` |
| Compose | `compositeVisibleTiles()` | `assembleVisibleChunks()` |
| Draw Unit | `drawTileToImage()` | `assembleChunkIntoVolume()` |

### Viewport Methods

Both have nearly identical APIs:
- `getState()` / `setState()`
- `pan()` / `zoomAt()`
- `screenToImage()` / `imageToScreen()`
- `getVisible[Tiles|Chunks]()`
- `get[Tile|Chunk]DrawInfo|Placement()`
- `getBestLevelForZoomWithHysteresis()`

### Cache Methods

Identical interface:
- `has(key)`, `get(key)`, `set(key, data)`
- `isLoading(key)`, `startLoading(key)`, `doneLoading(key)`
- `clear()`, `delete(key)`

## When to Use Each

### Use TIFF When:
- Displaying 2D whole slide images (pathology, histology)
- Source data is pyramidal TIFF from a tile server
- Color/RGB data is required
- Working with standard WSI infrastructure

### Use Zarr When:
- Displaying 3D volumetric data
- Source data is in OME-Zarr format
- Need multiplanar or volume rendering
- Working with microscopy pipelines that produce Zarr
- Need precise intensity values (not pre-rendered RGB)

## Future Unification Opportunities

The implementations are similar enough that a unified base class could be extracted:

1. **Shared Viewport Logic**: Coordinate transforms, hysteresis, pan/zoom math
2. **Shared Cache Interface**: LRU eviction, loading tracking
3. **Abstract Loader Pattern**: Format-specific subclasses for TIFF and Zarr
4. **Common Options**: Texture size, cache limits, callbacks

Key abstraction points:
- `fetchUnit(coords)` - returns either ImageBitmap or TypedArray
- `assembleUnit(unit, placement)` - format-specific composition
- `createOutputImage()` - 2D texture vs 3D volume
