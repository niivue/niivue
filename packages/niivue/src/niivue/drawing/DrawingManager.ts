/**
 * Drawing management pure functions for handling drawing state, undo/redo,
 * and drawing bitmap operations.
 *
 * This module provides pure functions for drawing state management.
 * WebGL texture operations remain in the Niivue class.
 *
 * Related modules:
 * - @/drawing/undo.ts - Undo operation
 * - @/drawing/rle.ts - RLE encoding/decoding
 * - @/drawing/masks.ts - Mask interpolation
 */

import { log } from '@/logger'
import { encodeRLE, decodeRLE } from '@/drawing'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Parameters for adding an undo bitmap
 */
export interface AddUndoBitmapParams {
    drawBitmap: Uint8Array | null
    drawUndoBitmaps: Uint8Array[]
    currentDrawUndoBitmap: number
    maxDrawUndoBitmaps: number
    drawFillOverwrites: boolean
}

/**
 * Result of adding an undo bitmap
 */
export interface AddUndoBitmapResult {
    drawBitmap: Uint8Array | null
    drawUndoBitmaps: Uint8Array[]
    currentDrawUndoBitmap: number
    needsRefresh: boolean
}

/**
 * Result of clearing all undo bitmaps
 */
export interface ClearUndoBitmapsResult {
    drawUndoBitmaps: Uint8Array[]
    currentDrawUndoBitmap: number
}

/**
 * Parameters for calculating load drawing transform
 */
export interface LoadDrawingTransformParams {
    permRAS: number[]
    dims: number[]
}

/**
 * Result of calculating load drawing transform
 */
export interface LoadDrawingTransformResult {
    instride: number[]
    inflip: boolean[]
    xlut: number[]
    ylut: number[]
    zlut: number[]
}

/**
 * Parameters for transforming a drawing bitmap
 */
export interface TransformBitmapParams {
    inputData: ArrayLike<number>
    dims: number[]
    xlut: number[]
    ylut: number[]
    zlut: number[]
}

/**
 * Parameters for determining bitmap data source
 */
export interface DetermineBitmapSourceParams {
    useClickToSegmentBitmap: boolean
    drawingEnabled: boolean
    clickToSegment: boolean
    drawBitmap: Uint8Array | null
    clickToSegmentGrowingBitmap: Uint8Array | null
}

/**
 * Result of determining bitmap data source
 */
export interface DetermineBitmapSourceResult {
    bitmapDataSource: Uint8Array | null
    useClickToSegmentBitmap: boolean
    warning: string | null
}

/**
 * Parameters for validating drawing dimensions
 */
export interface ValidateDrawingDimensionsParams {
    drawingDims: number[]
    backgroundDims: number[]
}

// ============================================================================
// Undo/Redo Functions
// ============================================================================

/**
 * Clear all stored drawing undo bitmaps and reset the undo index.
 * @param drawUndoBitmaps - Current undo bitmaps array
 * @param maxDrawUndoBitmaps - Maximum number of undo bitmaps allowed
 * @returns New undo bitmaps array and reset index
 */
export function clearAllUndoBitmaps(drawUndoBitmaps: Uint8Array[], maxDrawUndoBitmaps: number): ClearUndoBitmapsResult {
    const newDrawUndoBitmaps = [...drawUndoBitmaps]

    // Reset index to max so next add will be at cylinder 0
    const currentDrawUndoBitmap = maxDrawUndoBitmaps

    if (!newDrawUndoBitmaps || newDrawUndoBitmaps.length < 1) {
        return { drawUndoBitmaps: newDrawUndoBitmaps, currentDrawUndoBitmap }
    }

    // Clear all undo bitmaps
    for (let i = newDrawUndoBitmaps.length - 1; i >= 0; i--) {
        newDrawUndoBitmaps[i] = new Uint8Array()
    }

    return { drawUndoBitmaps: newDrawUndoBitmaps, currentDrawUndoBitmap }
}

/**
 * Add current drawing state to undo history using RLE compression.
 * Uses a circular buffer to limit memory usage.
 * @param params - Parameters for adding undo bitmap
 * @returns Updated state including whether refresh is needed
 */
