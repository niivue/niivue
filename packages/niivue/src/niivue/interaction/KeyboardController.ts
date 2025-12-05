/**
 * Keyboard controller helper functions for keyboard event handling.
 * This module provides pure functions for keyboard interaction logic.
 *
 * Related to: Keyboard event handling, hotkey processing, clip plane cycling
 */

import { DRAG_MODE, SLICE_TYPE } from '../../nvdocument.js'

/**
 * Clip plane preset values [depth, azimuth, elevation]
 */
export const CLIP_PLANE_PRESETS: Array<[number, number, number]> = [
    [2, 0, 0], // NONE (depth=2 disables clip plane)
    [0, 270, 0], // LEFT
    [0, 90, 0], // RIGHT
    [0, 0, 0], // POSTERIOR
    [0, 180, 0], // ANTERIOR
    [0, 0, -90], // INFERIOR
    [0, 0, 90] // SUPERIOR
]

/**
 * Parameters for determining keyboard action
 */
export interface KeyDownActionParams {
    code: string
    ctrlKey: boolean
    shiftKey: boolean
    sliceType: SLICE_TYPE
}

/**
 * Result of key down action processing
 */
export interface KeyDownActionResult {
    action:
        | 'render_azimuth_decrease'
        | 'render_azimuth_increase'
        | 'render_elevation_increase'
        | 'render_elevation_decrease'
        | 'crosshair_left'
        | 'crosshair_right'
        | 'crosshair_up'
        | 'crosshair_down'
        | 'crosshair_forward'
        | 'crosshair_backward'
        | 'cycle_drag_mode'
        | 'frame_previous'
        | 'frame_next'
        | 'show_version'
        | 'none'
}

/**
 * Parameters for cycling clip plane
 */
export interface CycleClipPlaneParams {
    currentIndex: number | null
    clipPlanesLength: number
}

/**
 * Result of clip plane cycling
 */
export interface CycleClipPlaneResult {
    newIndex: number
    defaultClipPlane: [number, number, number, number]
    defaultDepthAziElev: [number, number, number]
}

/**
 * Parameters for key debounce check
 */
export interface KeyDebounceParams {
    currentTime: number
    lastCalledTime: number
    debounceTime: number
}

/**
 * Parameters for processing clip plane hotkey
 */
export interface ClipPlaneHotkeyParams {
    currentClipPlaneIndex: number
}

/**
 * Result of clip plane hotkey processing
 */
export interface ClipPlaneHotkeyResult {
    newIndex: number
    depthAziElev: [number, number, number]
}

/**
 * Parameters for processing view mode hotkey
 */
export interface ViewModeHotkeyParams {
    currentSliceType: SLICE_TYPE
    totalSliceTypes: number
}

/**
 * Determine the action to take based on key down event
 * @param params - Key event parameters
 * @returns The action to perform
 */
export function getKeyDownAction(params: KeyDownActionParams): KeyDownActionResult {
    const { code, ctrlKey, shiftKey, sliceType } = params
    const isRenderMode = sliceType === SLICE_TYPE.RENDER

    if (code === 'KeyH' && isRenderMode) {
        return { action: 'render_azimuth_decrease' }
    }
    if (code === 'KeyL' && isRenderMode) {
        return { action: 'render_azimuth_increase' }
    }
    if (code === 'KeyJ' && isRenderMode) {
        return { action: 'render_elevation_increase' }
    }
    if (code === 'KeyK' && isRenderMode) {
        return { action: 'render_elevation_decrease' }
    }
    if (code === 'KeyH' && !isRenderMode) {
        return { action: 'crosshair_left' }
    }
    if (code === 'KeyL' && !isRenderMode) {
        return { action: 'crosshair_right' }
    }
    if (code === 'KeyU' && !isRenderMode && ctrlKey) {
        return { action: 'crosshair_forward' }
    }
    if (code === 'KeyD' && !isRenderMode && ctrlKey) {
        return { action: 'crosshair_backward' }
    }
    if (code === 'KeyJ' && !isRenderMode) {
        return { action: 'crosshair_down' }
    }
    if (code === 'KeyK' && !isRenderMode) {
        return { action: 'crosshair_up' }
    }
    if (code === 'KeyM' && !isRenderMode) {
        return { action: 'cycle_drag_mode' }
    }
    if (code === 'ArrowLeft') {
        return { action: 'frame_previous' }
    }
    if (code === 'ArrowRight') {
        return { action: 'frame_next' }
    }
    if (code === 'Slash' && shiftKey) {
        return { action: 'show_version' }
    }

    return { action: 'none' }
}

/**
 * Calculate the next drag mode value, cycling through available modes
 * @param currentDragMode - Current drag mode
 * @returns Next drag mode value
 */
export function getNextDragMode(currentDragMode: DRAG_MODE): DRAG_MODE {
    const nextMode = currentDragMode + 1
    if (nextMode >= DRAG_MODE.slicer3D) {
        return DRAG_MODE.none
    }
    return nextMode
}

/**
 * Check if enough time has passed since the last key event (debounce)
 * @param params - Debounce check parameters
 * @returns True if the action should proceed, false if debounced
 */
export function shouldProcessKey(params: KeyDebounceParams): boolean {
    const { currentTime, lastCalledTime, debounceTime } = params
    const elapsed = currentTime - lastCalledTime
    return elapsed > debounceTime
}

/**
 * Cycle to the next active clip plane index
 * @param params - Clip plane cycling parameters
 * @returns New index and default values for new slots
 */
export function cycleActiveClipPlane(params: CycleClipPlaneParams): CycleClipPlaneResult {
    const { currentIndex, clipPlanesLength } = params
    const n = clipPlanesLength || 6 // default to 6 planes

    let newIndex: number
    if (currentIndex == null) {
        newIndex = 0
    } else {
        newIndex = (currentIndex + 1) % n
    }

    return {
        newIndex,
        defaultClipPlane: [0, 0, 0, 2], // dummy "off" plane
        defaultDepthAziElev: [2, 0, 0] // depth=2 → no clip plane
    }
}

/**
 * Get the next clip plane preset based on current index
 * @param params - Clip plane hotkey parameters
 * @returns New index and depth/azi/elev values
 */
export function getNextClipPlanePreset(params: ClipPlaneHotkeyParams): ClipPlaneHotkeyResult {
    const { currentClipPlaneIndex } = params
    const newIndex = (currentClipPlaneIndex + 1) % 7
    const depthAziElev = CLIP_PLANE_PRESETS[newIndex] as [number, number, number]

    return {
        newIndex,
        depthAziElev
    }
}

/**
 * Get the next slice type when cycling view modes
 * @param params - View mode hotkey parameters
 * @returns Next slice type value
 */
export function getNextViewMode(params: ViewModeHotkeyParams): SLICE_TYPE {
    const { currentSliceType, totalSliceTypes } = params
    return ((currentSliceType + 1) % totalSliceTypes) as SLICE_TYPE
}

/**
 * Check if a key code matches a configured hotkey
 * @param keyCode - The key code from the event
 * @param hotKey - The configured hotkey to match
 * @returns True if the key matches the hotkey
 */
export function isHotkeyMatch(keyCode: string, hotKey: string): boolean {
    return keyCode === hotKey
}
