/**
 * Scene rendering helper functions for overall scene composition and rendering orchestration.
 * This module provides pure functions for scene-level rendering operations.
 *
 * Related to: Scene composition, MVP matrices, pivot calculations, viewport management
 */

import { mat4, vec3 } from 'gl-matrix'
import { deg2rad } from '@/utils'

/**
 * Parameters for calculating MVP matrix
 */
export interface CalculateMvpMatrixParams {
    canvasWidth: number
    canvasHeight: number
    leftTopWidthHeight: number[]
    azimuth: number
    elevation: number
    furthestFromPivot: number
    pivot3D: number[]
    volScaleMultiplier: number
    position?: vec3 | null
}

/**
 * Result of MVP matrix calculation
 */
export interface MvpMatrixResult {
    mvpMatrix: mat4
    modelMatrix: mat4
    normalMatrix: mat4
}

/**
 * Build MVP, Model, and Normal matrices for 3D rendering.
 * @param params - Parameters for matrix calculation
 * @returns Object containing mvpMatrix, modelMatrix, and normalMatrix
 */
export function calculateMvpMatrix(params: CalculateMvpMatrixParams): MvpMatrixResult {
    const { canvasWidth, canvasHeight, leftTopWidthHeight, azimuth, elevation, furthestFromPivot, pivot3D, volScaleMultiplier, position } = params

    // Determine viewport dimensions
    let ltwh = leftTopWidthHeight
    if (ltwh[2] === 0 || ltwh[3] === 0) {
        ltwh = [0, 0, canvasWidth, canvasHeight]
    }

    const whratio = ltwh[2] / ltwh[3]
    let scale = furthestFromPivot
    const origin = pivot3D
    const projectionMatrix = mat4.create()

    // 2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
    scale = (0.8 * scale) / volScaleMultiplier

    if (whratio < 1) {
        // tall window: "portrait" mode, width constrains
        mat4.ortho(projectionMatrix, -scale, scale, -scale / whratio, scale / whratio, scale * 8.0, scale * 0.01)
    } else {
        // wide window: "landscape" mode, height constrains
        mat4.ortho(projectionMatrix, -scale * whratio, scale * whratio, -scale, scale, scale * 8.0, scale * 0.01)
    }

    const modelMatrix = mat4.create()
    modelMatrix[0] = -1 // mirror X coordinate

    // push the model away from the camera so camera not inside model
    const translateVec3 = vec3.fromValues(0, 0, -scale * 1.8) // to avoid clipping, >= SQRT(3)
    mat4.translate(modelMatrix, modelMatrix, translateVec3)

    if (position) {
        mat4.translate(modelMatrix, modelMatrix, position)
    }

    // apply elevation
    mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
    // apply azimuth
    mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180))

    // translate to pivot
    mat4.translate(modelMatrix, modelMatrix, [-origin[0], -origin[1], -origin[2]])

    // build normal matrix
    const iModelMatrix = mat4.create()
    mat4.invert(iModelMatrix, modelMatrix)
    const normalMatrix = mat4.create()
    mat4.transpose(normalMatrix, iModelMatrix)

    // combine into MVP
    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix, projectionMatrix, modelMatrix)

    return { mvpMatrix, modelMatrix, normalMatrix }
}

/**
 * Parameters for calculating pivot and extents
 */
export interface CalculatePivot3DParams {
    sceneMin: vec3
    sceneMax: vec3
}

/**
 * Result of pivot calculation
 */
export interface Pivot3DResult {
    pivot3D: number[]
    furthestFromPivot: number
    extentsMin: vec3
    extentsMax: vec3
}

/**
 * Calculate the 3D pivot point and scene scale based on volume and mesh extents.
 * @param params - Scene extents
 * @returns Pivot point and furthest distance from pivot
 */
export function calculatePivot3D(params: CalculatePivot3DParams): Pivot3DResult {
    const { sceneMin, sceneMax } = params

    const pivot = vec3.create()
    // pivot is half way between min and max:
    vec3.add(pivot, sceneMin, sceneMax)
    vec3.scale(pivot, pivot, 0.5)

    // find scale of scene
    const range = vec3.create()
    vec3.subtract(range, sceneMax, sceneMin)

    return {
        pivot3D: [pivot[0], pivot[1], pivot[2]],
        furthestFromPivot: vec3.length(range) * 0.5,
        extentsMin: sceneMin,
        extentsMax: sceneMax
    }
}

