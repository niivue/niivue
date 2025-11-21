/**
 * Touch controller helper functions for touch event handling.
 * This module provides pure functions for touch interaction logic.
 *
 * Related to: Touch event handling, gesture detection, pinch-to-zoom
 */

import { vec4 } from 'gl-matrix'
import { DRAG_MODE, TouchEventConfig } from '../../nvdocument.js'

/**
 * Touch position with x and y coordinates
 */
export interface TouchPosition {
  x: number
  y: number
}

/**
 * Parameters for determining touch drag mode
 */
export interface GetTouchDragModeParams {
  isDoubleTouch: boolean
  touchConfig?: TouchEventConfig
  dragMode: DRAG_MODE
  dragModePrimary: DRAG_MODE
}

/**
 * Parameters for calculating touch position relative to canvas
 */
export interface CalculateTouchPositionParams {
  touch: Touch
  canvasRect: DOMRect
}

/**
 * Parameters for detecting double tap
 */
export interface DetectDoubleTapParams {
  currentTime: number
  lastTouchTime: number
  doubleTouchTimeout: number
}

/**
 * Result of double tap detection
 */
export interface DoubleTapResult {
  isDoubleTap: boolean
  timeSinceTouch: number
}

/**
 * Touch state for tracking gesture progress
 */
export interface TouchState {
  touchdown: boolean
  doubleTouch: boolean
  currentTouchTime: number
  lastTouchTime: number
  lastTwoTouchDistance: number
  multiTouchGesture: boolean
}

/**
 * Parameters for initializing touch state on touch start
 */
export interface InitTouchStateParams {
  currentTime: number
  touchCount: number
  isTouchdown: boolean
}

/**
 * Result of touch state initialization
 */
export interface TouchStateInitResult {
  touchdown: boolean
  currentTouchTime: number
  multiTouchGesture: boolean
}

/**
 * Parameters for calculating pinch-to-zoom
 */
export interface PinchZoomParams {
  touch1: Touch
  touch2: Touch
  lastTwoTouchDistance: number
}

/**
 * Result of pinch-to-zoom calculation
 */
export interface PinchZoomResult {
  distance: number
  scrollDelta: number
  centerPosition: TouchPosition
}

/**
 * Parameters for touch start drag state initialization
 */
export interface TouchDragStartParams {
  touch: Touch
  canvasRect: DOMRect
  pan2Dxyzmm: vec4
}

/**
 * Result of touch drag start initialization
 */
export interface TouchDragStartResult {
  dragStart: [number, number]
  pan2DxyzmmAtMouseDown: vec4
  isDragging: boolean
}

/**
 * Parameters for touch move position calculation
 */
export interface TouchMoveParams {
  touch: Touch
  canvasRect: DOMRect
}

/**
 * Result of touch move position calculation
 */
export interface TouchMoveResult {
  x: number
  y: number
  pageX: number
  pageY: number
}

/**
 * Parameters for determining if touch should trigger mouse-like behavior
 */
export interface ShouldSimulateMouseParams {
  touchdown: boolean
  multiTouchGesture: boolean
}

/**
 * Determines the appropriate drag mode for touch events based on configuration.
 *
 * @param params - Parameters containing touch type and configuration
 * @returns The determined drag mode
 */
export function getTouchDragMode(params: GetTouchDragModeParams): DRAG_MODE {
  const { isDoubleTouch, touchConfig, dragMode, dragModePrimary } = params

  if (isDoubleTouch) {
    return touchConfig?.doubleTouch ?? dragMode
  }

  return touchConfig?.singleTouch ?? dragModePrimary
}

/**
 * Calculates touch position relative to the canvas element.
 *
 * @param params - Parameters containing touch and canvas rect
 * @returns The touch position relative to canvas
 */
export function calculateTouchPosition(params: CalculateTouchPositionParams): TouchPosition {
  const { touch, canvasRect } = params

  return {
    x: touch.clientX - canvasRect.left,
    y: touch.clientY - canvasRect.top
  }
}

/**
 * Detects if a touch is a double tap based on timing.
 *
 * @param params - Parameters for double tap detection
 * @returns Object indicating if double tap and time since last touch
 */
export function detectDoubleTap(params: DetectDoubleTapParams): DoubleTapResult {
  const { currentTime, lastTouchTime, doubleTouchTimeout } = params
  const timeSinceTouch = currentTime - lastTouchTime

  return {
    isDoubleTap: timeSinceTouch < doubleTouchTimeout && timeSinceTouch > 0,
    timeSinceTouch
  }
}

/**
 * Initializes touch state when a touch starts.
 *
 * @param params - Parameters for touch state initialization
 * @returns The initialized touch state values
 */
export function initializeTouchState(params: InitTouchStateParams): TouchStateInitResult {
  const { currentTime, touchCount, isTouchdown } = params

  return {
    touchdown: true,
    currentTouchTime: currentTime,
    multiTouchGesture: isTouchdown && touchCount >= 2
  }
}

/**
 * Creates reset state for touch end.
 *
 * @returns Object with touch state reset to defaults
 */
export function createTouchEndState(): Partial<TouchState> {
  return {
    touchdown: false,
    lastTwoTouchDistance: 0,
    multiTouchGesture: false
  }
}

/**
 * Creates reset state for starting a new touch sequence (non-double-tap).
 *
 * @param currentTime - The current timestamp
 * @returns Object with touch state reset for new sequence
 */
export function createNewTouchSequenceState(currentTime: number): Partial<TouchState> {
  return {
    doubleTouch: false,
    lastTouchTime: currentTime
  }
}

/**
 * Creates state for when double tap is detected.
 *
 * @param currentTime - The current timestamp
 * @returns Object with double tap state
 */
