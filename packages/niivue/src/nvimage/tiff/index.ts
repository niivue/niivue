/**
 * TIFF Pyramid Viewer Module
 *
 * Provides tile-based viewing of pyramidal TIFF images (commonly used for histopathology WSI).
 * NiiVue acts as a tile client, fetching tiles from an external tile server.
 */

export { TiffTileClient, type TiffTileClientConfig, type PyramidLevel, type PyramidInfo, type TileCoord } from './TiffTileClient.js'

export { TiffTileCache } from './TiffTileCache.js'

export { TiffViewport, type TiffViewportState, type VisibleRegion } from './TiffViewport.js'

export { NVTiffImage, type NVTiffImageOptions, type TileLoadInfo, type LevelChangeInfo } from './NVTiffImage.js'