/**
 * Parameters for scale slice calculation
 */
export interface ScaleSliceParams {
    unitWidth: number
    unitHeight: number
    padPixels: [number, number]
    canvasWH: [number, number]
}

/**
 * Result of scale slice calculation
 */
export type ScaleSliceResult = [number, number, number, number, number]

/**
 * Calculate scaled dimensions for a slice panel.
 * Returns [marginLeft, marginTop, scaledWidth, scaledHeight, scale].
 * @param params - Scale calculation parameters
 * @returns Array of [marginLeft, marginTop, scaledWidth, scaledHeight, scale]
 */
export function scaleSlice(params: ScaleSliceParams): ScaleSliceResult {
    const { unitWidth, unitHeight, padPixels, canvasWH } = params

    const availW = canvasWH[0] - padPixels[0]
    const availH = canvasWH[1] - padPixels[1]

    if (unitWidth <= 0 || unitHeight <= 0 || availW <= 0 || availH <= 0) {
        return [0, 0, 0, 0, 0]
    }

    const scaleW = availW / unitWidth
    const scaleH = availH / unitHeight
    const scale = Math.min(scaleW, scaleH)

    const scaledWidth = unitWidth * scale
    const scaledHeight = unitHeight * scale

    const marginLeft = (availW - scaledWidth) / 2
    const marginTop = (availH - scaledHeight) / 2

    return [marginLeft, marginTop, scaledWidth, scaledHeight, scale]
}

/**
 * Parameters for effective canvas dimensions
 */
export interface EffectiveCanvasDimensionsParams {
    canvasWidth: number
    canvasHeight: number
    legendPanelWidth: number
    legendPanelHeight: number
    colorbarHeight: number
}

/**
 * Calculate effective canvas width after reserving space for legend panel.
 * @param params - Canvas dimension parameters
 * @returns Effective width in pixels
 */
export function effectiveCanvasWidth(params: EffectiveCanvasDimensionsParams): number {
    const { canvasWidth, legendPanelWidth } = params
    return canvasWidth - legendPanelWidth
}

/**
 * Calculate effective canvas height after reserving space for legend and colorbar.
 * @param params - Canvas dimension parameters
 * @returns Effective height in pixels
 */
export function effectiveCanvasHeight(params: EffectiveCanvasDimensionsParams): number {
    const { canvasHeight, legendPanelHeight, colorbarHeight } = params
    return canvasHeight - legendPanelHeight - colorbarHeight
}

/**
 * Parameters for getting max volumes
 */
export interface GetMaxVolsParams {
    volumes: Array<{ nFrame4D?: number }>
}

/**
 * Returns the maximum number of 4D volumes across all loaded images.
 * @param params - Parameters containing volumes array
 * @returns Maximum number of frames
 */
export function getMaxVols(params: GetMaxVolsParams): number {
    const { volumes } = params
    if (volumes.length < 1) {
        return 0
    }
    let maxVols = 0
    for (let i = 0; i < volumes.length; i++) {
        maxVols = Math.max(maxVols, volumes[i].nFrame4D ?? 0)
    }
    return maxVols
}

/**
 * Parameters for calculating bounds region
 */
export interface BoundsRegionParams {
    boundsEnabled: boolean
    bounds: number[]
    canvasWidth: number
    canvasHeight: number
    dpr: number
}

/**
 * Result of bounds region calculation
 */
export type BoundsRegionResult = [number, number, number, number]

/**
 * Get the bounds region for rendering, either from custom bounds or full canvas.
 * @param params - Bounds region parameters
 * @returns Tuple of [x, y, width, height] in device pixels
 */
export function getBoundsRegion(params: BoundsRegionParams): BoundsRegionResult {
    const { boundsEnabled, bounds, canvasWidth, canvasHeight, dpr } = params

    if (!boundsEnabled || bounds.length !== 4) {
        return [0, 0, canvasWidth, canvasHeight]
    }

    // bounds are in CSS pixels, convert to device pixels
    const x = Math.round(bounds[0] * dpr)
    const y = Math.round(bounds[1] * dpr)
    const w = Math.round(bounds[2] * dpr)
    const h = Math.round(bounds[3] * dpr)

    return [x, y, w, h]
}

