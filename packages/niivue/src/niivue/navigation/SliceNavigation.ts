/**
 * Slice navigation helper functions for slice plane navigation and positioning.
 * This module provides pure functions for slice navigation logic.
 *
 * Related to: Slice scrolling, tile indexing, slice position tracking
 */

import { vec3, vec4 } from 'gl-matrix'
import { SLICE_TYPE, DRAG_MODE } from '../../nvdocument.js'

/**
 * Screen slice information for tile calculations
 */
export interface ScreenSlice {
  leftTopWidthHeight: number[]
  axCorSag: SLICE_TYPE
  [key: string]: unknown
}

/**
 * Graph display state (matches the Graph interface from nvdocument)
 */
export interface GraphState {
  opacity: number
  plotLTWH?: number[] | null
  LTWH: number[]
}

/**
 * Parameters for finding tile index
 */
export interface TileIndexParams {
  x: number
  y: number
  screenSlices: ScreenSlice[]
}

/**
 * Parameters for checking render tile
 */
export interface InRenderTileParams {
  x: number
  y: number
  screenSlices: ScreenSlice[]
}

/**
 * Parameters for checking graph tile
 */
export interface InGraphTileParams {
  x: number
  y: number
  graph: GraphState
  volumesLength: number
  firstVolumeFrameCount: number
}

/**
 * Parameters for checking if coordinates are in bounds
 */
export interface InBoundsParams {
  x: number
  y: number
  dpr: number
  canvasHeight: number
  boundsRegion: [number, number, number, number]
}

/**
 * Parameters for getting slice position from crosshair
 */
export interface GetSlicePositionParams {
  sliceType: SLICE_TYPE
  crosshairPos: vec3
}

/**
 * Parameters for getting current slice info
 */
export interface GetCurrentSliceInfoParams {
  dragStart: number[]
  screenSlices: ScreenSlice[]
  crosshairPos: vec3
  currentSliceType: SLICE_TYPE
  canvasPos2frac: (pos: number[]) => vec3
}

/**
 * Slice info result
 */
export interface SliceInfo {
  sliceIndex: number
  sliceType: SLICE_TYPE
  slicePosition: number
}

/**
 * Parameters for checking if measurement should be drawn on current slice
 */
export interface ShouldDrawOnSliceParams {
  sliceIndex: number
  sliceType: SLICE_TYPE
  slicePosition: number
  currentSliceTypeOpt: SLICE_TYPE
  screenSlices: ScreenSlice[]
  crosshairPos: vec3
}

/**
 * Parameters for calculating 3D scroll
 */
export interface SliceScroll3DParams {
  posChange: number
  volumesLength: number
  clipPlaneDepthAziElevs: number[][]
  activeClipPlaneIndex: number
  volScaleMultiplier: number
}

/**
 * Result of 3D scroll calculation
 */
export interface SliceScroll3DResult {
  action: 'none' | 'clipPlane' | 'zoom'
  newClipPlaneDepth?: number
  newVolScaleMultiplier?: number
}

/**
 * Parameters for calculating 2D zoom scroll
 */
export interface ZoomScrollParams {
  posChange: number
  currentZoom: number
  yoke3Dto2DZoom: boolean
  crosshairMM: vec4 | number[]
}

/**
 * Result of zoom scroll calculation
 */
export interface ZoomScrollResult {
  newZoom: number
  zoomChange: number
  panOffsetX: number
  panOffsetY: number
  panOffsetZ: number
  newVolScaleMultiplier?: number
}

/**
 * Parameters for calculating voxel movement
 */
export interface MoveCrosshairVoxParams {
  x: number
  y: number
  z: number
  currentVox: vec3
  dimsRAS: number[]
}

/**
 * Result of voxel movement calculation
 */
export interface MoveCrosshairVoxResult {
  newVox: vec3
  zChanged: boolean
}

/**
 * Returns the index of the tile containing the given (x, y) screen coordinates.
 * Returns -1 if the coordinates are outside all tiles.
 */
export function findTileIndex(params: TileIndexParams): number {
  const { x, y, screenSlices } = params

  for (let i = 0; i < screenSlices.length; i++) {
    const ltwh = screenSlices[i].leftTopWidthHeight
    if (x > ltwh[0] && y > ltwh[1] && x < ltwh[0] + ltwh[2] && y < ltwh[1] + ltwh[3]) {
      return i
    }
  }
  return -1 // mouse position not in any tile
}

/**
 * Returns the index of the render tile containing (x, y) screen coordinates, or -1 if none.
 */
export function findRenderTileIndex(params: InRenderTileParams): number {
  const { x, y, screenSlices } = params

  const idx = findTileIndex({ x, y, screenSlices })
  if (idx >= 0 && screenSlices[idx].axCorSag === SLICE_TYPE.RENDER) {
    return idx
  }
  return -1 // mouse position not in rendering tile
}

/**
 * Checks if (x,y) is within the visible graph plotting area.
 */
