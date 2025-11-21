/**
 * Wheel controller helper functions for mouse wheel/trackpad event handling.
 * This module provides pure functions for scroll wheel interaction logic.
 *
 * Related to: Mouse wheel scrolling, zooming, ROI resizing, segmentation threshold
 */

import { DRAG_MODE } from '../../nvdocument.js'

/**
 * Parameters for calculating scroll amount
 */
export interface CalculateScrollAmountParams {
  deltaY: number
  invertScrollDirection: boolean
}

/**
 * Parameters for checking if ROI selection resize is valid
 */
export interface IsValidRoiResizeParams {
  dragMode: DRAG_MODE
  dragStart: number[]
  dragEnd: number[]
}

/**
 * Parameters for calculating updated ROI selection bounds
 */
export interface UpdateRoiSelectionParams {
  dragStart: number[]
  dragEnd: number[]
  delta: number
}

/**
 * Result of ROI selection update
 */
export interface RoiSelectionResult {
  newDragStart: number[]
  newDragEnd: number[]
}

/**
 * Parameters for calculating zoom values
 */
export interface CalculateZoomParams {
  currentZoom: number
  scrollAmount: number
}

/**
 * Result of zoom calculation
 */
export interface ZoomResult {
  newZoom: number
  zoomChange: number
}

/**
 * Parameters for calculating pan offset after zoom
 */
export interface CalculatePanOffsetParams {
  currentPan: number[]
  zoomChange: number
  crosshairMM: number[]
}

/**
 * Parameters for click-to-segment threshold adjustment
 */
export interface AdjustSegmentThresholdParams {
  currentPercent: number
  scrollAmount: number
}

/**
 * Parameters for determining wheel action
 */
export interface DetermineWheelActionParams {
  thumbnailVisible: boolean
  mosaicStringLength: number
  eventInBounds: boolean
  hasBounds: boolean
}

/**
 * Result of wheel action determination
 */
export interface WheelActionResult {
  shouldProcess: boolean
  showBoundsBorder: boolean
}

/**
 * Parameters for checking if pan/zoom mode scroll should apply
 */
export interface ShouldZoomParams {
  dragMode: DRAG_MODE
  isInRenderTile: boolean
}

/**
 * Calculate the normalized scroll amount from wheel event
 * @param params - Scroll calculation parameters
 * @returns Normalized scroll amount (-0.01 or 0.01, possibly inverted)
 */
export function calculateScrollAmount(params: CalculateScrollAmountParams): number {
  const { deltaY, invertScrollDirection } = params
  let scrollAmount = deltaY < 0 ? -0.01 : 0.01
  if (invertScrollDirection) {
    scrollAmount = -scrollAmount
  }
  return scrollAmount
}

/**
 * Check if the current drag state allows ROI selection resizing
 * @param params - ROI resize validation parameters
 * @returns True if ROI resize should proceed
 */
export function isValidRoiResize(params: IsValidRoiResizeParams): boolean {
  const { dragMode, dragStart, dragEnd } = params
  if (dragMode !== DRAG_MODE.roiSelection) {
    return false
  }
  const dragStartSum = dragStart.reduce((a, b) => a + b, 0)
  const dragEndSum = dragEnd.reduce((a, b) => a + b, 0)
  return dragStartSum > 0 && dragEndSum > 0
}

/**
 * Calculate updated ROI selection bounds based on scroll delta
 * @param params - ROI selection update parameters
 * @returns New drag start and end positions
 */
export function updateRoiSelection(params: UpdateRoiSelectionParams): RoiSelectionResult {
  const { dragStart, dragEnd, delta } = params

  const newDragStart = [...dragStart]
  const newDragEnd = [...dragEnd]

  // Update X bounds
  if (dragStart[0] < dragEnd[0]) {
    newDragStart[0] = dragStart[0] - delta
    newDragEnd[0] = dragEnd[0] + delta
  } else {
    newDragStart[0] = dragStart[0] + delta
    newDragEnd[0] = dragEnd[0] - delta
  }

  // Update Y bounds
  if (dragStart[1] < dragEnd[1]) {
    newDragStart[1] = dragStart[1] - delta
    newDragEnd[1] = dragEnd[1] + delta
  } else {
    newDragStart[1] = dragStart[1] + delta
    newDragEnd[1] = dragEnd[1] - delta
  }

  return {
    newDragStart,
    newDragEnd
  }
}

