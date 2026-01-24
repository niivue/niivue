/**
 * DragModeManager module for managing drag interaction modes.
 * This module provides pure functions for drag mode management and drag-related calculations.
 *
 * Related to: Drag interactions, pan/zoom, windowing, angle measurement
 */

import { vec4 } from 'gl-matrix'
import { DRAG_MODE } from '../../nvdocument.js'

/**
 * State for active drag mode
 */
export interface ActiveDragModeState {
    activeDragMode: DRAG_MODE
    activeDragButton: number
}

/**
 * Cleared drag mode state
 */
export interface ClearedDragModeState {
    activeDragMode: null
    activeDragButton: null
}

/**
 * Angle measurement state
 */
export interface AngleMeasurementState {
    angleState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete'
    angleFirstLine: [number, number, number, number]
}

/**
 * Parameters for getting current drag mode
 */
export interface GetCurrentDragModeParams {
    activeDragMode: DRAG_MODE | null
    fallbackDragMode: DRAG_MODE
}

/**
 * Parameters for calculating pan/zoom from drag
 */
export interface CalculatePanZoomParams {
    startMM: vec4 | number[]
    endMM: vec4 | number[]
    pan2DxyzmmAtMouseDown: vec4 | number[]
}

/**
 * Result of pan/zoom calculation
 */
export interface PanZoomResult {
    pan2Dxyzmm: [number, number, number, number]
}

/**
 * Parameters for calculating 3D slicer zoom from drag
 */
export interface CalculateSlicer3DZoomParams {
    startY: number
    endY: number
    pan2DxyzmmAtMouseDown: vec4 | number[] | ArrayLike<number>
    currentPan2Dxyzmm: vec4 | number[] | ArrayLike<number>
    crosshairMM: number[] | ArrayLike<number>
    yoke3Dto2DZoom: boolean
    windowY?: number // Optional for simple zoom calc
    volScaleMultiplier?: number // Optional for simple zoom calc
}

/**
 * Result of 3D slicer zoom calculation
 */
export interface Slicer3DZoomResult {
    zoom: number
    pan2Dxyzmm: [number, number, number, number]
    volScaleMultiplier?: number
}

/**
 * Parameters for calculating windowing adjustment
 */
export interface CalculateWindowingParams {
    x: number
    y: number
    windowX: number
    windowY: number
    currentCalMin: number
    currentCalMax: number
    globalMin: number
    globalMax: number
    sensitivity?: number // Added sensitivity parameter
}

/**
 * Result of windowing adjustment calculation
 */
export interface WindowingAdjustmentResult {
    calMin: number
    calMax: number
    windowX: number
    windowY: number
}

/**
 * Parameters for calculating intensity range from voxel selection
 */
export interface CalculateIntensityRangeParams {
    xrange: [number, number]
    yrange: [number, number]
    zrange: [number, number]
    dims: number[]
    img: Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array
}

/**
 * Result of intensity range calculation
 */
export interface IntensityRangeResult {
    lo: number
    hi: number
    hasVariation: boolean
}

/**
 * Map of string names to DRAG_MODE values
 */
const DRAG_MODE_MAP: Record<string, DRAG_MODE> = {
    none: DRAG_MODE.none,
    contrast: DRAG_MODE.contrast,
    measurement: DRAG_MODE.measurement,
    angle: DRAG_MODE.angle,
    pan: DRAG_MODE.pan,
    slicer3D: DRAG_MODE.slicer3D,
    callbackOnly: DRAG_MODE.callbackOnly,
    roiSelection: DRAG_MODE.roiSelection,
    crosshair: DRAG_MODE.crosshair,
    windowing: DRAG_MODE.windowing
}

/**
 * Parses a string drag mode to DRAG_MODE enum value.
 *
 * @param mode - String mode name or DRAG_MODE enum value
 * @returns The corresponding DRAG_MODE value, or null if unknown string
 */
