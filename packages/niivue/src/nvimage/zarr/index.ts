/**
 * Zarr Viewer Module
 *
 * Provides chunk-based viewing of zarr datasets (commonly used for large
 * microscopy and scientific imaging data). NiiVue acts as a chunk client,
 * fetching chunks from a remote zarr store and assembling them into a
 * virtual NIfTI volume.
 *
 * For 3D datasets, the virtual volume enables full NiiVue multiplanar
 * and volume rendering capabilities.
 */

export { ZarrChunkCache, type TypedArray } from './ZarrChunkCache.js'

export { ZarrChunkClient, type ZarrChunkClientConfig, type ZarrPyramidLevel, type ZarrPyramidInfo, type ChunkCoord, type AxisMapping } from './ZarrChunkClient.js'

export { NVZarrHelper, type NVZarrHelperOptions } from './NVZarrHelper.js'
