/**
 * Mouse controller helper functions for mouse event handling.
 * This module provides pure functions for mouse interaction logic.
 *
 * Related to: Mouse event handling, drag mode determination, position tracking
 */

import { vec4 } from 'gl-matrix'
import { DRAG_MODE, MouseEventConfig } from '../../nvdocument.js'

/**
 * Mouse button codes
 */
export const LEFT_MOUSE_BUTTON = 0
export const CENTER_MOUSE_BUTTON = 1
export const RIGHT_MOUSE_BUTTON = 2

/**
 * Position with x and y coordinates
 */
export interface MousePosition {
    x: number
    y: number
}

/**
 * Parameters for determining mouse button drag mode
 */
export interface GetMouseButtonDragModeParams {
    button: number
    shiftKey: boolean
    ctrlKey: boolean
    mouseConfig?: MouseEventConfig
    dragMode: DRAG_MODE
    dragModePrimary: DRAG_MODE
}

/**
 * Parameters for handling mouse down position
 */
export interface MouseDownParams {
    x: number
    y: number
    dpr: number
}

/**
 * Result of mouse down position calculation
 */
export interface MouseDownResult {
    scaledX: number
    scaledY: number
    mousePos: [number, number]
}

/**
 * Parameters for mouse move calculation
 */
export interface MouseMoveParams {
    x: number
    y: number
    dpr: number
    currentMousePos: [number, number]
}

/**
 * Result of mouse move calculation
 */
export interface MouseMoveResult {
    scaledX: number
    scaledY: number
    dx: number
    dy: number
    mousePos: [number, number]
}

/**
 * Parameters for initializing drag state
 */
export interface InitDragStateParams {
    posX: number
    posY: number
    pan2Dxyzmm: vec4
    clipPlaneDepthAziElev: number[]
}

/**
 * Result of drag state initialization
 */
export interface DragStateResult {
    dragStart: [number, number]
    pan2DxyzmmAtMouseDown: vec4
    isDragging: boolean
    dragClipPlaneStartDepthAziElev: number[]
}

/**
 * Mouse button state
 */
export interface MouseButtonState {
    mousedown: boolean
    mouseButtonLeftDown: boolean
    mouseButtonCenterDown: boolean
    mouseButtonRightDown: boolean
}

/**
 * Parameters for determining button state from mouse event
 */
export interface DetermineButtonStateParams {
    button: number
    shiftKey: boolean
}

/**
 * Determines the appropriate drag mode for a mouse button based on configuration.
 *
 * @param params - Parameters containing button, modifiers, and configuration
 * @returns The determined drag mode
 */
export function getMouseButtonDragMode(params: GetMouseButtonDragModeParams): DRAG_MODE {
    const { button, shiftKey, ctrlKey, mouseConfig, dragMode, dragModePrimary } = params

    if (button === LEFT_MOUSE_BUTTON) {
        if (mouseConfig?.leftButton) {
            if (shiftKey && mouseConfig.leftButton.withShift !== undefined) {
                return mouseConfig.leftButton.withShift
            }
            if (ctrlKey && mouseConfig.leftButton.withCtrl !== undefined) {
                return mouseConfig.leftButton.withCtrl
            }
            return mouseConfig.leftButton.primary
        }
        return ctrlKey ? DRAG_MODE.crosshair : dragModePrimary
    } else if (button === RIGHT_MOUSE_BUTTON) {
        if (mouseConfig?.rightButton !== undefined) {
            return mouseConfig.rightButton
        }
        return dragMode
    } else if (button === CENTER_MOUSE_BUTTON) {
        if (mouseConfig?.centerButton !== undefined) {
            return mouseConfig.centerButton
        }
        return dragMode
    }

    return dragMode
}

/**
 * Determines which mouse button flags should be set based on the event.
 *
 * @param params - Parameters containing button and shift key state
 * @returns Object indicating which button flags should be true
 */
export function determineButtonState(params: DetermineButtonStateParams): Partial<MouseButtonState> {
    const { button, shiftKey } = params

    if (button === LEFT_MOUSE_BUTTON && shiftKey) {
        return { mouseButtonCenterDown: true }
    } else if (button === LEFT_MOUSE_BUTTON) {
        return { mouseButtonLeftDown: true }
    } else if (button === RIGHT_MOUSE_BUTTON) {
        return { mouseButtonRightDown: true }
    } else if (button === CENTER_MOUSE_BUTTON) {
        return { mouseButtonCenterDown: true }
    }

    return {}
}

/**
 * Calculates the scaled mouse position for mouse down events.
 *
 * @param params - Parameters containing position and device pixel ratio
 * @returns The calculated scaled position and mouse position array
 */
export function calculateMouseDownPosition(params: MouseDownParams): MouseDownResult {
    const { x, y, dpr } = params
    const scaledX = x * dpr
    const scaledY = y * dpr

    return {
        scaledX,
        scaledY,
        mousePos: [scaledX, scaledY]
    }
}

/**
 * Calculates mouse move delta and new position.
 *
 * @param params - Parameters containing position, dpr, and current mouse position
 * @returns The calculated delta and new mouse position
 */
export function calculateMouseMovePosition(params: MouseMoveParams): MouseMoveResult {
    const { x, y, dpr, currentMousePos } = params
    const scaledX = x * dpr
    const scaledY = y * dpr
    const dx = (scaledX - currentMousePos[0]) / dpr
    const dy = (scaledY - currentMousePos[1]) / dpr

    return {
        scaledX,
        scaledY,
        dx,
        dy,
        mousePos: [scaledX, scaledY]
    }
}