export function parseDragModeString(mode: string | DRAG_MODE): DRAG_MODE | null {
    if (typeof mode === 'string') {
        const dragMode = DRAG_MODE_MAP[mode]
        return dragMode !== undefined ? dragMode : null
    }
    return mode
}

/**
 * Gets the currently active drag mode or falls back to default.
 *
 * @param params - Parameters containing active and fallback drag modes
 * @returns The effective drag mode
 */
export function getCurrentDragModeValue(params: GetCurrentDragModeParams): DRAG_MODE {
    const { activeDragMode, fallbackDragMode } = params
    if (activeDragMode !== null) {
        return activeDragMode
    }
    return fallbackDragMode
}

/**
 * Creates cleared drag mode state.
 *
 * @returns State with null values for drag mode and button
 */
export function createClearedDragModeState(): ClearedDragModeState {
    return {
        activeDragMode: null,
        activeDragButton: null
    }
}

/**
 * Creates active drag mode state.
 *
 * @param dragMode - The drag mode to set
 * @param button - The mouse button that triggered the drag
 * @returns Active drag mode state
 */
export function createActiveDragModeState(dragMode: DRAG_MODE, button: number): ActiveDragModeState {
    return {
        activeDragMode: dragMode,
        activeDragButton: button
    }
}

/**
 * Calculates min and max voxel indices from an array of two values.
 * Used in selecting intensities with the selection box.
 *
 * @param array - An array of two values
 * @returns An array of two values representing the min and max voxel indices
 * @throws Error if array contains more than two values
 */
export function calculateMinMaxVoxIdx(array: number[]): [number, number] {
    if (array.length > 2) {
        throw new Error('array must not contain more than two values')
    }
    return [Math.floor(Math.min(array[0], array[1])), Math.floor(Math.max(array[0], array[1]))]
}

/**
 * Calculates the angle between two lines in degrees.
 * The intersection point is assumed to be the end of line1 (start of line2).
 *
 * @param line1 - First line as [x0, y0, x1, y1]
 * @param line2 - Second line as [x0, y0, x1, y1]
 * @returns Angle in degrees
 */
export function calculateAngleBetweenLines(line1: number[], line2: number[]): number {
    // For angle measurement, we need to calculate vectors from the intersection point
    // The intersection point is the end of line1 (which is the start of line2)
    const intersectionX = line1[2]
    const intersectionY = line1[3]
    const v1x = line1[0] - intersectionX
    const v1y = line1[1] - intersectionY
    const v2x = line2[2] - intersectionX
    const v2y = line2[3] - intersectionY
    const dot = v1x * v2x + v1y * v2y
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
    // Avoid division by zero
    if (mag1 === 0 || mag2 === 0) {
        return 0
    }
    // Calculate angle in radians
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
    const angleRad = Math.acos(cosAngle)
    // Convert to degrees
    const angleDeg = angleRad * (180 / Math.PI)
    return angleDeg
}

/**
 * Creates reset state for angle measurement.
 *
 * @returns Reset angle measurement state
 */
export function createResetAngleMeasurementState(): AngleMeasurementState {
    return {
        angleState: 'none',
        angleFirstLine: [0.0, 0.0, 0.0, 0.0]
    }
}

/**
 * Calculates scaled drag position from canvas coordinates.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param dpr - Device pixel ratio
 * @returns Scaled [x, y] coordinates
 */
export function calculateDragPosition(x: number, y: number, dpr: number): [number, number] {
    return [x * dpr, y * dpr]
}

/**
 * Calculates pan offset from drag movement.
 *
 * @param params - Parameters for pan/zoom calculation
 * @returns Pan offset result
 */
export function calculatePanZoomFromDrag(params: CalculatePanZoomParams): PanZoomResult {
    const { startMM, endMM, pan2DxyzmmAtMouseDown } = params

    // Calculate the delta between end and start positions
    const v = vec4.create()
    vec4.sub(v, endMM as vec4, startMM as vec4)

    const zoom = pan2DxyzmmAtMouseDown[3]

    return {
        pan2Dxyzmm: [pan2DxyzmmAtMouseDown[0] + zoom * v[0], pan2DxyzmmAtMouseDown[1] + zoom * v[1], pan2DxyzmmAtMouseDown[2] + zoom * v[2], zoom]
    }
}