export function createDoubleTapState(currentTime: number): Partial<TouchState> {
  return {
    doubleTouch: true,
    lastTouchTime: currentTime
  }
}

/**
 * Calculates pinch-to-zoom gesture information.
 *
 * @param params - Parameters containing both touches and previous distance
 * @returns The calculated pinch zoom result
 */
export function calculatePinchZoom(params: PinchZoomParams): PinchZoomResult {
  const { touch1, touch2, lastTwoTouchDistance } = params

  const distance = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY)

  // Determine scroll direction based on pinch in/out
  let scrollDelta: number
  if (lastTwoTouchDistance === 0) {
    // First measurement, no scroll
    scrollDelta = 0
  } else if (distance < lastTwoTouchDistance) {
    // Pinch in (fingers closer together) - scroll backward
    scrollDelta = -0.01
  } else {
    // Pinch out (fingers further apart) - scroll forward
    scrollDelta = 0.01
  }

  // Center position between the two touches (using clientX/Y for canvas-relative positioning)
  const centerPosition: TouchPosition = {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  }

  return {
    distance,
    scrollDelta,
    centerPosition
  }
}

/**
 * Checks if pinch zoom should be processed (requires exactly 2 touches).
 *
 * @param targetTouchesLength - Number of target touches
 * @param changedTouchesLength - Number of changed touches
 * @returns True if pinch zoom should be processed
 */
export function shouldProcessPinchZoom(targetTouchesLength: number, changedTouchesLength: number): boolean {
  return targetTouchesLength === 2 && changedTouchesLength === 2
}

/**
 * Initializes drag state for touch start.
 *
 * @param params - Parameters for touch drag initialization
 * @returns The initialized drag state
 */
export function initializeTouchDragState(params: TouchDragStartParams): TouchDragStartResult {
  const { touch, canvasRect, pan2Dxyzmm } = params

  const x = touch.clientX - canvasRect.left
  const y = touch.clientY - canvasRect.top

  return {
    dragStart: [x, y],
    pan2DxyzmmAtMouseDown: vec4.clone(pan2Dxyzmm),
    isDragging: true
  }
}

/**
 * Calculates touch move position values.
 *
 * @param params - Parameters containing touch and canvas rect
 * @returns The calculated touch move positions
 */
export function calculateTouchMovePosition(params: TouchMoveParams): TouchMoveResult {
  const { touch, canvasRect } = params

  return {
    x: touch.clientX - canvasRect.left,
    y: touch.clientY - canvasRect.top,
    pageX: touch.pageX,
    pageY: touch.pageY
  }
}

/**
 * Determines if touch should simulate mouse behavior (single touch, not multi-gesture).
 *
 * @param params - Parameters containing touch state
 * @returns True if should simulate mouse behavior
 */
export function shouldSimulateMouseBehavior(params: ShouldSimulateMouseParams): boolean {
  const { touchdown, multiTouchGesture } = params
  return touchdown && !multiTouchGesture
}

/**
 * Determines if touch is a single-finger touch (not pinch).
 *
 * @param touchdown - Whether finger is touching
 * @param touchCount - Number of active touches
 * @returns True if single-finger touch
 */
export function isSingleFingerTouch(touchdown: boolean, touchCount: number): boolean {
  return touchdown && touchCount < 2
}

/**
 * Determines if touch is a multi-finger gesture.
 *
 * @param touchdown - Whether finger is touching
 * @param touchCount - Number of active touches
 * @returns True if multi-finger gesture
 */
export function isMultiFingerGesture(touchdown: boolean, touchCount: number): boolean {
  return touchdown && touchCount >= 2
}

/**
 * Parameters for getting mouse position from touch for canvas
 */
export interface GetMousePosFromTouchParams {
  touch: Touch
  canvasRect: DOMRect
}

/**
 * Converts touch position to mouse position array format.
 *
 * @param params - Parameters containing touch and canvas rect
 * @returns Mouse position as tuple [x, y]
 */
export function getMousePosFromTouch(params: GetMousePosFromTouchParams): [number, number] {
  const { touch, canvasRect } = params
  return [touch.clientX - canvasRect.left, touch.clientY - canvasRect.top]
}

/**
 * Parameters for determining if double touch drag should update drag end
 */
export interface ShouldUpdateDoubleTouchDragParams {
  doubleTouch: boolean
  isDragging: boolean
}

/**
 * Determines if double touch drag end position should be updated.
 *
 * @param params - Parameters containing double touch and drag state
 * @returns True if drag end should be updated
 */
export function shouldUpdateDoubleTouchDrag(params: ShouldUpdateDoubleTouchDragParams): boolean {
  const { doubleTouch, isDragging } = params
  return doubleTouch && isDragging
}

/**
 * Creates a delayed check function for multi-touch detection.
 * This returns a function that can be passed to setTimeout.
 *
 * @param callback - The callback to execute after delay
 * @param delay - The delay in milliseconds (default: 1)
 * @returns Object with the timeout configuration
 */
export function createMultitouchCheckConfig(
  callback: (e: TouchEvent) => void,
  delay: number = 1
): { callback: (e: TouchEvent) => void; delay: number } {
  return { callback, delay }
}

/**
 * Creates a long-press timer configuration.
 *
 * @param callback - The callback to execute on long press
 * @param timeout - The long press timeout in milliseconds
 * @returns Object with the timer configuration
 */
export function createLongPressConfig(
  callback: () => void,
  timeout: number
): { callback: () => void; timeout: number } {
  return { callback, timeout }
}

/**
 * Determines if a long press timer should be started.
 *
 * @param currentTimer - The current timer value (null if none)
 * @returns True if timer should be started
 */
export function shouldStartLongPressTimer(currentTimer: NodeJS.Timeout | null): boolean {
  return currentTimer === null
}
