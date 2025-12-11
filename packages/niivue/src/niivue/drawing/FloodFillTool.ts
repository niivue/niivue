/**
 * Flood fill tool pure functions for flood fill and click-to-segment operations.
 *
 * This module provides pure functions for region-based filling operations including
 * core flood fill algorithm, intensity-based segmentation, and click-to-segment functionality.
 *
 * Related modules:
 * - DrawingManager.ts - Drawing state management and undo/redo
 * - PenTool.ts - Pen drawing (freehand, lines, filled polygons)
 * - ShapeTool.ts - Rectangle and ellipse drawing
 */

import type { vec3 } from 'gl-matrix'
import { SLICE_TYPE } from '@/nvdocument'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Neighbor connectivity options for flood fill
 * - 6: Face neighbors only (shares a face)
 * - 18: Face and edge neighbors (shares a face or edge)
 * - 26: Face, edge, and corner neighbors (full 3D connectivity)
 */
export type NeighborConnectivity = 6 | 18 | 26

/**
 * Parameters for the core flood fill algorithm
 */
export interface FloodFillCoreParams {
    /** Image bitmap to fill (modified in place) */
    img: Uint8Array
    /** Seed voxel index to start fill from */
    seedVx: number
    /** Volume dimensions [dimX, dimY, dimZ] */
    dims: [number, number, number]
    /** Neighbor connectivity (6, 18, or 26) */
    neighbors?: NeighborConnectivity
}

/**
 * Parameters for coordinate conversion functions
 */
export interface CoordinateParams {
    /** Volume dimensions [dimX, dimY, dimZ] */
    dims: [number, number, number]
}

/**
 * Parameters for flood fill with intensity constraints
 */
export interface FloodFillParams {
    /** Seed voxel coordinates [x, y, z] */
    seedXYZ: [number, number, number]
    /** New color value to fill with */
    newColor: number
    /** Target bitmap to modify */
    targetBitmap: Uint8Array
    /** Original bitmap state (for preview mode, same as target if not preview) */
    originalBitmap: Uint8Array
    /** Volume dimensions [unused, dimX, dimY, dimZ] */
    dims: number[]
    /** Background image intensity values */
    backImg: ArrayLike<number>
    /** Current pen value */
    penValue: number
    /** Slice orientation for 2D constraint (-1 for 3D, 0=axial, 1=coronal, 2=sagittal) */
    constrainAxisIndex: number
    /** Function to convert voxel to mm coordinates */
    vox2mmFn: (xyz: number[]) => vec3
    /** Growing direction (POSITIVE_INFINITY, NEGATIVE_INFINITY, or 0 for no growing) */
    growSelectedCluster: number
    /** Forced minimum intensity threshold */
    forceMin: number
    /** Forced maximum intensity threshold */
    forceMax: number
    /** Neighbor connectivity for flood fill */
    neighbors: NeighborConnectivity
    /** Maximum distance in mm from seed */
    maxDistanceMM: number
    /** Whether operation is 2D only */
    is2D: boolean
    /** Whether this is the grow cluster tool (different behavior) */
    isGrowClusterTool: boolean
    /** Whether preview mode is active */
    isPreviewMode: boolean
}

/**
 * Result of flood fill operation
 */
export interface FloodFillResult {
    /** Whether fill operation was performed */
    success: boolean
    /** Count of voxels filled */
    filledCount: number
    /** Message explaining result */
    message: string
}

/**
 * Parameters for click-to-segment intensity calculation
 */
export interface CalculateSegmentIntensityParams {
    /** Voxel intensity at click point */
    voxelIntensity: number
    /** Current threshold percentage */
    thresholdPercent: number
    /** Background calibration minimum */
    calMin: number
    /** Background calibration maximum */
    calMax: number
    /** Whether to auto-detect bright/dark */
    autoIntensity: boolean
    /** Currently set intensity min (if not auto) */
    currentIntensityMin: number
    /** Currently set intensity max (if not auto) */
    currentIntensityMax: number
    /** Currently set bright flag (if not auto) */
    currentBright: boolean
}