/**
 * Calculates 3D slicer zoom from drag movement.
 *
 * @param params - Parameters for 3D slicer zoom calculation
 * @returns 3D slicer zoom result
 */
export function calculateSlicer3DZoomFromDrag(params: CalculateSlicer3DZoomParams): Slicer3DZoomResult {
    const { startY, endY, pan2DxyzmmAtMouseDown, currentPan2Dxyzmm, crosshairMM, yoke3Dto2DZoom } = params

    let zoom = pan2DxyzmmAtMouseDown[3]
    const y = endY - startY
    const pixelScale = 0.01
    zoom += y * pixelScale
    zoom = Math.max(zoom, 0.1)
    zoom = Math.min(zoom, 10.0)

    const zoomChange = currentPan2Dxyzmm[3] - zoom

    const result: Slicer3DZoomResult = {
        zoom,
        pan2Dxyzmm: [currentPan2Dxyzmm[0] + zoomChange * crosshairMM[0], currentPan2Dxyzmm[1] + zoomChange * crosshairMM[1], currentPan2Dxyzmm[2] + zoomChange * crosshairMM[2], zoom]
    }

    if (yoke3Dto2DZoom) {
        result.volScaleMultiplier = zoom
    }

    return result
}

/**
 * Calculates new volume scale multiplier based on mouse drag (Slicer3D).
 *
 * @param params - Parameters for zoom calculation
 * @returns New volume scale multiplier
 */
export function calculateSlicer3DVolScaleFromDrag(params: CalculateSlicer3DZoomParams): number {
    const { startY, endY, volScaleMultiplier } = params
    let newScale = volScaleMultiplier || 1
    if (endY < startY) {
        newScale += 0.01
    } else if (endY > startY) {
        newScale -= 0.01
    }
    return Math.max(0.1, newScale)
}

/**
 * Calculates windowing (cal_min/cal_max) adjustment from mouse/touch drag.
 *
 * @param params - Parameters for windowing calculation
 * @returns Windowing result with adjusted cal_min and cal_max
 */
export function calculateWindowingAdjustment(params: CalculateWindowingParams): WindowingAdjustmentResult {
    const { x, y, windowX, windowY, currentCalMin, currentCalMax, globalMin, globalMax, sensitivity = 1 } = params

    let mn = currentCalMin
    let mx = currentCalMax

    // Calculate delta based on mouse movement and sensitivity
    // Note: windowY - y is used because moving mouse UP (decreasing Y) typically increases brightness
    const deltaY = (windowY - y) * sensitivity
    const deltaX = (x - windowX) * sensitivity

    // Adjust level based on vertical movement
    mn += deltaY
    mx += deltaY

    // Adjust window width based on horizontal movement
    // Moving right (positive deltaX) increases window width
    mn -= deltaX
    mx += deltaX

    // Ensure window width is at least 1
    if (mx - mn < 1) {
        mx = mn + 1
    }

    // Ensure min is not below global min
    if (mn < globalMin) {
        mn = globalMin
    }

    // Ensure max is not above global max
    if (mx > globalMax) {
        mx = globalMax
    }

    // Ensure min is not above max
    if (mn > mx) {
        mn = mx - 1
    }

    return {
        calMin: mn,
        calMax: mx,
        windowX: x,
        windowY: y
    }
}

/**
 * Calculates intensity range (lo/hi) from voxel region selection.
 *
 * @param params - Parameters for intensity range calculation
 * @returns Intensity range result
 */