export function addUndoBitmap(params: AddUndoBitmapParams): AddUndoBitmapResult {
    const { drawBitmap, drawUndoBitmaps, currentDrawUndoBitmap: currentIndex, maxDrawUndoBitmaps, drawFillOverwrites } = params

    // Validate drawing bitmap exists
    if (!drawBitmap || drawBitmap.length < 1) {
        log.debug('addUndoBitmap error: No drawing open')
        return {
            drawBitmap,
            drawUndoBitmaps,
            currentDrawUndoBitmap: currentIndex,
            needsRefresh: false
        }
    }

    const newDrawUndoBitmaps = [...drawUndoBitmaps]
    let newDrawBitmap = drawBitmap
    let needsRefresh = false

    // Handle non-overwriting case - merge with previous state
    if (!drawFillOverwrites && newDrawUndoBitmaps.length > 0) {
        const len = drawBitmap.length
        const bmp = decodeRLE(newDrawUndoBitmaps[currentIndex], len)
        newDrawBitmap = new Uint8Array(drawBitmap)
        for (let i = 0; i < len; i++) {
            if (bmp[i] > 0) {
                newDrawBitmap[i] = bmp[i]
            }
        }
        needsRefresh = true
    }

    // Increment circular buffer index
    let newCurrentIndex = currentIndex + 1
    if (newCurrentIndex >= maxDrawUndoBitmaps) {
        newCurrentIndex = 0
    }

    // Store RLE-compressed bitmap
    newDrawUndoBitmaps[newCurrentIndex] = encodeRLE(newDrawBitmap)

    return {
        drawBitmap: newDrawBitmap,
        drawUndoBitmaps: newDrawUndoBitmaps,
        currentDrawUndoBitmap: newCurrentIndex,
        needsRefresh
    }
}

// ============================================================================
// Drawing Transformation Functions
// ============================================================================

/**
 * Create a lookup table for dimension transformation
 * @param size - Size of the dimension
 * @param stride - Stride for this dimension
 * @param flip - Whether to flip this dimension
 * @returns Lookup table array
 */
function createLookupTable(size: number, stride: number, flip: boolean): number[] {
    const lut = new Array<number>(size)

    if (flip) {
        for (let i = 0; i < size; i++) {
            lut[i] = (size - 1 - i) * stride
        }
    } else {
        for (let i = 0; i < size; i++) {
            lut[i] = i * stride
        }
    }

    return lut
}

/**
 * Calculate the transformation parameters for loading a drawing bitmap.
 * Computes layout, strides, and flips based on permutation matrix.
 * @param params - Parameters containing permRAS and dims
 * @returns Transformation parameters including lookup tables
 */
export function calculateLoadDrawingTransform(params: LoadDrawingTransformParams): LoadDrawingTransformResult {
    const { permRAS, dims } = params

    // Calculate layout from permutation
    const layout = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (Math.abs(permRAS[i]) - 1 !== j) {
                continue
            }
            layout[j] = i * Math.sign(permRAS[i])
        }
    }

    // Calculate strides and flips
    let stride = 1
    const instride = [1, 1, 1]
    const inflip = [false, false, false]

    for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout.length; j++) {
            const a = Math.abs(layout[j])
            if (a !== i) {
                continue
            }
            instride[j] = stride
            // Detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
            if (layout[j] < 0 || Object.is(layout[j], -0)) {
                inflip[j] = true
            }
            stride *= dims[j + 1]
        }
    }

    // Create lookup tables for each dimension
    const xlut = createLookupTable(dims[1], instride[0], inflip[0])
    const ylut = createLookupTable(dims[2], instride[1], inflip[1])
    const zlut = createLookupTable(dims[3], instride[2], inflip[2])

    return { instride, inflip, xlut, ylut, zlut }
}

/**
 * Transform a drawing bitmap using precomputed lookup tables.
 * @param params - Parameters containing input data, dims, and lookup tables
 * @returns Transformed bitmap as Uint8Array
 */