/**
 * Result of segment intensity calculation
 */
export interface SegmentIntensityResult {
    /** Minimum intensity for segmentation */
    intensityMin: number
    /** Maximum intensity for segmentation */
    intensityMax: number
    /** Whether segmenting bright or dark regions */
    isBright: boolean
}

/**
 * Parameters for updating bitmap from click-to-segment preview
 */
export interface UpdateBitmapFromPreviewParams {
    /** Source preview bitmap */
    sourceBitmap: Uint8Array
    /** Target bitmap to update */
    targetBitmap: Uint8Array
}

/**
 * Click-to-segment state
 */
export interface ClickToSegmentState {
    /** Whether click-to-segment preview is growing */
    isGrowing: boolean
    /** Growing bitmap for preview */
    growingBitmap: Uint8Array | null
    /** X,Y location of the click */
    xy: [number, number]
}

// ============================================================================
// Coordinate Conversion Functions
// ============================================================================

/**
 * Convert XYZ coordinates to voxel index
 * @param pt - Point coordinates [x, y, z]
 * @param nx - X dimension size
 * @param nxy - X*Y dimension product
 * @returns Voxel index
 */
export function xyz2vx(pt: number[], nx: number, nxy: number): number {
    return pt[0] + pt[1] * nx + pt[2] * nxy
}

/**
 * Convert voxel index to XYZ coordinates
 * @param vx - Voxel index
 * @param nx - X dimension size
 * @param nxy - X*Y dimension product
 * @returns Point coordinates [x, y, z]
 */
export function vx2xyz(vx: number, nx: number, nxy: number): [number, number, number] {
    const z = Math.floor(vx / nxy)
    const y = Math.floor((vx - z * nxy) / nx)
    const x = Math.floor(vx % nx)
    return [x, y, z]
}

/**
 * Create coordinate conversion functions for given dimensions
 * @param dims - Volume dimensions [dimX, dimY, dimZ]
 * @returns Object with xyz2vx and vx2xyz functions
 */
export function createCoordinateConverters(dims: [number, number, number]): {
    xyz2vx: (pt: number[]) => number
    vx2xyz: (vx: number) => [number, number, number]
    nx: number
    nxy: number
    nxyz: number
} {
    const nx = dims[0]
    const nxy = nx * dims[1]
    const nxyz = nxy * dims[2]

    return {
        xyz2vx: (pt: number[]) => xyz2vx(pt, nx, nxy),
        vx2xyz: (vx: number) => vx2xyz(vx, nx, nxy),
        nx,
        nxy,
        nxyz
    }
}

// ============================================================================
// Distance Calculation Functions
// ============================================================================

/**
 * Parameters for distance check function creation
 */
export interface CreateDistanceCheckParams {
    /** Seed voxel coordinates in mm */
    seedMM: vec3
    /** Maximum distance squared in mm */
    maxDistanceMM2: number
    /** Constrained axis index (-1 for none, 0=X, 1=Y, 2=Z) */
    constrainAxisIndex: number
    /** Seed voxel coordinates */
    seedXYZ: number[]
    /** Function to convert voxel to mm */
    vox2mmFn: (xyz: number[]) => vec3
    /** Coordinate converters */
    converters: ReturnType<typeof createCoordinateConverters>
}

/**
 * Create a distance check function for flood fill
 * @param params - Parameters for creating the check function
 * @returns Function that checks if a voxel is within the allowed distance
 */