export function calculateIntensityRangeFromVoxels(params: CalculateIntensityRangeParams): IntensityRangeResult {
    const { xrange, yrange, zrange, dims, img } = params

    let hi = -Number.MAX_VALUE
    let lo = Number.MAX_VALUE

    const xdim = dims[1]
    const ydim = dims[2]

    for (let z = zrange[0]; z < zrange[1]; z++) {
        const zi = z * xdim * ydim
        for (let y = yrange[0]; y < yrange[1]; y++) {
            const yi = y * xdim
            for (let x = xrange[0]; x < xrange[1]; x++) {
                const index = zi + yi + x
                if (lo > img[index]) {
                    lo = img[index]
                }
                if (hi < img[index]) {
                    hi = img[index]
                }
            }
        }
    }

    return {
        lo,
        hi,
        hasVariation: lo < hi
    }
}

/**
 * Adjusts voxel ranges for constant dimensions to ensure at least one iteration.
 *
 * @param startVox - Start voxel coordinates
 * @param endVox - End voxel coordinates
 * @param xrange - X range [min, max]
 * @param yrange - Y range [min, max]
 * @param zrange - Z range [min, max]
 * @returns Adjusted ranges
 */
export function adjustRangesForConstantDimension(
    startVox: ArrayLike<number>,
    endVox: ArrayLike<number>,
    xrange: [number, number],
    yrange: [number, number],
    zrange: [number, number]
): { xrange: [number, number]; yrange: [number, number]; zrange: [number, number] } {
    const newXrange: [number, number] = [...xrange]
    const newYrange: [number, number] = [...yrange]
    const newZrange: [number, number] = [...zrange]

    // For constant dimension, add one so that the for loop runs at least once
    if (startVox[0] - endVox[0] === 0) {
        newXrange[1] = startVox[0] + 1
    } else if (startVox[1] - endVox[1] === 0) {
        newYrange[1] = startVox[1] + 1
    } else if (startVox[2] - endVox[2] === 0) {
        newZrange[1] = startVox[2] + 1
    }

    return { xrange: newXrange, yrange: newYrange, zrange: newZrange }
}

/**
 * Determines if a drag mode should track drag start/end positions.
 *
 * @param dragMode - The current drag mode
 * @returns True if drag positions should be tracked
 */
export function shouldTrackDragPositions(dragMode: DRAG_MODE): boolean {
    return (
        dragMode === DRAG_MODE.contrast ||
        dragMode === DRAG_MODE.measurement ||
        dragMode === DRAG_MODE.pan ||
        dragMode === DRAG_MODE.slicer3D ||
        dragMode === DRAG_MODE.callbackOnly ||
        dragMode === DRAG_MODE.roiSelection ||
        dragMode === DRAG_MODE.angle
    )
}

/**
 * Determines the next angle measurement state based on current state.
 *
 * @param currentState - Current angle measurement state
 * @returns Next state
 */
export function getNextAngleMeasurementState(currentState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete'): 'drawing_first_line' | 'drawing_second_line' | 'complete' | 'none' {
    switch (currentState) {
        case 'none':
            return 'drawing_first_line'
        case 'drawing_first_line':
            return 'drawing_second_line'
        case 'drawing_second_line':
            return 'complete'
        case 'complete':
            return 'drawing_first_line'
        default:
            return 'none'
    }
}

/**
 * Checks if a drag mode is angle measurement mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if angle mode
 */
export function isAngleDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.angle
}

/**
 * Checks if a drag mode is contrast mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if contrast mode
 */
export function isContrastDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.contrast
}

/**
 * Checks if a drag mode is measurement mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if measurement mode
 */
export function isMeasurementDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.measurement
}

/**
 * Checks if a drag mode is pan mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if pan mode
 */
export function isPanDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.pan
}

/**
 * Checks if a drag mode is slicer3D mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if slicer3D mode
 */
export function isSlicer3DDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.slicer3D
}

/**
 * Checks if a drag mode is ROI selection mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if ROI selection mode
 */
export function isRoiSelectionDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.roiSelection
}

/**
 * Checks if a drag mode is callback only mode.
 *
 * @param dragMode - The drag mode to check
 * @returns True if callback only mode
 */
export function isCallbackOnlyDragMode(dragMode: DRAG_MODE): boolean {
    return dragMode === DRAG_MODE.callbackOnly
}