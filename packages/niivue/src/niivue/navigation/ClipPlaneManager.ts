/**
 * Clip plane manager helper functions for 3D clipping plane operations.
 * This module provides pure functions for clip plane calculations and management.
 *
 */

import { sph2cartDeg } from '../rendering/VolumeRenderer.js'

/**
 * Default clip plane values when no clipping is active.
 * The depth value of 2 effectively disables clipping.
 */
export const DEFAULT_CLIP_PLANE: [number, number, number, number] = [0, 0, 0, 2]

/**
 * Default depth/azimuth/elevation values when no clipping is active.
 * Depth of 2 means no clip plane.
 */
export const DEFAULT_DEPTH_AZI_ELEV: [number, number, number] = [2, 0, 0]

/**
 * Threshold for determining if a clip plane is active.
 * If depth < this value, the clip plane is considered active.
 */
export const CLIP_PLANE_ACTIVE_THRESHOLD = 1.8

/**
 * Parameters for converting depth/azimuth/elevation to clip plane format
 */
export interface DepthAziElevToClipPlaneParams {
  depth: number
  azimuth: number
  elevation: number
}

/**
 * Convert depth/azimuth/elevation to clip plane [x, y, z, d] format.
 * Uses spherical to Cartesian conversion with 180-degree azimuth offset.
 * @param params - Depth, azimuth, and elevation values
 * @returns Clip plane as [x, y, z, depth] array
 */
export function depthAziElevToClipPlane(params: DepthAziElevToClipPlaneParams): [number, number, number, number] {
  const { depth, azimuth, elevation } = params
  const v = sph2cartDeg(azimuth + 180, elevation)
  return [v[0], v[1], v[2], depth]
}

/**
 * Parameters for converting depth/azimuth/elevation for setClipPlanes (no 180-degree offset)
 */
export interface DepthAziElevToClipPlaneNoOffsetParams {
  depth: number
  azimuth: number
  elevation: number
}

/**
 * Convert depth/azimuth/elevation to clip plane format without 180-degree offset.
 * Used by setClipPlanes which expects a different orientation convention.
 * @param params - Depth, azimuth, and elevation values
 * @returns Clip plane as [x, y, z, -depth] array (note: depth is negated for shader)
 */
export function depthAziElevToClipPlaneNoOffset(
  params: DepthAziElevToClipPlaneNoOffsetParams
): [number, number, number, number] {
  const { depth, azimuth, elevation } = params
  const n = sph2cartDeg(azimuth, elevation)
  return [n[0], n[1], n[2], -depth] // depth negated for shader
}

/**
 * Parameters for calculating clip plane drag rotation
 */
export interface CalculateClipPlaneDragParams {
  startDepthAziElev: number[]
  dragDeltaX: number
  dragDeltaY: number
}

/**
 * Result of clip plane drag calculation
 */
export interface ClipPlaneDragResult {
  depthAziElev: [number, number, number]
  changed: boolean
}

/**
 * Calculate new depth/azimuth/elevation from drag deltas.
 * Azimuth is adjusted by -deltaX and wrapped to 0-360.
 * Elevation is adjusted by +deltaY (unclamped).
 * @param params - Starting values and drag deltas
 * @returns New depth/azimuth/elevation and whether values changed
 */
export function calculateClipPlaneDrag(params: CalculateClipPlaneDragParams): ClipPlaneDragResult {
  const { startDepthAziElev, dragDeltaX, dragDeltaY } = params

  const newDepthAziElev: [number, number, number] = [
    startDepthAziElev[0],
    (startDepthAziElev[1] - dragDeltaX) % 360,
    startDepthAziElev[2] + dragDeltaY
  ]

  const changed = newDepthAziElev[1] !== startDepthAziElev[1] || newDepthAziElev[2] !== startDepthAziElev[2]

  return {
    depthAziElev: newDepthAziElev,
    changed
  }
}

/**
 * Parameters for ensuring clip plane arrays exist
 */
export interface EnsureClipPlaneArraysParams {
  clipPlanes: number[][] | undefined
  clipPlaneDepthAziElevs: number[][] | undefined
  index: number
}

/**
 * Result of ensuring clip plane arrays
 */
export interface EnsureClipPlaneArraysResult {
  clipPlanes: number[][]
  clipPlaneDepthAziElevs: number[][]
}

/**
 * Ensure clip plane arrays exist and have enough elements for the given index.
 * Creates arrays if they don't exist and fills with default values up to the index.
 * @param params - Current arrays and required index
 * @returns Updated arrays guaranteed to have elements up to index
 */
export function ensureClipPlaneArrays(params: EnsureClipPlaneArraysParams): EnsureClipPlaneArraysResult {
  const { index } = params
  const clipPlanes = params.clipPlanes ? [...params.clipPlanes] : []
  const clipPlaneDepthAziElevs = params.clipPlaneDepthAziElevs ? [...params.clipPlaneDepthAziElevs] : []

  while (clipPlanes.length <= index) {
    clipPlanes.push([...DEFAULT_CLIP_PLANE])
  }
  while (clipPlaneDepthAziElevs.length <= index) {
    clipPlaneDepthAziElevs.push([...DEFAULT_DEPTH_AZI_ELEV])
  }

  return {
    clipPlanes,
    clipPlaneDepthAziElevs
  }
}