export function createDistanceCheck(params: CreateDistanceCheckParams): (vx: number) => boolean {
    const { seedMM, maxDistanceMM2, constrainAxisIndex, seedXYZ, vox2mmFn, converters } = params

    return (vx: number): boolean => {
        const xyzVox = converters.vx2xyz(vx)

        // Check 2D constraint
        if (constrainAxisIndex >= 0 && xyzVox[constrainAxisIndex] !== seedXYZ[constrainAxisIndex]) {
            return false
        }

        // Check distance constraint
        const xyzMM = vox2mmFn(xyzVox)
        const dist2 = (xyzMM[0] - seedMM[0]) ** 2 + (xyzMM[1] - seedMM[1]) ** 2 + (xyzMM[2] - seedMM[2]) ** 2
        return dist2 <= maxDistanceMM2
    }
}

/**
 * Get the constrained axis index for 2D fill
 * @param is2D - Whether fill is 2D
 * @param sliceType - Current slice type
 * @returns Axis index (0=X, 1=Y, 2=Z) or -1 for 3D
 */
export function getConstrainedAxisIndex(is2D: boolean, sliceType: number): number {
    if (!is2D) {
        return -1
    }

    if (sliceType === SLICE_TYPE.AXIAL) {
        return 2 // Z axis
    } else if (sliceType === SLICE_TYPE.CORONAL) {
        return 1 // Y axis
    } else if (sliceType === SLICE_TYPE.SAGITTAL) {
        return 0 // X axis
    }

    return -1
}

// ============================================================================
// Core Flood Fill Algorithm
// ============================================================================

/**
 * All neighbor offsets for different connectivity levels
 */
const NEIGHBOR_OFFSETS = {
    // Face neighbors (6-connectivity)
    face: [
        [0, 0, -1], // inferior
        [0, 0, 1], // superior
        [0, -1, 0], // posterior
        [0, 1, 0], // anterior
        [-1, 0, 0], // left
        [1, 0, 0] // right
    ],
    // Edge neighbors (additional for 18-connectivity)
    edge: [
        [-1, -1, 0], // left posterior
        [1, -1, 0], // right posterior
        [-1, 1, 0], // left anterior
        [1, 1, 0], // right anterior
        [0, -1, -1], // posterior inferior
        [0, 1, -1], // anterior inferior
        [-1, 0, -1], // left inferior
        [1, 0, -1], // right inferior
        [0, -1, 1], // posterior superior
        [0, 1, 1], // anterior superior
        [-1, 0, 1], // left superior
        [1, 0, 1] // right superior
    ],
    // Corner neighbors (additional for 26-connectivity)
    corner: [
        [-1, -1, -1], // left posterior inferior
        [1, -1, -1], // right posterior inferior
        [-1, 1, -1], // left anterior inferior
        [1, 1, -1], // right anterior inferior
        [-1, -1, 1], // left posterior superior
        [1, -1, 1], // right posterior superior
        [-1, 1, 1], // left anterior superior
        [1, 1, 1] // right anterior superior
    ]
}

/**
 * Core flood fill algorithm.
 * Voxels with value 1 are included in the cluster and set to 2.
 *
 * @param params - Parameters for flood fill
 */
export function floodFillCore(params: FloodFillCoreParams): void {
    const { img, seedVx, dims, neighbors = 6 } = params

    const converters = createCoordinateConverters(dims)

    // Initialize queue with seed voxel
    const queue: number[] = []
    queue.push(seedVx)
    img[seedVx] = 2 // Mark as part of cluster

    // Get neighbor offsets based on connectivity
    const neighborOffsets = [...NEIGHBOR_OFFSETS.face]
    if (neighbors >= 18) {
        neighborOffsets.push(...NEIGHBOR_OFFSETS.edge)
    }
    if (neighbors >= 26) {
        neighborOffsets.push(...NEIGHBOR_OFFSETS.corner)
    }

    // BFS flood fill
    while (queue.length > 0) {
        const vx = queue.shift()!
        const xyz = converters.vx2xyz(vx)

        // Test all neighbors
        for (const offset of neighborOffsets) {
            const xyzN = [xyz[0] + offset[0], xyz[1] + offset[1], xyz[2] + offset[2]]

            // Bounds check
            if (xyzN[0] < 0 || xyzN[1] < 0 || xyzN[2] < 0) {
                continue
            }
            if (xyzN[0] >= dims[0] || xyzN[1] >= dims[1] || xyzN[2] >= dims[2]) {
                continue
            }

            const vxN = converters.xyz2vx(xyzN)
            if (img[vxN] !== 1) {
                continue
            }

            img[vxN] = 2 // Mark as part of cluster
            queue.push(vxN)
        }
    }
}

