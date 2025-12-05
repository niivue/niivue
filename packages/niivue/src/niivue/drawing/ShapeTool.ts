/**
 * Shape drawing tool pure functions for rectangle and ellipse drawing operations.
 *
 * This module provides pure functions for geometric shape drawing including
 * rectangles and ellipses (3D ellipsoids).
 *
 * Related modules:
 * - DrawingManager.ts - Drawing state management and undo/redo
 * - PenTool.ts - Pen drawing (freehand, lines, filled polygons)
 * - FloodFillTool.ts - Flood fill and click-to-segment (e.g. magic wand)
 */

import { drawPoint, type DrawPointParams } from './PenTool'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Bounding box coordinates in 3D voxel space
 */
export interface BoundingBox3D {
    /** Minimum X coordinate (clamped to valid range) */
    x1: number
    /** Minimum Y coordinate (clamped to valid range) */
    y1: number
    /** Minimum Z coordinate (clamped to valid range) */
    z1: number
    /** Maximum X coordinate (clamped to valid range) */
    x2: number
    /** Maximum Y coordinate (clamped to valid range) */
    y2: number
    /** Maximum Z coordinate (clamped to valid range) */
    z2: number
}

/**
 * Center and radii of an ellipsoid
 */
export interface EllipsoidGeometry {
    /** Center X coordinate */
    centerX: number
    /** Center Y coordinate */
    centerY: number
    /** Center Z coordinate */
    centerZ: number
    /** Radius in X dimension */
    radiusX: number
    /** Radius in Y dimension */
    radiusY: number
    /** Radius in Z dimension */
    radiusZ: number
}

/**
 * Parameters for drawing a rectangle
 */
export interface DrawRectangleParams {
    /** First corner point [x, y, z] in voxel space */
    ptA: number[]
    /** Opposite corner point [x, y, z] in voxel space */
    ptB: number[]
    /** Pen value (color index) to draw */
    penValue: number
    /** Drawing bitmap to modify */
    drawBitmap: Uint8Array
    /** Volume dimensions [unused, dimX, dimY, dimZ, ...] */
    dims: number[]
    /** Pen size in voxels */
    penSize: number
    /** Current slice orientation (-1, 0=axial, 1=coronal, 2=sagittal) */
    penAxCorSag: number
}

/**
 * Parameters for drawing an ellipse
 */
export interface DrawEllipseParams {
    /** First corner point [x, y, z] in voxel space (bounding box corner) */
    ptA: number[]
    /** Opposite corner point [x, y, z] in voxel space (bounding box corner) */
    ptB: number[]
    /** Pen value (color index) to draw */
    penValue: number
    /** Drawing bitmap to modify */
    drawBitmap: Uint8Array
    /** Volume dimensions [unused, dimX, dimY, dimZ, ...] */
    dims: number[]
    /** Pen size in voxels */
    penSize: number
    /** Current slice orientation (-1, 0=axial, 1=coronal, 2=sagittal) */
    penAxCorSag: number
}

/**
 * Parameters for calculating bounds
 */
export interface CalculateBoundsParams {
    /** First point [x, y, z] in voxel space */
    ptA: number[]
    /** Second point [x, y, z] in voxel space */
    ptB: number[]
    /** Volume dimensions [unused, dimX, dimY, dimZ, ...] */
    dims: number[]
}

// ============================================================================
// Shape State Helpers
// ============================================================================

/**
 * Check if shape drawing is currently in progress
 * @param shapeStartLocation - Current shape start location [x, y, z]
 * @returns True if shape drawing is in progress (start location is valid)
 */
export function isShapeDrawingInProgress(shapeStartLocation: number[]): boolean {
    return !isNaN(shapeStartLocation[0])
}

/**
 * Create initial shape drawing state
 * @returns Initial state values for shape drawing
 */
export function createInitialShapeState(): { shapeStartLocation: number[]; shapePreviewBitmap: Uint8Array | null } {
    return {
        shapeStartLocation: [NaN, NaN, NaN],
        shapePreviewBitmap: null
    }
}

/**
 * Create reset shape drawing state (for when drawing ends or is cancelled)
 * @returns Reset state values for shape drawing
 */
export function createResetShapeState(): { shapeStartLocation: number[]; shapePreviewBitmap: Uint8Array | null } {
    return {
        shapeStartLocation: [NaN, NaN, NaN],
        shapePreviewBitmap: null
    }
}

// ============================================================================
// Bounds Calculation Functions
// ============================================================================

/**
 * Calculate clamped bounding box from two corner points.
 * Ensures all coordinates are within valid volume bounds.
 *
 * @param params - Parameters containing points and dimensions
 * @returns Bounding box with min/max coordinates
 */