/**
 * Initializes drag state when starting a drag operation.
 *
 * @param params - Parameters containing position and current pan/clip state
 * @returns The initialized drag state
 */
export function initializeDragState(params: InitDragStateParams): DragStateResult {
    const { posX, posY, pan2Dxyzmm, clipPlaneDepthAziElev } = params

    return {
        dragStart: [posX, posY],
        pan2DxyzmmAtMouseDown: vec4.clone(pan2Dxyzmm),
        isDragging: true,
        dragClipPlaneStartDepthAziElev: [...clipPlaneDepthAziElev]
    }
}

/**
 * Creates the reset state for mouse button flags.
 *
 * @returns Object with all mouse button flags set to false
 */
export function createResetButtonState(): MouseButtonState {
    return {
        mousedown: false,
        mouseButtonLeftDown: false,
        mouseButtonCenterDown: false,
        mouseButtonRightDown: false
    }
}

/**
 * Checks if a drag operation has actually moved (start !== end).
 *
 * @param dragStart - The drag start position
 * @param dragEnd - The drag end position
 * @returns True if the drag has moved
 */
export function hasDragMoved(dragStart: number[], dragEnd: number[]): boolean {
    return dragStart[0] !== dragEnd[0] || dragStart[1] !== dragEnd[1]
}

/**
 * Checks if position is outside canvas (indicated by negative coordinates).
 *
 * @param mousePos - The mouse position
 * @returns True if position indicates cursor is off canvas
 */
export function isOffCanvas(mousePos: [number, number]): boolean {
    return mousePos[0] < 0 || mousePos[1] < 0
}

/**
 * Creates off-canvas mouse position marker.
 *
 * @returns Mouse position array indicating off-canvas state
 */
export function createOffCanvasPosition(): [number, number] {
    return [-1, -1]
}

/**
 * Parameters for handling windowing drag
 */
export interface WindowingHandlerParams {
    currentX: number
    currentY: number
    windowX: number
    windowY: number
    calMin: number
    calMax: number
    robustMin: number
    robustMax: number
    windowRangeMultiplier: number
}

/**
 * Result of windowing calculation
 */
export interface WindowingResult {
    newCalMin: number
    newCalMax: number
    newWindowX: number
    newWindowY: number
}

/**
 * Calculates new cal_min and cal_max values based on windowing drag.
 *
 * Window/Level adjustment:
 * - Vertical (Y) movement: adjusts level (shifts both min and max)
 * - Horizontal (X) movement: adjusts window width (changes range)
 *
 * @param params - Parameters for windowing calculation
 * @returns The new cal_min, cal_max, and reference positions
 */
export function calculateWindowingValues(params: WindowingHandlerParams): WindowingResult {
    const { currentX, currentY, windowX, windowY, calMin, calMax, robustMin, robustMax, windowRangeMultiplier } = params

    const windowRange = robustMax - robustMin
    const factor = (windowRange * windowRangeMultiplier) / 100

    let newCalMin = calMin
    let newCalMax = calMax

    // Vertical movement adjusts level
    if (currentY < windowY) {
        // Mouse moved up - increase level
        newCalMin = calMin - factor
        newCalMax = calMax - factor
    } else if (currentY > windowY) {
        // Mouse moved down - decrease level
        newCalMin = calMin + factor
        newCalMax = calMax + factor
    }

    // Horizontal movement adjusts window width
    if (currentX > windowX) {
        // Mouse moved right - increase window width
        newCalMin = newCalMin - factor
        newCalMax = newCalMax + factor
    } else if (currentX < windowX) {
        // Mouse moved left - decrease window width
        newCalMin = newCalMin + factor
        newCalMax = newCalMax - factor
    }

    return {
        newCalMin,
        newCalMax,
        newWindowX: currentX,
        newWindowY: currentY
    }
}

/**
 * Parameters for angle measurement state handling
 */
export interface AngleStateParams {
    currentState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete'
    dragMode: DRAG_MODE
}

/**
 * Determines the next angle measurement state based on current state and action.
 *
 * @param params - Parameters containing current state and drag mode
 * @returns The next angle state
 */
export function getNextAngleState(params: AngleStateParams): 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete' {
    const { currentState, dragMode } = params

    if (dragMode !== DRAG_MODE.angle) {
        return currentState
    }

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
 * Checks if angle measurement is in progress.
 *
 * @param angleState - The current angle state
 * @returns True if angle measurement is in progress
 */
export function isAngleMeasurementInProgress(angleState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete'): boolean {
    return angleState === 'drawing_first_line' || angleState === 'drawing_second_line'
}

/**
 * Check if the drag mode allows drag tracking (most modes except crosshair and windowing).
 *
 * @param dragMode - The current drag mode
 * @returns True if the mode should track drag start/end
 */
export function shouldTrackDrag(dragMode: DRAG_MODE): boolean {
    return dragMode !== DRAG_MODE.crosshair && dragMode !== DRAG_MODE.windowing && dragMode !== DRAG_MODE.none
}

/**
 * Checks if a function is callable.
 *
 * @param test - The value to test
 * @returns True if the value is a function
 */
export function isFunction(test: unknown): boolean {
    return Object.prototype.toString.call(test).indexOf('Function') > -1
}