export function isInGraphTile(params: InGraphTileParams): boolean {
  const { x, y, graph, volumesLength, firstVolumeFrameCount } = params

  if (graph.opacity <= 0 || volumesLength < 1 || firstVolumeFrameCount < 1 || !graph.plotLTWH) {
    return false
  }
  if (graph.plotLTWH[2] < 1 || graph.plotLTWH[3] < 1) {
    return false
  }

  const pos = [(x - graph.LTWH[0]) / graph.LTWH[2], (y - graph.LTWH[1]) / graph.LTWH[3]]
  return pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1
}

/**
 * Return true if the given canvas pixel coordinates are inside the bounds region.
 */
export function isInBounds(params: InBoundsParams): boolean {
  const { x, y, dpr, canvasHeight, boundsRegion } = params
  const [vpX, vpY, vpW, vpH] = boundsRegion

  // Convert from CSS (top origin, unscaled) → GL pixels (bottom origin)
  const glX = x * dpr
  const glY = canvasHeight - y * dpr
  return glX >= vpX && glX <= vpX + vpW && glY >= vpY && glY <= vpY + vpH
}

/**
 * Get the current slice position based on slice type.
 */
export function getSlicePosition(params: GetSlicePositionParams): number {
  const { sliceType, crosshairPos } = params

  if (sliceType === SLICE_TYPE.AXIAL) {
    return crosshairPos[2] // Z coordinate for axial slices
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    return crosshairPos[1] // Y coordinate for coronal slices
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    return crosshairPos[0] // X coordinate for sagittal slices
  }
  return 0
}

/**
 * Get slice information for the current measurement/angle.
 */
export function getCurrentSliceInfo(params: GetCurrentSliceInfoParams): SliceInfo {
  const { dragStart, screenSlices, crosshairPos, currentSliceType, canvasPos2frac } = params

  const tileIdx = findTileIndex({
    x: dragStart[0],
    y: dragStart[1],
    screenSlices
  })

  if (tileIdx >= 0 && tileIdx < screenSlices.length) {
    const sliceType = screenSlices[tileIdx].axCorSag
    const slicePosition = getSlicePosition({ sliceType, crosshairPos })

    return {
      sliceIndex: tileIdx,
      sliceType,
      slicePosition
    }
  }

  // Fallback: use current slice type and crosshair position when tileIndex fails
  let slicePosition = 0

  if (currentSliceType === SLICE_TYPE.AXIAL) {
    slicePosition = crosshairPos[2]
  } else if (currentSliceType === SLICE_TYPE.CORONAL) {
    slicePosition = crosshairPos[1]
  } else if (currentSliceType === SLICE_TYPE.SAGITTAL) {
    slicePosition = crosshairPos[0]
  } else if (currentSliceType === SLICE_TYPE.MULTIPLANAR) {
    // In multiplanar mode, try to determine from canvas position
    const startFrac = canvasPos2frac([dragStart[0], dragStart[1]])
    if (startFrac[0] >= 0) {
      // Default to axial in multiplanar mode
      slicePosition = crosshairPos[2]
    }
  }

  return { sliceIndex: -1, sliceType: currentSliceType, slicePosition }
}

/**
 * Check if a measurement/angle should be drawn on the current slice.
 */
export function shouldDrawOnCurrentSlice(params: ShouldDrawOnSliceParams): boolean {
  const { sliceType, slicePosition, currentSliceTypeOpt, screenSlices, crosshairPos } = params

  // In multiplanar mode, check if measurement can be displayed on any visible tile
  if (currentSliceTypeOpt === SLICE_TYPE.MULTIPLANAR) {
    // Check if this is a valid 2D slice type
    if (sliceType > SLICE_TYPE.SAGITTAL) {
      return false
    }

    for (let i = 0; i < screenSlices.length; i++) {
      if (screenSlices[i].axCorSag === sliceType) {
        // Check if the position matches (within tolerance)
        const currentSlicePosition = getSlicePosition({ sliceType, crosshairPos })
        const tolerance = 0.001
        const difference = Math.abs(currentSlicePosition - slicePosition)

        if (difference < tolerance) {
          return true
        }
      }
    }
    return false
  }

  // For single slice types, check if the type matches
  if (sliceType !== currentSliceTypeOpt) {
    return false
  }

  // Check if the position matches (within tolerance)
  const currentSlicePosition = getSlicePosition({ sliceType, crosshairPos })
  const tolerance = 0.001
  const difference = Math.abs(currentSlicePosition - slicePosition)

  return difference < tolerance
}

/**
 * Calculate 3D scroll behavior - either clip plane adjustment or zoom.
 */