// ============================================================================
// Candidate Marking Functions
// ============================================================================

/**
 * Parameters for marking candidate voxels
 */
export interface MarkCandidatesParams {
    /** Working image to mark candidates in */
    img: Uint8Array
    /** Original bitmap state */
    originalBitmap: Uint8Array
    /** Background intensity image */
    backImg: ArrayLike<number>
    /** Seed voxel color from original bitmap */
    originalSeedColor: number
    /** Total number of voxels */
    nxyz: number
    /** Distance check function */
    isWithinDistance: (vx: number) => boolean
    /** Fill minimum intensity */
    fillMin: number
    /** Fill maximum intensity */
    fillMax: number
    /** Whether this is grow cluster tool */
    isGrowClusterTool: boolean
    /** Whether erasing (newColor === 0) */
    isErasing: boolean
    /** Growing direction */
    growSelectedCluster: number
}

/**
 * Mark candidate voxels for flood fill based on color matching
 * @param params - Parameters for marking candidates
 */
export function markCandidatesByColor(params: MarkCandidatesParams): void {
    const { img, originalBitmap, originalSeedColor, nxyz, isWithinDistance, isGrowClusterTool, isErasing } = params

    if (isGrowClusterTool && isErasing) {
        // Erase cluster: identify voxels with same color
        for (let i = 0; i < nxyz; i++) {
            img[i] = originalBitmap[i] === originalSeedColor && isWithinDistance(i) ? 1 : 0
        }
    } else {
        // Standard fill: mark voxels with same color as seed
        for (let i = 0; i < nxyz; i++) {
            if (originalBitmap[i] === originalSeedColor && isWithinDistance(i)) {
                if (originalSeedColor !== 0) {
                    img[i] = 1
                }
            }
        }
    }
}

/**
 * Mark candidate voxels for flood fill based on intensity thresholds
 * @param params - Parameters for marking candidates
 */
export function markCandidatesByIntensity(params: MarkCandidatesParams): void {
    const { img, backImg, nxyz, isWithinDistance, fillMin, fillMax } = params

    for (let i = 0; i < nxyz; i++) {
        const intensity = backImg[i]
        if (intensity >= fillMin && intensity <= fillMax && isWithinDistance(i)) {
            img[i] = 1
        }
    }
}

/**
 * Mark candidates for grow cluster tool with intensity constraints
 * @param params - Parameters for marking
 * @param clusterImg - Temporary image with cluster marked as 2
 */
export function markCandidatesForGrowCluster(params: MarkCandidatesParams, clusterImg: Uint8Array): void {
    const { img, originalBitmap, backImg, nxyz, isWithinDistance, fillMin, fillMax } = params

    for (let i = 0; i < nxyz; i++) {
        if (clusterImg[i] === 2) {
            // Part of existing cluster
            img[i] = 1
        } else if (originalBitmap[i] === 0) {
            // Empty voxel - check if meets intensity criteria
            const intensity = backImg[i]
            if (intensity >= fillMin && intensity <= fillMax && isWithinDistance(i)) {
                img[i] = 1
            }
        }
    }
}

// ============================================================================
// Click-to-Segment Helper Functions
// ============================================================================

/**
 * Calculate intensity thresholds for click-to-segment
 * @param params - Parameters for calculation
 * @returns Calculated intensity bounds and bright/dark flag
 */
