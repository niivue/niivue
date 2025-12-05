/**
 * Camera controller helper functions for 3D camera control (azimuth, elevation, zoom, pan).
 * This module provides pure functions for camera-related calculations.
 *
 * Related to: 3D view rotation, 2D pan/zoom, camera state management
 */

/**
 * Normalize azimuth angle to 0-360 range.
 * @param azimuth - Azimuth angle in degrees
 * @returns Normalized azimuth in 0-360 range
 */
export function normalizeAzimuth(azimuth: number): number {
    let normalized = azimuth % 360
    if (normalized < 0) {
        normalized += 360
    }
    return normalized
}

/**
 * Clamp elevation angle to a valid range.
 * @param elevation - Elevation angle in degrees
 * @param minElevation - Minimum elevation (default: -90)
 * @param maxElevation - Maximum elevation (default: 90)
 * @returns Clamped elevation value
 */
export function clampElevation(elevation: number, minElevation = -90, maxElevation = 90): number {
    return Math.max(minElevation, Math.min(maxElevation, elevation))
}

/**
 * Parameters for calculating drag rotation (azimuth/elevation changes)
 */
export interface CalculateDragRotationParams {
    currentAzimuth: number
    currentElevation: number
    deltaX: number
    deltaY: number
}

/**
 * Result of drag rotation calculation
 */
export interface DragRotationResult {
    azimuth: number
    elevation: number
}

/**
 * Calculate new azimuth and elevation from mouse drag delta.
 * Azimuth wraps around 0-360, elevation is unclamped (allows full rotation).
 * @param params - Current camera angles and drag deltas
 * @returns New azimuth and elevation values
 */
export function calculateDragRotation(params: CalculateDragRotationParams): DragRotationResult {
    const { currentAzimuth, currentElevation, deltaX, deltaY } = params

    const newAzimuth = normalizeAzimuth(currentAzimuth + deltaX)
    const newElevation = currentElevation + deltaY

    return {
        azimuth: newAzimuth,
        elevation: newElevation
    }
}

/**
 * Parameters for checking if drag should update camera rotation
 */
export interface ShouldUpdateCameraRotationParams {
    dx: number
    dy: number
    threshold?: number
}

/**
 * Check if drag movement is significant enough to update camera rotation.
 * @param params - Drag deltas and optional threshold
 * @returns true if drag should update camera
 */
export function shouldUpdateCameraRotation(params: ShouldUpdateCameraRotationParams): boolean {
    const { dx, dy, threshold = 1 } = params
    return Math.abs(dx) >= threshold || Math.abs(dy) >= threshold
}

/**
 * Parameters for calculating keyboard rotation
 */
export interface CalculateKeyboardRotationParams {
    currentAzimuth: number
    currentElevation: number
    direction: 'azimuth_increase' | 'azimuth_decrease' | 'elevation_increase' | 'elevation_decrease'
    step?: number
}

/**
 * Calculate new camera rotation from keyboard input.
 * @param params - Current angles, direction, and step size
 * @returns New azimuth and elevation
 */
export function calculateKeyboardRotation(params: CalculateKeyboardRotationParams): DragRotationResult {
    const { currentAzimuth, currentElevation, direction, step = 1 } = params

    let deltaX = 0
    let deltaY = 0

    switch (direction) {
        case 'azimuth_increase':
            deltaX = step
            break
        case 'azimuth_decrease':
            deltaX = -step
            break
        case 'elevation_increase':
            deltaY = step
            break
        case 'elevation_decrease':
            deltaY = -step
            break
    }

    return calculateDragRotation({
        currentAzimuth,
        currentElevation,
        deltaX,
        deltaY
    })
}