export function calculateSliceScroll3D(params: SliceScroll3DParams): SliceScroll3DResult {
  const { posChange, volumesLength, clipPlaneDepthAziElevs, activeClipPlaneIndex, volScaleMultiplier } = params

  if (posChange === 0) {
    return { action: 'none' }
  }

  // Clip plane only influences voxel-based volumes
  if (volumesLength > 0 && clipPlaneDepthAziElevs[activeClipPlaneIndex][0] < 1.8) {
    // Clipping mode: change clip plane depth
    const currentDepth = clipPlaneDepthAziElevs[activeClipPlaneIndex][0]
    let newDepth = currentDepth

    // Bound clip sqrt(3) = 1.73
    if (posChange > 0) {
      newDepth = Math.min(1.5, currentDepth + 0.025)
    }
    if (posChange < 0) {
      newDepth = Math.max(-1.5, currentDepth - 0.025)
    }

    if (newDepth !== currentDepth) {
      return {
        action: 'clipPlane',
        newClipPlaneDepth: newDepth
      }
    }
    return { action: 'none' }
  }

  // Zoom mode for meshes or when clip plane is disabled
  let newScale = volScaleMultiplier
  if (posChange > 0) {
    newScale = Math.min(2.0, volScaleMultiplier * 1.1)
  }
  if (posChange < 0) {
    newScale = Math.max(0.5, volScaleMultiplier * 0.9)
  }

  return {
    action: 'zoom',
    newVolScaleMultiplier: newScale
  }
}

/**
 * Calculate zoom scroll values for 2D pan/zoom mode.
 */
export function calculateZoomScroll(params: ZoomScrollParams): ZoomScrollResult {
  const { posChange, currentZoom, yoke3Dto2DZoom, crosshairMM } = params

  let zoom = currentZoom * (1.0 + 10 * posChange)
  zoom = Math.round(zoom * 10) / 10
  const zoomChange = currentZoom - zoom

  return {
    newZoom: zoom,
    zoomChange,
    panOffsetX: zoomChange * crosshairMM[0],
    panOffsetY: zoomChange * crosshairMM[1],
    panOffsetZ: zoomChange * crosshairMM[2],
    newVolScaleMultiplier: yoke3Dto2DZoom ? zoom : undefined
  }
}

/**
 * Calculate new voxel position after movement, clamped to volume bounds.
 */
export function calculateMoveCrosshairInVox(params: MoveCrosshairVoxParams): MoveCrosshairVoxResult {
  const { x, y, z, currentVox, dimsRAS } = params

  const newVox = vec3.clone(currentVox)
  const originalZ = newVox[2]

  newVox[0] += x
  newVox[1] += y
  newVox[2] += z

  // Clamp to volume bounds
  newVox[0] = Math.max(0, Math.min(newVox[0], dimsRAS[1] - 1))
  newVox[1] = Math.max(0, Math.min(newVox[1], dimsRAS[2] - 1))
  newVox[2] = Math.max(0, Math.min(newVox[2], dimsRAS[3] - 1))

  return {
    newVox,
    zChanged: originalZ !== newVox[2]
  }
}

/**
 * Get normalized graph position from pixel coordinates.
 * Returns null if position is invalid.
 */
export function getGraphPosition(params: {
  x: number
  y: number
  plotLTWH: number[]
}): { pos: [number, number]; isInPlot: boolean; isInDownloadArea: boolean } | null {
  const { x, y, plotLTWH } = params

  const pos: [number, number] = [(x - plotLTWH[0]) / plotLTWH[2], (y - plotLTWH[1]) / plotLTWH[3]]

  const isInPlot = pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1
  const isInDownloadArea = pos[0] > 0.5 && pos[1] > 1.0

  return { pos, isInPlot, isInDownloadArea }
}

/**
 * Calculate frame from graph click position.
 */
export function calculateFrameFromGraphClick(params: { normalizedX: number; totalFrames: number }): number {
  const { normalizedX, totalFrames } = params
  return Math.round(normalizedX * (totalFrames - 1))
}

/**
 * Determine the axis index for crosshair movement based on slice type.
 * Returns [xDelta, yDelta, zDelta] for a position change in that slice.
 */
export function getAxisDeltaForSlice(params: { sliceType: SLICE_TYPE; posNeg: number }): [number, number, number] {
  const { sliceType, posNeg } = params

  const xyz: [number, number, number] = [0, 0, 0]

  if (sliceType <= SLICE_TYPE.SAGITTAL) {
    xyz[2 - sliceType] = posNeg
  }

  return xyz
}

/**
 * Check if a slice type is a 2D slice (axial, coronal, or sagittal).
 */
export function is2DSliceType(sliceType: SLICE_TYPE): boolean {
  return sliceType <= SLICE_TYPE.SAGITTAL
}

/**
 * Check if scrolling should be processed based on focus requirements.
 */
export function shouldProcessScroll(params: { scrollRequiresFocus: boolean; canvasHasFocus: boolean }): boolean {
  const { scrollRequiresFocus, canvasHasFocus } = params
  return !scrollRequiresFocus || canvasHasFocus
}

/**
 * Check if zoom scroll should be applied (pan mode with position outside render tile).
 */
export function shouldApplyZoomScroll(params: {
  posChange: number
  dragMode: DRAG_MODE
  isInRenderTile: boolean
}): boolean {
  const { posChange, dragMode, isInRenderTile } = params
  return posChange !== 0 && dragMode === DRAG_MODE.pan && !isInRenderTile
}