export function calculateBounds(params: CalculateBoundsParams): BoundingBox3D {
    const { ptA, ptB, dims } = params

    const dx = dims[1]
    const dy = dims[2]
    const dz = dims[3]

    // Calculate min and max for each dimension, clamped to valid range
    const x1 = Math.min(Math.max(Math.min(ptA[0], ptB[0]), 0), dx - 1)
    const y1 = Math.min(Math.max(Math.min(ptA[1], ptB[1]), 0), dy - 1)
    const z1 = Math.min(Math.max(Math.min(ptA[2], ptB[2]), 0), dz - 1)
    const x2 = Math.min(Math.max(Math.max(ptA[0], ptB[0]), 0), dx - 1)
    const y2 = Math.min(Math.max(Math.max(ptA[1], ptB[1]), 0), dy - 1)
    const z2 = Math.min(Math.max(Math.max(ptA[2], ptB[2]), 0), dz - 1)

    return { x1, y1, z1, x2, y2, z2 }
}

/**
 * Calculate ellipsoid geometry from bounding box.
 *
 * @param bounds - Bounding box coordinates
 * @returns Center point and radii for ellipsoid
 */
export function calculateEllipsoidGeometry(bounds: BoundingBox3D): EllipsoidGeometry {
    const { x1, y1, z1, x2, y2, z2 } = bounds

    // Calculate center point
    const centerX = (x1 + x2) / 2
    const centerY = (y1 + y2) / 2
    const centerZ = (z1 + z2) / 2

    // Calculate radii (half of each dimension)
    const radiusX = Math.abs(x2 - x1) / 2
    const radiusY = Math.abs(y2 - y1) / 2
    const radiusZ = Math.abs(z2 - z1) / 2

    return { centerX, centerY, centerZ, radiusX, radiusY, radiusZ }
}

/**
 * Check if a point is inside an ellipsoid using the standard ellipsoid equation.
 * Uses normalized distance: (x-cx)^2/rx^2 + (y-cy)^2/ry^2 + (z-cz)^2/rz^2 <= 1
 *
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @param z - Z coordinate to test
 * @param geometry - Ellipsoid geometry (center and radii)
 * @returns True if point is inside or on the ellipsoid surface
 */
export function isPointInEllipsoid(x: number, y: number, z: number, geometry: EllipsoidGeometry): boolean {
    const { centerX, centerY, centerZ, radiusX, radiusY, radiusZ } = geometry

    // Add 0.5 to radii to handle edge cases at boundaries
    const distX = (x - centerX) / (radiusX + 0.5)
    const distY = (y - centerY) / (radiusY + 0.5)
    const distZ = (z - centerZ) / (radiusZ + 0.5)

    // Check if normalized distance squared is <= 1
    return distX * distX + distY * distY + distZ * distZ <= 1.0
}

// ============================================================================
// Shape Drawing Functions
// ============================================================================

/**
 * Draw a filled rectangle in the drawing bitmap.
 * The rectangle is defined by two opposite corner points.
 *
 * @param params - Parameters for drawing the rectangle
 */
export function drawRectangle(params: DrawRectangleParams): void {
    const { ptA, ptB, penValue, drawBitmap, dims, penSize, penAxCorSag } = params

    // Calculate bounding box
    const bounds = calculateBounds({ ptA, ptB, dims })
    const { x1, y1, z1, x2, y2, z2 } = bounds

    // Create params template for drawing points
    const pointParams: DrawPointParams = {
        x: 0,
        y: 0,
        z: 0,
        penValue,
        drawBitmap,
        dims,
        penSize,
        penAxCorSag
    }

    // Fill the rectangle
    for (let z = z1; z <= z2; z++) {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                pointParams.x = x
                pointParams.y = y
                pointParams.z = z
                drawPoint(pointParams)
            }
        }
    }
}

/**
 * Draw a filled 3D ellipse (ellipsoid) in the drawing bitmap.
 * The ellipse is defined by two opposite corner points of its bounding box.
 *
 * @param params - Parameters for drawing the ellipse
 */
export function drawEllipse(params: DrawEllipseParams): void {
    const { ptA, ptB, penValue, drawBitmap, dims, penSize, penAxCorSag } = params

    // Calculate bounding box
    const bounds = calculateBounds({ ptA, ptB, dims })
    const { x1, y1, z1, x2, y2, z2 } = bounds

    // Calculate ellipsoid geometry
    const geometry = calculateEllipsoidGeometry(bounds)

    // Create params template for drawing points
    const pointParams: DrawPointParams = {
        x: 0,
        y: 0,
        z: 0,
        penValue,
        drawBitmap,
        dims,
        penSize,
        penAxCorSag
    }

    // Fill the ellipsoid - only draw points inside the ellipse equation
    for (let z = z1; z <= z2; z++) {
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (isPointInEllipsoid(x, y, z, geometry)) {
                    pointParams.x = x
                    pointParams.y = y
                    pointParams.z = z
                    drawPoint(pointParams)
                }
            }
        }
    }
}