export function transformBitmap(params: TransformBitmapParams): Uint8Array {
    const { inputData, dims, xlut, ylut, zlut } = params

    const vx = dims[1] * dims[2] * dims[3]
    const outputBitmap = new Uint8Array(vx)

    let j = 0
    for (let z = 0; z < dims[3]; z++) {
        for (let y = 0; y < dims[2]; y++) {
            for (let x = 0; x < dims[1]; x++) {
                outputBitmap[xlut[x] + ylut[y] + zlut[z]] = inputData[j]
                j++
            }
        }
    }

    return outputBitmap
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that drawing dimensions match background image dimensions.
 * @param params - Parameters containing drawing and background dimensions
 * @returns True if dimensions match, false otherwise
 */
export function validateDrawingDimensions(params: ValidateDrawingDimensionsParams): boolean {
    const { drawingDims, backgroundDims } = params

    return drawingDims[1] === backgroundDims[1] && drawingDims[2] === backgroundDims[2] && drawingDims[3] === backgroundDims[3]
}

/**
 * Check if a drawing bitmap is initialized and valid.
 * @param drawBitmap - The drawing bitmap to check
 * @returns True if bitmap is initialized and has data
 */
export function isDrawingInitialized(drawBitmap: Uint8Array | null): boolean {
    return drawBitmap !== null && drawBitmap.length > 0
}

/**
 * Calculate the total number of voxels from dimensions.
 * @param dims - Dimensions array [x, dimX, dimY, dimZ, ...]
 * @returns Total voxel count
 */
export function calculateVoxelCount(dims: number[]): number {
    if (!dims || dims.length < 4) {
        return 0
    }
    return dims[1] * dims[2] * dims[3]
}

/**
 * Create an empty drawing bitmap of the specified size.
 * @param voxelCount - Number of voxels
 * @returns New Uint8Array filled with zeros
 */
export function createEmptyBitmap(voxelCount: number): Uint8Array {
    return new Uint8Array(voxelCount)
}

// ============================================================================
// Bitmap Source Determination
// ============================================================================

/**
 * Determine which bitmap data source to use for drawing refresh.
 * Handles selection between main drawing bitmap and click-to-segment bitmap.
 * @param params - Parameters for determining bitmap source
 * @returns Selected bitmap source and any warnings
 */
export function determineBitmapDataSource(params: DetermineBitmapSourceParams): DetermineBitmapSourceResult {
    let { useClickToSegmentBitmap, drawingEnabled, clickToSegment, drawBitmap, clickToSegmentGrowingBitmap } = params
    let warning: string | null = null

    // Only use the growing bitmap if drawing AND clickToSegment are enabled
    if (useClickToSegmentBitmap && (!drawingEnabled || !clickToSegment)) {
        log.debug('determineBitmapDataSource: Conditions not met for clickToSegment bitmap, using drawBitmap.')
        useClickToSegmentBitmap = false
    }

    // Ensure the selected bitmap actually exists
    const selectedBitmap = useClickToSegmentBitmap ? clickToSegmentGrowingBitmap : drawBitmap

    if (!selectedBitmap && !useClickToSegmentBitmap && clickToSegmentGrowingBitmap) {
        warning = 'drawBitmap is null, but clickToSegmentGrowingBitmap exists. Check state.'
    } else if (!selectedBitmap && useClickToSegmentBitmap && drawBitmap) {
        warning = 'clickToSegmentGrowingBitmap is null, falling back to drawBitmap.'
        useClickToSegmentBitmap = false
    } else if (!selectedBitmap) {
        warning = 'Both bitmaps are null. Uploading empty data.'
    }

    const bitmapDataSource = useClickToSegmentBitmap ? clickToSegmentGrowingBitmap : drawBitmap

    return { bitmapDataSource, useClickToSegmentBitmap, warning }
}

// ============================================================================
// Drawing State Helpers
// ============================================================================

/**
 * Parameters for resetting drawing state when drawing is disabled
 */
export interface DisableDrawingStateParams {
    clickToSegmentIsGrowing: boolean
    drawPenLocation: number[]
    drawPenAxCorSag: number
    drawPenFillPts: number[][]
    drawShapeStartLocation: number[]
    drawShapePreviewBitmap: Uint8Array | null
    drawBitmap: Uint8Array | null
}

/**
 * Result of resetting drawing state
 */
export interface DisableDrawingStateResult {
    clickToSegmentIsGrowing: boolean
    drawPenLocation: number[]
    drawPenAxCorSag: number
    drawPenFillPts: number[][]
    drawShapeStartLocation: number[]
    drawShapePreviewBitmap: Uint8Array | null
    drawBitmap: Uint8Array | null
    needsRefresh: boolean
}

/**
 * Reset drawing state when drawing is disabled.
 * Cleans up click-to-segment state, pen state, and shape state.
 * @param params - Current drawing state parameters
 * @returns Reset drawing state
 */
export function createDisabledDrawingState(params: DisableDrawingStateParams): DisableDrawingStateResult {
    const { clickToSegmentIsGrowing, drawShapePreviewBitmap, drawBitmap } = params

    let newDrawBitmap = drawBitmap
    let needsRefresh = false

    // If click-to-segment was growing, we need to refresh
    if (clickToSegmentIsGrowing) {
        needsRefresh = true
    }

    // Restore drawBitmap from preview if shape drawing was in progress
    if (drawShapePreviewBitmap) {
        newDrawBitmap = drawShapePreviewBitmap
    }

    return {
        clickToSegmentIsGrowing: false,
        drawPenLocation: [NaN, NaN, NaN],
        drawPenAxCorSag: -1,
        drawPenFillPts: [],
        drawShapeStartLocation: [NaN, NaN, NaN],
        drawShapePreviewBitmap: null,
        drawBitmap: newDrawBitmap,
        needsRefresh
    }
}

/**
 * Adjust dimensions for 2x2x2 special case texture.
 * @param bitmapLength - Length of the bitmap data
 * @param dims - Original dimensions
 * @returns Adjusted dimensions
 */
export function adjustDimensionsForSpecialCase(bitmapLength: number, dims: number[]): number[] {
    if (bitmapLength === 8) {
        // Special case for initial 2x2x2 texture
        return [dims[0], 2, 2, 2, ...dims.slice(4)]
    }
    return dims
}

/**
 * Validate bitmap length matches expected voxel count.
 * @param bitmapLength - Actual bitmap length
 * @param expectedVoxelCount - Expected voxel count from dimensions
 * @returns True if lengths match (or special case)
 */
export function validateBitmapLength(bitmapLength: number, expectedVoxelCount: number): boolean {
    // Special case for 2x2x2 texture
    if (bitmapLength === 8) {
        return true
    }
    return bitmapLength === expectedVoxelCount
}