export function calculateSegmentIntensity(params: CalculateSegmentIntensityParams): SegmentIntensityResult {
    const { voxelIntensity, thresholdPercent, calMin, calMax, autoIntensity, currentIntensityMin, currentIntensityMax, currentBright } = params

    let intensityMin = currentIntensityMin
    let intensityMax = currentIntensityMax
    let isBright = currentBright

    if (autoIntensity) {
        if (thresholdPercent !== 0) {
            const effectiveIntensity = voxelIntensity === 0 ? 0.01 : voxelIntensity
            intensityMax = effectiveIntensity * (1 + thresholdPercent)
            intensityMin = effectiveIntensity * (1 - thresholdPercent)
        }

        // Determine if bright or dark based on intensity relative to midpoint
        isBright = voxelIntensity > (calMin + calMax) * 0.5
    }

    return { intensityMin, intensityMax, isBright }
}

/**
 * Get the grow direction value for flood fill
 * @param isBright - Whether segmenting bright regions
 * @returns POSITIVE_INFINITY for bright, NEGATIVE_INFINITY for dark
 */
export function getGrowDirection(isBright: boolean): number {
    return isBright ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
}

/**
 * Update target bitmap from source preview bitmap
 * @param params - Source and target bitmaps
 * @returns True if update was performed
 */
export function updateBitmapFromPreview(params: UpdateBitmapFromPreviewParams): boolean {
    const { sourceBitmap, targetBitmap } = params

    if (!sourceBitmap || !targetBitmap) {
        return false
    }

    if (sourceBitmap.length !== targetBitmap.length) {
        return false
    }

    const nvx = targetBitmap.length
    for (let i = 0; i < nvx; i++) {
        targetBitmap[i] = sourceBitmap[i]
    }

    return true
}

/**
 * Create initial click-to-segment state
 * @returns Initial state
 */
export function createInitialClickToSegmentState(): ClickToSegmentState {
    return {
        isGrowing: false,
        growingBitmap: null,
        xy: [0, 0]
    }
}

/**
 * Create reset click-to-segment state
 * @returns Reset state
 */
export function createResetClickToSegmentState(): ClickToSegmentState {
    return {
        isGrowing: false,
        growingBitmap: null,
        xy: [0, 0]
    }
}

/**
 * Check if click-to-segment is in progress
 * @param state - Current state
 * @returns True if preview mode is active
 */
export function isClickToSegmentActive(state: ClickToSegmentState): boolean {
    return state.isGrowing
}

// ============================================================================
// Bitmap Sum Functions
// ============================================================================

/**
 * Calculate the sum of all voxel values in a bitmap
 * @param img - Bitmap to sum
 * @returns Sum of all values
 */
export function sumBitmap(img: Uint8Array): number {
    let sum = 0
    for (let i = 0; i < img.length; i++) {
        sum += img[i]
    }
    return sum
}

/**
 * Count non-zero voxels in a bitmap
 * @param img - Bitmap to count
 * @returns Count of non-zero voxels
 */
export function countNonZeroVoxels(img: Uint8Array): number {
    let count = 0
    for (let i = 0; i < img.length; i++) {
        if (img[i] !== 0) {
            count++
        }
    }
    return count
}

// ============================================================================
// Intensity Analysis Functions
// ============================================================================

/**
 * Parameters for calculating cluster mean intensity
 */
export interface CalculateClusterMeanParams {
    /** Cluster image with cluster marked as 2 */
    clusterImg: Uint8Array
    /** Background intensity values */
    backImg: ArrayLike<number>
    /** Total number of voxels */
    nxyz: number
    /** Fallback intensity value (seed voxel intensity) */
    fallbackIntensity: number
}

/**
 * Calculate mean intensity of voxels in a cluster
 * @param params - Parameters for calculation
 * @returns Mean intensity value
 */
export function calculateClusterMeanIntensity(params: CalculateClusterMeanParams): number {
    const { clusterImg, backImg, nxyz, fallbackIntensity } = params

    let sum = 0
    let count = 0

    for (let i = 0; i < nxyz; i++) {
        if (clusterImg[i] === 2) {
            sum += backImg[i]
            count++
        }
    }

    return count > 0 ? sum / count : fallbackIntensity
}

