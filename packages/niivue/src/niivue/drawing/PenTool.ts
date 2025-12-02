/**
 * Pen drawing tool pure functions for freehand drawing operations.
 *
 * This module provides pure functions for pen-based drawing including
 * single point drawing, line drawing, and filled polygon drawing.
 *
 * Related modules:
 * - DrawingManager.ts - Drawing state management and undo/redo
 * - ShapeTool.ts - Rectangle and ellipse drawing
 * - FloodFillTool.ts - Flood fill and click-to-segment (e.g. magic wand)
 */

import { log } from '@/logger'
import { decodeRLE } from '@/drawing'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Slice orientation types for pen drawing
 */
export const enum PEN_SLICE_TYPE {
  AXIAL = 0,
  CORONAL = 1,
  SAGITTAL = 2
}

/**
 * Parameters for drawing a single point
 */
export interface DrawPointParams {
  /** X coordinate in voxel space */
  x: number
  /** Y coordinate in voxel space */
  y: number
  /** Z coordinate in voxel space */
  z: number
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
 * Parameters for drawing a line between two points
 */
export interface DrawLineParams {
  /** Start point [x, y, z] in voxel space */
  ptA: number[]
  /** End point [x, y, z] in voxel space */
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
 * Parameters for flood fill section operation
 */
export interface FloodFillSectionParams {
  /** 2D image bitmap to fill */
  img2D: Uint8Array
  /** 2D dimensions [width, height] */
  dims2D: readonly number[]
  /** Minimum point of bounding box [x, y] */
  minPt: readonly number[]
  /** Maximum point of bounding box [x, y] */
  maxPt: readonly number[]
}

/**
 * Parameters for filled pen drawing
 */
export interface DrawPenFilledParams {
  /** Array of points [[x, y, z], ...] defining the pen path */
  penFillPts: number[][]
  /** Current slice orientation (0=axial, 1=coronal, 2=sagittal) */
  penAxCorSag: number
  /** Drawing bitmap to modify */
  drawBitmap: Uint8Array
  /** Volume dimensions [unused, dimX, dimY, dimZ, ...] */
  dims: number[]
  /** Pen value (color index) to fill with */
  penValue: number
  /** Whether fill should overwrite existing drawings */
  fillOverwrites: boolean
  /** Current undo bitmap (RLE encoded) */
  currentUndoBitmap: Uint8Array | null
}

/**
 * Result of filled pen drawing operation
 */
export interface DrawPenFilledResult {
  /** Updated drawing bitmap */
  drawBitmap: Uint8Array
  /** Whether the operation was successful */
  success: boolean
}

// ============================================================================
// Point Drawing Functions
// ============================================================================

/**
 * Calculate the voxel index from x, y, z coordinates
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z coordinate
 * @param dx - X dimension size
 * @param dy - Y dimension size
 * @returns Voxel index in flattened array
 */
export function voxelIndex(x: number, y: number, z: number, dx: number, dy: number): number {
  return x + y * dx + z * dx * dy
}

/**
 * Clamp a value to be within valid dimension bounds
 * @param value - Value to clamp
 * @param max - Maximum value (exclusive)
 * @returns Clamped value between 0 and max-1
 */
export function clampToDimension(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max - 1)
}

/**
 * Draw a single point in the drawing bitmap.
 * Handles pen size by drawing neighboring voxels in the current slice plane.
 *
 * @param params - Parameters for drawing the point
 */
export function drawPoint(params: DrawPointParams): void {
  const { x: inputX, y: inputY, z: inputZ, penValue, drawBitmap, dims, penSize, penAxCorSag } = params

  const dx = dims[1]
  const dy = dims[2]
  const dz = dims[3]

  // Clamp coordinates to valid range
  const x = clampToDimension(inputX, dx)
  const y = clampToDimension(inputY, dy)
  const z = clampToDimension(inputZ, dz)

  // Draw the center point
  drawBitmap[voxelIndex(x, y, z, dx, dy)] = penValue

  // Handle pen size > 1
  if (penSize > 1) {
    const halfPenSize = Math.floor(penSize / 2)
    const isAx = penAxCorSag === PEN_SLICE_TYPE.AXIAL
    const isCor = penAxCorSag === PEN_SLICE_TYPE.CORONAL
    const isSag = penAxCorSag === PEN_SLICE_TYPE.SAGITTAL

    for (let i = -halfPenSize; i <= halfPenSize; i++) {
      for (let j = -halfPenSize; j <= halfPenSize; j++) {
        let nx: number, ny: number, nz: number

        if (isAx) {
          // Axial: vary x and y, keep z constant
          nx = clampToDimension(x + i, dx)
          ny = clampToDimension(y + j, dy)
          nz = z
        } else if (isCor) {
          // Coronal: vary x and z, keep y constant
          nx = clampToDimension(x + i, dx)
          ny = y
          nz = clampToDimension(z + j, dz)
        } else if (isSag) {
          // Sagittal: vary y and z, keep x constant
          nx = x
          ny = clampToDimension(y + j, dy)
          nz = clampToDimension(z + i, dz)
        } else {
          // Unknown orientation - just draw center point
          continue
        }

        drawBitmap[voxelIndex(nx, ny, nz, dx, dy)] = penValue
      }
    }
  }
}

// ============================================================================
// Line Drawing Functions (Bresenham's Algorithm)
// ============================================================================

/**
 * Draw a 3D line between two points using Bresenham's line algorithm.
 * This algorithm efficiently draws lines in discrete voxel space.
 *
 * @param params - Parameters for drawing the line
 */
export function drawLine(params: DrawLineParams): void {
  const { ptA, ptB, penValue, drawBitmap, dims, penSize, penAxCorSag } = params

  const dx = Math.abs(ptA[0] - ptB[0])
  const dy = Math.abs(ptA[1] - ptB[1])
  const dz = Math.abs(ptA[2] - ptB[2])

  // Determine step directions
  const xs = ptB[0] > ptA[0] ? 1 : -1
  const ys = ptB[1] > ptA[1] ? 1 : -1
  const zs = ptB[2] > ptA[2] ? 1 : -1

  // Current position
  let x1 = ptA[0]
  let y1 = ptA[1]
  let z1 = ptA[2]

  // Target position
  const x2 = ptB[0]
  const y2 = ptB[1]
  const z2 = ptB[2]

  // Create params for drawing points along the line
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

  if (dx >= dy && dx >= dz) {
    // Driving axis is X-axis
    let p1 = 2 * dy - dx
    let p2 = 2 * dz - dx

    while (x1 !== x2) {
      x1 += xs
      if (p1 >= 0) {
        y1 += ys
        p1 -= 2 * dx
      }
      if (p2 >= 0) {
        z1 += zs
        p2 -= 2 * dx
      }
      p1 += 2 * dy
      p2 += 2 * dz

      pointParams.x = x1
      pointParams.y = y1
      pointParams.z = z1
      drawPoint(pointParams)
    }
  } else if (dy >= dx && dy >= dz) {
    // Driving axis is Y-axis
    let p1 = 2 * dx - dy
    let p2 = 2 * dz - dy

    while (y1 !== y2) {
      y1 += ys
      if (p1 >= 0) {
        x1 += xs
        p1 -= 2 * dy
      }
      if (p2 >= 0) {
        z1 += zs
        p2 -= 2 * dy
      }
      p1 += 2 * dx
      p2 += 2 * dz

      pointParams.x = x1
      pointParams.y = y1
      pointParams.z = z1
      drawPoint(pointParams)
    }
  } else {
    // Driving axis is Z-axis
    let p1 = 2 * dy - dz
    let p2 = 2 * dx - dz

    while (z1 !== z2) {
      z1 += zs
      if (p1 >= 0) {
        y1 += ys
        p1 -= 2 * dz
      }
      if (p2 >= 0) {
        x1 += xs
        p2 -= 2 * dz
      }
      p1 += 2 * dy
      p2 += 2 * dx

      pointParams.x = x1
      pointParams.y = y1
      pointParams.z = z1
      drawPoint(pointParams)
    }
  }
}

// ============================================================================
// Flood Fill Functions
// ============================================================================

/**
 * Fill exterior regions of a 2D bitmap using FIFO queue-based flood fill.
 * Marks outside voxels with value 2 while leaving interior voxels at 0
 * and border voxels at 1.
 *
 * @param params - Parameters for the flood fill operation
 */
export function floodFillSection(params: FloodFillSectionParams): void {
  const { img2D, dims2D, minPt, maxPt } = params

  const w = dims2D[0]
  const [minX, minY] = minPt
  const [maxX, maxY] = maxPt

  // Allocate queue with capacity for worst case
  const capacity = 4 * (maxX - minX + maxY - minY + 2)
  const queue = new Int32Array(capacity * 2) // store x,y pairs
  let head = 0
  let tail = 0

  function enqueue(x: number, y: number): void {
    if (x < minX || x > maxX || y < minY || y > maxY) {
      return
    }
    const idx = x + y * w
    if (img2D[idx] !== 0) {
      return
    }
    img2D[idx] = 2 // mark visited/outside

    queue[tail] = x
    queue[tail + 1] = y
    tail = (tail + 2) % queue.length
  }

  function dequeue(): [number, number] | null {
    if (head === tail) {
      return null
    }
    const x = queue[head]
    const y = queue[head + 1]
    head = (head + 2) % queue.length
    return [x, y]
  }

  // Seed all edges
  for (let x = minX; x <= maxX; x++) {
    enqueue(x, minY)
    enqueue(x, maxY)
  }
  for (let y = minY + 1; y <= maxY - 1; y++) {
    enqueue(minX, y)
    enqueue(maxX, y)
  }

  // Flood fill
  let pt: [number, number] | null
  while ((pt = dequeue()) !== null) {
    const [x, y] = pt
    enqueue(x - 1, y)
    enqueue(x + 1, y)
    enqueue(x, y - 1)
    enqueue(x, y + 1)
  }
}

// ============================================================================
// 2D Line Drawing Helper (for filled pen)
// ============================================================================

/**
 * Draw a 2D line in a bitmap using Bresenham's algorithm.
 * Used internally for filled pen operations.
 *
 * @param img2D - 2D image bitmap to draw on
 * @param dims2D - Dimensions [width, height]
 * @param ptA - Start point [x, y]
 * @param ptB - End point [x, y]
 * @param pen - Pen value to draw
 */
function drawLine2D(img2D: Uint8Array, dims2D: number[], ptA: number[], ptB: number[], pen: number): void {
  const dx = Math.abs(ptA[0] - ptB[0])
  const dy = Math.abs(ptA[1] - ptB[1])

  img2D[ptA[0] + ptA[1] * dims2D[0]] = pen
  img2D[ptB[0] + ptB[1] * dims2D[0]] = pen

  const xs = ptB[0] > ptA[0] ? 1 : -1
  const ys = ptB[1] > ptA[1] ? 1 : -1

  let x1 = ptA[0]
  let y1 = ptA[1]
  const x2 = ptB[0]
  const y2 = ptB[1]

  if (dx >= dy) {
    // Driving axis is X-axis
    let p1 = 2 * dy - dx
    while (x1 !== x2) {
      x1 += xs
      if (p1 >= 0) {
        y1 += ys
        p1 -= 2 * dx
      }
      p1 += 2 * dy
      img2D[x1 + y1 * dims2D[0]] = pen
    }
  } else {
    // Driving axis is Y-axis
    let p1 = 2 * dx - dy
    while (y1 !== y2) {
      y1 += ys
      if (p1 >= 0) {
        x1 += xs
        p1 -= 2 * dy
      }
      p1 += 2 * dx
      img2D[x1 + y1 * dims2D[0]] = pen
    }
  }
}

/**
 * Constrain a 2D point to be within dimension bounds
 * @param xy - Point [x, y]
 * @param dims2D - Dimensions [width, height]
 * @returns Constrained point [x, y]
 */
function constrainXY(xy: number[], dims2D: number[]): number[] {
  const x = Math.min(Math.max(xy[0], 0), dims2D[0] - 1)
  const y = Math.min(Math.max(xy[1], 0), dims2D[1] - 1)
  return [x, y]
}

/**
 * Get horizontal and vertical indices based on slice orientation
 * @param axCorSag - Slice orientation (0=axial, 1=coronal, 2=sagittal)
 * @returns [horizontal index, vertical index]
 */
export function getSliceIndices(axCorSag: number): [number, number] {
  // Default: axial is x(0) * y(1) horizontal*vertical
  let h = 0
  let v = 1

  if (axCorSag === 1) {
    // Coronal is x(0) * z(2)
    v = 2
  } else if (axCorSag === 2) {
    // Sagittal is y(1) * z(2)
    h = 1
    v = 2
  }

  return [h, v]
}

// ============================================================================
// Filled Pen Drawing
// ============================================================================

/**
 * Fill the interior of drawn pen line segments.
 * Connects and fills the interior of a closed polygon defined by pen strokes.
 *
 * @param params - Parameters for the filled pen operation
 * @returns Result containing updated bitmap and success flag
 */
export function drawPenFilled(params: DrawPenFilledParams): DrawPenFilledResult {
  const { penFillPts, penAxCorSag, drawBitmap, dims, penValue, fillOverwrites, currentUndoBitmap } = params

  const nPts = penFillPts.length
  if (nPts < 2) {
    // Cannot fill single line
    return { drawBitmap, success: false }
  }

  // Get horizontal and vertical indices based on slice orientation
  const [h, v] = getSliceIndices(penAxCorSag)

  // Create 2D dimensions (+1 because dims is indexed from 0)
  const dims2D = [dims[h + 1], dims[v + 1]]

  // Create 2D bitmap for flood fill
  const img2D = new Uint8Array(dims2D[0] * dims2D[1])
  const pen = 1 // Use 1 for border (not penValue, as "erase" is zero)

  // Get start point and initialize tracking
  const startPt = constrainXY([penFillPts[0][h], penFillPts[0][v]], dims2D)
  let minPt = [...startPt]
  let maxPt = [...startPt]
  let prevPt = startPt

  // Draw all line segments in 2D
  for (let i = 1; i < nPts; i++) {
    let pt = [penFillPts[i][h], penFillPts[i][v]]
    pt = constrainXY(pt, dims2D)
    minPt = [Math.min(pt[0], minPt[0]), Math.min(pt[1], minPt[1])]
    maxPt = [Math.max(pt[0], maxPt[0]), Math.max(pt[1], maxPt[1])]
    drawLine2D(img2D, dims2D, prevPt, pt, pen)
    prevPt = pt
  }

  // Close the drawing by connecting last point to first
  drawLine2D(img2D, dims2D, startPt, prevPt, pen)

  // Add padding to bounds
  const pad = 1
  minPt[0] = Math.max(0, minPt[0] - pad)
  minPt[1] = Math.max(0, minPt[1] - pad)
  maxPt[0] = Math.min(dims2D[0] - 1, maxPt[0] + pad)
  maxPt[1] = Math.min(dims2D[1] - 1, maxPt[1] + pad)

  // Mark exterior voxels that are outside the bounding box
  for (let y = 0; y < dims2D[1]; y++) {
    for (let x = 0; x < dims2D[0]; x++) {
      if (x >= minPt[0] && x < maxPt[0] && y >= minPt[1] && y <= maxPt[1]) {
        continue
      }
      const pxl = x + y * dims2D[0]
      if (img2D[pxl] !== 0) {
        continue
      }
      img2D[pxl] = 2
    }
  }

  // Flood fill from edges to mark exterior
  const startTime = Date.now()
  floodFillSection({ img2D, dims2D, minPt, maxPt })
  log.debug(`FloodFill ${Date.now() - startTime}`)

  // All voxels with value of zero have no path to edges (interior)
  // Insert surviving pixels from 2D bitmap into 3D bitmap
  const slice = penFillPts[0][3 - (h + v)]

  // Create a copy of the bitmap to modify
  const newDrawBitmap = new Uint8Array(drawBitmap)

  if (penAxCorSag === 0) {
    // Axial
    const offset = slice * dims2D[0] * dims2D[1]
    for (let i = 0; i < dims2D[0] * dims2D[1]; i++) {
      if (img2D[i] !== 2) {
        newDrawBitmap[i + offset] = penValue
      }
    }
  } else {
    let xStride = 1 // Coronal: horizontal LR pixels contiguous
    const yStride = dims[1] * dims[2] // Coronal: vertical is slice
    let zOffset = slice * dims[1] // Coronal: slice is number of columns

    if (penAxCorSag === 2) {
      // Sagittal
      xStride = dims[1]
      zOffset = slice
    }

    let i = 0
    for (let y = 0; y < dims2D[1]; y++) {
      for (let x = 0; x < dims2D[0]; x++) {
        if (img2D[i] !== 2) {
          newDrawBitmap[x * xStride + y * yStride + zOffset] = penValue
        }
        i++
      }
    }
  }

  // Handle non-overwriting fill mode - merge with previous state
  if (!fillOverwrites && currentUndoBitmap && currentUndoBitmap.length > 0) {
    const nv = newDrawBitmap.length
    const bmp = decodeRLE(currentUndoBitmap, nv)
    for (let i = 0; i < nv; i++) {
      if (bmp[i] === 0) {
        continue
      }
      newDrawBitmap[i] = bmp[i]
    }
  }

  return { drawBitmap: newDrawBitmap, success: true }
}

// ============================================================================
// Pen State Helpers
// ============================================================================

/**
 * Check if pen location is valid (not NaN)
 * @param penLocation - Current pen location [x, y, z]
 * @returns True if pen location is valid
 */
export function isPenLocationValid(penLocation: number[]): boolean {
  return !isNaN(penLocation[0])
}

/**
 * Check if two points are the same location
 * @param ptA - First point [x, y, z]
 * @param ptB - Second point [x, y, z]
 * @returns True if points are the same
 */
export function isSamePoint(ptA: number[], ptB: number[]): boolean {
  return ptA[0] === ptB[0] && ptA[1] === ptB[1] && ptA[2] === ptB[2]
}

/**
 * Create initial pen state for starting a new stroke
 * @returns Initial pen state values
 */
export function createInitialPenState(): { penLocation: number[]; penAxCorSag: number; penFillPts: number[][] } {
  return {
    penLocation: [NaN, NaN, NaN],
    penAxCorSag: -1,
    penFillPts: []
  }
}

/**
 * Create reset pen state (for when drawing ends)
 * @returns Reset pen state values
 */
export function createResetPenState(): { penLocation: number[]; penAxCorSag: number } {
  return {
    penLocation: [NaN, NaN, NaN],
    penAxCorSag: -1
  }
}