/**
 * Check if a clip plane is active (depth below threshold).
 * @param depth - The depth value of the clip plane
 * @param threshold - Optional custom threshold (default: 1.8)
 * @returns True if the clip plane is active
 */
export function isClipPlaneActive(depth: number, threshold = CLIP_PLANE_ACTIVE_THRESHOLD): boolean {
  return depth < threshold
}

/**
 * Parameters for converting multiple depth/azimuth/elevation arrays to clip planes
 */
export interface ConvertMultipleClipPlanesParams {
  depthAziElevs: number[][]
}

/**
 * Result of converting multiple clip planes
 */
export interface ConvertMultipleClipPlanesResult {
  clipPlanes: number[][]
  clipPlaneDepthAziElevs: number[][]
}

/**
 * Convert an array of depth/azimuth/elevation values to clip plane format.
 * Used by setClipPlanes to batch-process multiple clip planes.
 * @param params - Array of depth/azimuth/elevation values
 * @returns Parallel arrays of clip planes and their depth/azi/elev values
 */
export function convertMultipleClipPlanes(params: ConvertMultipleClipPlanesParams): ConvertMultipleClipPlanesResult {
  const { depthAziElevs } = params
  const clipPlanes: number[][] = []
  const clipPlaneDepthAziElevs: number[][] = []

  for (const dae of depthAziElevs) {
    const plane = depthAziElevToClipPlaneNoOffset({
      depth: dae[0],
      azimuth: dae[1],
      elevation: dae[2]
    })
    clipPlanes.push(plane)
    clipPlaneDepthAziElevs.push([...dae])
  }

  return {
    clipPlanes,
    clipPlaneDepthAziElevs
  }
}

/**
 * Parameters for checking if clip plane drag should update the view
 */
export interface ShouldUpdateClipPlaneDragParams {
  isDragging: boolean
  activeClipPlaneDepth: number
  dragStartTileIndex: number
}

/**
 * Check if clip plane drag should update the view.
 * @param params - Dragging state, clip plane depth, and drag start tile index
 * @returns True if clip plane drag should be processed
 */
export function shouldUpdateClipPlaneDrag(params: ShouldUpdateClipPlaneDragParams): boolean {
  const { isDragging, activeClipPlaneDepth, dragStartTileIndex } = params
  return isDragging && isClipPlaneActive(activeClipPlaneDepth) && dragStartTileIndex >= 0
}

/**
 * Create a default clip plane (disabled state).
 * @returns Default clip plane array [0, 0, 0, 2]
 */
export function createDefaultClipPlane(): [number, number, number, number] {
  return [...DEFAULT_CLIP_PLANE]
}

/**
 * Create default depth/azimuth/elevation values (disabled state).
 * @returns Default depth/azi/elev array [2, 0, 0]
 */
export function createDefaultDepthAziElev(): [number, number, number] {
  return [...DEFAULT_DEPTH_AZI_ELEV]
}

/**
 * Parameters for updating a single clip plane at a given index
 */
export interface UpdateClipPlaneAtIndexParams {
  clipPlanes: number[][]
  clipPlaneDepthAziElevs: number[][]
  index: number
  depthAzimuthElevation: number[]
}

/**
 * Result of updating a clip plane at an index
 */
export interface UpdateClipPlaneAtIndexResult {
  clipPlanes: number[][]
  clipPlaneDepthAziElevs: number[][]
  clipPlane: [number, number, number, number]
}

/**
 * Update a clip plane at a specific index.
 * Ensures arrays are large enough, then updates the values.
 * @param params - Current arrays, index, and new depth/azimuth/elevation
 * @returns Updated arrays and the computed clip plane
 */
export function updateClipPlaneAtIndex(params: UpdateClipPlaneAtIndexParams): UpdateClipPlaneAtIndexResult {
  const { index, depthAzimuthElevation } = params

  // Ensure arrays are large enough
  const { clipPlanes, clipPlaneDepthAziElevs } = ensureClipPlaneArrays({
    clipPlanes: params.clipPlanes,
    clipPlaneDepthAziElevs: params.clipPlaneDepthAziElevs,
    index
  })

  // Calculate the clip plane
  const clipPlane = depthAziElevToClipPlane({
    depth: depthAzimuthElevation[0],
    azimuth: depthAzimuthElevation[1],
    elevation: depthAzimuthElevation[2]
  })

  // Update the arrays
  clipPlanes[index] = clipPlane
  clipPlaneDepthAziElevs[index] = [...depthAzimuthElevation]

  return {
    clipPlanes,
    clipPlaneDepthAziElevs,
    clipPlane
  }
}

/**
 * Validate depth/azimuth/elevation input.
 * @param depthAzimuthElevation - Input to validate
 * @returns True if valid (non-empty array)
 */
export function isValidDepthAziElev(depthAzimuthElevation: number[] | undefined | null): boolean {
  return !!depthAzimuthElevation && depthAzimuthElevation.length > 0
}