/**
 * Get fill intensity bounds based on grow direction
 * @param growDirection - Growing direction (POSITIVE_INFINITY or NEGATIVE_INFINITY)
 * @param baseIntensity - Base intensity for threshold
 * @param forceMin - Forced minimum (NaN if not forced)
 * @param forceMax - Forced maximum (NaN if not forced)
 * @returns [fillMin, fillMax]
 */
export function getIntensityBounds(growDirection: number, baseIntensity: number, forceMin: number, forceMax: number): [number, number] {
    // Use forced values if provided
    if (isFinite(forceMin) && isFinite(forceMax)) {
        return [forceMin, forceMax]
    }

    // Otherwise derive from grow direction
    if (growDirection === Number.POSITIVE_INFINITY) {
        return [baseIntensity, Infinity]
    } else if (growDirection === Number.NEGATIVE_INFINITY) {
        return [-Infinity, baseIntensity]
    }

    return [-Infinity, Infinity]
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if seed coordinates are within bounds
 * @param seedXYZ - Seed coordinates [x, y, z]
 * @param dims - Volume dimensions [dimX, dimY, dimZ]
 * @returns True if coordinates are valid
 */
export function isValidSeedCoordinate(seedXYZ: number[], dims: number[]): boolean {
    if (seedXYZ[0] < 0 || seedXYZ[1] < 0 || seedXYZ[2] < 0) {
        return false
    }
    if (seedXYZ[0] >= dims[0] || seedXYZ[1] >= dims[1] || seedXYZ[2] >= dims[2]) {
        return false
    }
    return true
}

/**
 * Check if seed voxel is valid for grow cluster tool
 * @param originalSeedColor - Color at seed location
 * @returns True if valid (non-zero)
 */
export function isValidGrowClusterSeed(originalSeedColor: number): boolean {
    return originalSeedColor !== 0
}

/**
 * Determine if seed voxel should be forced to candidate
 * @param originalSeedColor - Color at seed location
 * @param newColor - Target fill color
 * @param isGrowClusterTool - Whether grow cluster tool is active
 * @param growSelectedCluster - Grow direction
 * @returns True if seed should be forced to candidate
 */
export function shouldForceSeedToCandidate(originalSeedColor: number, newColor: number, isGrowClusterTool: boolean, growSelectedCluster: number): boolean {
    if (isGrowClusterTool && growSelectedCluster !== 0) {
        return originalSeedColor !== 0
    }

    return originalSeedColor !== 0 || newColor === 0
}

// ============================================================================
// Apply Fill Result Functions
// ============================================================================

/**
 * Parameters for applying fill result
 */
export interface ApplyFillResultParams {
    /** Working image with filled voxels marked as 2 */
    img: Uint8Array
    /** Target bitmap to apply fill to */
    targetBitmap: Uint8Array
    /** Original bitmap for preview mode restoration */
    originalBitmap: Uint8Array
    /** Color to apply to filled voxels */
    newColor: number
    /** Total number of voxels */
    nxyz: number
    /** Whether in preview mode */
    isPreviewMode: boolean
}

/**
 * Apply flood fill result to target bitmap
 * @param params - Parameters for applying result
 * @returns Count of voxels filled
 */
export function applyFillResult(params: ApplyFillResultParams): number {
    const { img, targetBitmap, originalBitmap, newColor, nxyz, isPreviewMode } = params

    let filledCount = 0

    for (let i = 0; i < nxyz; i++) {
        if (img[i] === 2) {
            targetBitmap[i] = newColor
            filledCount++
        } else if (isPreviewMode) {
            // Restore non-filled voxels from original in preview mode
            targetBitmap[i] = originalBitmap[i]
        }
    }

    return filledCount
}