/**
 * Calculate the scroll delta direction for ROI resizing
 * @param deltaY - Wheel event deltaY
 * @returns 1 for scroll down (grow), -1 for scroll up (shrink)
 */
export function getRoiScrollDelta(deltaY: number): number {
  return deltaY > 0 ? 1 : -1
}

/**
 * Calculate new zoom level and change from scroll
 * @param params - Zoom calculation parameters
 * @returns New zoom value and the change amount
 */
export function calculateZoom(params: CalculateZoomParams): ZoomResult {
  const { currentZoom, scrollAmount } = params
  const zoomDirection = scrollAmount < 0 ? 1 : -1
  let newZoom = currentZoom * (1.0 + 10 * (0.01 * zoomDirection))
  newZoom = Math.round(newZoom * 10) / 10
  const zoomChange = currentZoom - newZoom

  return {
    newZoom,
    zoomChange
  }
}

/**
 * Calculate new pan offset after zoom to keep crosshair in place
 * @param params - Pan offset calculation parameters
 * @returns New pan values [x, y, z]
 */
export function calculatePanOffsetAfterZoom(params: CalculatePanOffsetParams): number[] {
  const { currentPan, zoomChange, crosshairMM } = params

  return [
    currentPan[0] + zoomChange * crosshairMM[0],
    currentPan[1] + zoomChange * crosshairMM[1],
    currentPan[2] + zoomChange * crosshairMM[2]
  ]
}

/**
 * Adjust click-to-segment threshold based on scroll direction
 * @param params - Threshold adjustment parameters
 * @returns New threshold percent clamped to [0, 1]
 */
export function adjustSegmentThreshold(params: AdjustSegmentThresholdParams): number {
  const { currentPercent, scrollAmount } = params
  let newPercent = currentPercent

  if (scrollAmount < 0) {
    newPercent -= 0.01
    newPercent = Math.max(newPercent, 0)
  } else {
    newPercent += 0.01
    newPercent = Math.min(newPercent, 1)
  }

  return newPercent
}

/**
 * Determine if wheel event should be processed based on current state
 * @param params - Wheel action determination parameters
 * @returns Whether to process and updated bounds border state
 */
export function determineWheelAction(params: DetermineWheelActionParams): WheelActionResult {
  const { thumbnailVisible, mosaicStringLength, eventInBounds, hasBounds } = params

  // Don't process if thumbnail is visible or in mosaic mode
  if (thumbnailVisible || mosaicStringLength > 0) {
    return {
      shouldProcess: false,
      showBoundsBorder: false
    }
  }

  // Don't process if event is outside bounds
  if (!eventInBounds) {
    return {
      shouldProcess: false,
      showBoundsBorder: false
    }
  }

  return {
    shouldProcess: true,
    showBoundsBorder: hasBounds
  }
}

/**
 * Check if zoom should be applied based on drag mode and position
 * @param params - Zoom check parameters
 * @returns True if zoom should be applied
 */
export function shouldApplyZoom(params: ShouldZoomParams): boolean {
  const { dragMode, isInRenderTile } = params
  return dragMode === DRAG_MODE.pan && !isInRenderTile
}

/**
 * Get mouse position relative to canvas from wheel event
 * @param clientX - Event clientX
 * @param clientY - Event clientY
 * @param canvasRect - Canvas bounding rect
 * @returns Position [x, y] relative to canvas
 */
export function getWheelEventPosition(clientX: number, clientY: number, canvasRect: DOMRect): [number, number] {
  return [clientX - canvasRect.left, clientY - canvasRect.top]
}