/**
 * Parameters for clear bounds operation
 */
export interface ClearBoundsParams {
    gl: WebGL2RenderingContext
    boundsRegion: BoundsRegionResult
    canvasHeight: number
    backColor: number[]
    mask: number
}

/**
 * Clear the specified region with scissor test.
 * @param params - Clear bounds parameters
 */
export function clearBounds(params: ClearBoundsParams): void {
    const { gl, boundsRegion, canvasHeight, backColor, mask } = params
    const [vpX, vpY, vpW, vpH] = boundsRegion

    gl.enable(gl.SCISSOR_TEST)
    // WebGL y-origin is bottom-left
    const flippedY = canvasHeight - vpY - vpH
    gl.scissor(vpX, flippedY, vpW, vpH)

    if (mask & gl.COLOR_BUFFER_BIT) {
        gl.clearColor(backColor[0], backColor[1], backColor[2], backColor[3])
    }

    gl.clear(mask)
    gl.disable(gl.SCISSOR_TEST)
}

/**
 * Parameters for viewport setup
 */
export interface SetupViewportParams {
    gl: WebGL2RenderingContext
    boundsRegion: BoundsRegionResult
}

/**
 * Setup viewport for rendering to the bounds region.
 * @param params - Viewport setup parameters
 */
export function setupViewport(params: SetupViewportParams): void {
    const { gl, boundsRegion } = params
    const [vpX, vpY, vpW, vpH] = boundsRegion
    gl.viewport(vpX, vpY, vpW, vpH)
}

/**
 * Parameters for calculating padding pixels for multiplanar layout
 */
export interface PadPixelsParams {
    cols: number
    rows: number
    outerPad: number
    innerPad: number
}

/**
 * Calculate total padding pixels for a grid layout.
 * @param params - Padding calculation parameters
 * @returns Tuple of [horizontalPadding, verticalPadding]
 */
export function calculatePadPixels(params: PadPixelsParams): [number, number] {
    const { cols, rows, outerPad, innerPad } = params
    return [(cols - 1) * outerPad + cols * innerPad, (rows - 1) * outerPad + rows * innerPad]
}

/**
 * Parameters for determining layout type
 */
export interface DetermineLayoutParams {
    ltwh1x3: ScaleSliceResult
    ltwh3x1: ScaleSliceResult
    ltwh2x2: ScaleSliceResult
    multiplanarLayout: number // MULTIPLANAR_TYPE enum value
}

/**
 * Layout type enum values (matching MULTIPLANAR_TYPE)
 */
export const LAYOUT_TYPE = {
    AUTO: 0,
    COLUMN: 1,
    GRID: 2,
    ROW: 3
} as const

/**
 * Result of layout determination
 */
export interface LayoutDetermination {
    isDrawColumn: boolean
    isDrawGrid: boolean
    isDrawRow: boolean
}

/**
 * Determine the optimal layout type based on canvas dimensions and configuration.
 * @param params - Layout determination parameters
 * @returns Object indicating which layout type to use
 */
export function determineLayoutType(params: DetermineLayoutParams): LayoutDetermination {
    const { ltwh1x3, ltwh3x1, ltwh2x2, multiplanarLayout } = params

    let isDrawColumn = false
    let isDrawGrid = false
    let isDrawRow = false

    if (multiplanarLayout === LAYOUT_TYPE.COLUMN) {
        isDrawColumn = true
    } else if (multiplanarLayout === LAYOUT_TYPE.GRID) {
        isDrawGrid = true
    } else if (multiplanarLayout === LAYOUT_TYPE.ROW) {
        isDrawRow = true
    } else {
        // auto select layout based on canvas size
        if (ltwh1x3[4] > ltwh3x1[4] && ltwh1x3[4] > ltwh2x2[4]) {
            isDrawColumn = true
        } else if (ltwh3x1[4] > ltwh2x2[4]) {
            isDrawRow = true
        } else {
            isDrawGrid = true
        }
    }

    return { isDrawColumn, isDrawGrid, isDrawRow }
}
