/**
 * Layout management helper functions for multiplanar layouts, tile arrangements, and canvas dimensions.
 * This module provides pure functions for layout-related calculations.
 *
 * Related to: Multiplanar layouts, custom layouts, bounds regions, field of view calculations
 */

import { mat4, vec3 } from 'gl-matrix'
import { SLICE_TYPE } from '../../nvdocument.js'

/**
 * Custom layout specification for a single slice view
 */
export interface CustomLayoutSpec {
    sliceType: SLICE_TYPE
    position: [number, number, number, number] // left, top, width, height (0-1 normalized)
    sliceMM?: number
}

/**
 * Parameters for validating custom layout
 */
export interface ValidateCustomLayoutParams {
    layout: CustomLayoutSpec[]
}

/**
 * Result of custom layout validation
 */
export interface ValidateCustomLayoutResult {
    valid: boolean
    error?: string
    overlappingTiles?: [number, number]
}

/**
 * Validate a custom layout for overlapping tiles.
 * @param params - Layout to validate
 * @returns Validation result with error message if invalid
 */
export function validateCustomLayout(params: ValidateCustomLayoutParams): ValidateCustomLayoutResult {
    const { layout } = params

    for (let i = 0; i < layout.length; i++) {
        const [left1, top1, width1, height1] = layout[i].position
        const right1 = left1 + width1
        const bottom1 = top1 + height1

        // compare with subsequent tiles
        for (let j = i + 1; j < layout.length; j++) {
            const [left2, top2, width2, height2] = layout[j].position
            const right2 = left2 + width2
            const bottom2 = top2 + height2

            // test if tile rectangles intersect both horizontally and vertically
            const horizontallyOverlaps = left1 < right2 && right1 > left2
            const verticallyOverlaps = top1 < bottom2 && bottom1 > top2
            if (horizontallyOverlaps && verticallyOverlaps) {
                return {
                    valid: false,
                    error: `Custom layout is invalid. Tile ${i} overlaps with tile ${j}.`,
                    overlappingTiles: [i, j]
                }
            }
        }
    }

    return { valid: true }
}

/**
 * Bounds specification (normalized coordinates 0-1)
 */
export type NormalizedBounds = [[number, number], [number, number]] // [[x1, y1], [x2, y2]]

/**
 * Parameters for calculating bounds region in device pixels
 */
export interface CalculateBoundsRegionParams {
    bounds: NormalizedBounds | null | undefined
    canvasWidth: number
    canvasHeight: number
    cssWidth: number
    cssHeight: number
    dpr: number
}

/**
 * Calculate the drawing region from normalized bounds.
 * Returns [x, y, width, height] in device pixels, bottom-left origin.
 * @param params - Bounds calculation parameters
 * @returns Tuple of [x, y, width, height] in device pixels
 */
export function calculateBoundsRegion(params: CalculateBoundsRegionParams): [number, number, number, number] {
    const { bounds, canvasWidth, canvasHeight, cssWidth, cssHeight, dpr } = params

    if (!bounds) {
        return [0, 0, canvasWidth, canvasHeight]
    }

    const [[x1, y1], [x2, y2]] = bounds

    // Convert normalized CSS fractions → device px
    const regionX = Math.floor(x1 * cssWidth * dpr)
    const regionW = Math.ceil((x2 - x1) * cssWidth * dpr)

    // Y: flip CSS top-origin → GL bottom-origin
    let regionY = Math.floor((1.0 - y2) * cssHeight * dpr)
    let regionH = Math.ceil((y2 - y1) * cssHeight * dpr)

    // Clamp so region is always within canvas
    if (regionY < 0) {
        regionH += regionY // shrink height
        regionY = 0
    }
    if (regionY + regionH > canvasHeight) {
        regionH = canvasHeight - regionY
    }

    return [regionX, regionY, regionW, regionH]
}

/**
 * Parameters for calculating bounds region in CSS pixels
 */
export interface CalculateBoundsRegionCSSParams {
    bounds: NormalizedBounds | null | undefined
    rectWidth: number
    rectHeight: number
}

/**
 * Convert bounds into CSS pixel coordinates (for hit testing).
 * Returns [x, y, width, height] in CSS pixels.
 * @param params - Bounds calculation parameters
 * @returns Tuple of [x, y, width, height] in CSS pixels
 */
export function calculateBoundsRegionCSS(params: CalculateBoundsRegionCSSParams): [number, number, number, number] {
    const { bounds, rectWidth, rectHeight } = params

    if (!bounds) {
        return [0, 0, rectWidth, rectHeight]
    }

    const [[x1, y1], [x2, y2]] = bounds
    const regionX = Math.round(x1 * rectWidth)
    const regionW = Math.round((x2 - x1) * rectWidth)
    const yTop = Math.round(y1 * rectHeight)
    const yBot = Math.round(y2 * rectHeight)
    const regionH = yBot - yTop
    const regionY = rectHeight - yBot

    return [regionX, regionY, regionW, regionH]
}

/**
 * Parameters for effective canvas height calculation
 */
export interface EffectiveCanvasHeightParams {
    canvasHeight: number
    bounds: NormalizedBounds | null | undefined
    colorbarHeight: number
}

/**
 * Calculate canvas height available for tiles (excludes colorbar).
 * @param params - Canvas dimension parameters
 * @returns Effective height in pixels
 */
export function calculateEffectiveCanvasHeight(params: EffectiveCanvasHeightParams): number {
    const { canvasHeight, bounds, colorbarHeight } = params

    let regionH = canvasHeight

    if (bounds) {
        const [[, y1], [, y2]] = bounds
        const yTop = Math.round(y1 * canvasHeight)
        const yBot = Math.round(y2 * canvasHeight)
        regionH = yBot - yTop
    }

    // Subtract colorbar height only within region
    return regionH - colorbarHeight
}

/**
 * Parameters for effective canvas width calculation
 */
export interface EffectiveCanvasWidthParams {
    canvasWidth: number
    bounds: NormalizedBounds | null | undefined
    legendPanelWidth: number
}

/**
 * Calculate canvas width available for tiles (excludes legend panel).
 * @param params - Canvas dimension parameters
 * @returns Effective width in pixels
 */
export function calculateEffectiveCanvasWidth(params: EffectiveCanvasWidthParams): number {
    const { canvasWidth, bounds, legendPanelWidth } = params

    let regionW = canvasWidth

    if (bounds) {
        const [[x1], [x2]] = bounds
        regionW = Math.round((x2 - x1) * canvasWidth)
    }

    // Subtract legend panel width only within region
    return regionW - legendPanelWidth
}

/**
 * Extended field of view result with min/max bounds and rotation
 */
export interface ExtendedFOV {
    mnMM: vec3
    mxMM: vec3
    rotation: mat4
    fovMM: vec3
}

/**
 * Parameters for field of view calculation in voxels
 */
export interface ScreenFieldOfViewVoxParams {
    fieldOfViewDeObliqueMM: vec3 | number[]
    swizzleVec3MM: (v3: vec3, axCorSag: SLICE_TYPE) => vec3
    axCorSag: SLICE_TYPE
}

/**
 * Returns the swizzled field of view for the given slice orientation in voxel space.
 * @param params - FOV calculation parameters
 * @returns Field of view as vec3
 */
export function calculateScreenFieldOfViewVox(params: ScreenFieldOfViewVoxParams): vec3 {
    const { fieldOfViewDeObliqueMM, swizzleVec3MM, axCorSag } = params
    const fov = vec3.clone(fieldOfViewDeObliqueMM as vec3)
    return swizzleVec3MM(fov, axCorSag)
}

/**
 * Parameters for field of view calculation in millimeters
 */
export interface ScreenFieldOfViewMMParams {
    volumesLength: number
    extentsMin: vec3 | number[]
    extentsMax: vec3 | number[]
    volumeObjectExtentsMin?: vec3 | number[]
    volumeObjectExtentsMax?: vec3 | number[]
    isSliceMM: boolean
    forceSliceMM: boolean
    getScreenFieldOfViewVox: (axCorSag: SLICE_TYPE) => vec3
    swizzleVec3MM: (v3: vec3, axCorSag: SLICE_TYPE) => vec3
    axCorSag: SLICE_TYPE
}

/**
 * Returns the field of view in millimeters for the given slice orientation.
 * @param params - FOV calculation parameters
 * @returns Field of view as vec3
 */
export function calculateScreenFieldOfViewMM(params: ScreenFieldOfViewMMParams): vec3 {
    const { volumesLength, extentsMin, extentsMax, volumeObjectExtentsMin, volumeObjectExtentsMax, isSliceMM, forceSliceMM, getScreenFieldOfViewVox, swizzleVec3MM, axCorSag } = params

    // extent of volume/mesh (in millimeters) in screen space
    if (volumesLength < 1) {
        let mnMM = vec3.fromValues(extentsMin[0], extentsMin[1], extentsMin[2])
        let mxMM = vec3.fromValues(extentsMax[0], extentsMax[1], extentsMax[2])
        mnMM = swizzleVec3MM(mnMM, axCorSag)
        mxMM = swizzleVec3MM(mxMM, axCorSag)
        const fovMM = vec3.create()
        vec3.subtract(fovMM, mxMM, mnMM)
        return fovMM
    }

    if (!forceSliceMM && !isSliceMM) {
        // return voxel space
        return getScreenFieldOfViewVox(axCorSag)
    }

    const eMin = volumeObjectExtentsMin ?? extentsMin
    const eMax = volumeObjectExtentsMax ?? extentsMax
    let mnMM = vec3.fromValues(eMin[0], eMin[1], eMin[2])
    let mxMM = vec3.fromValues(eMax[0], eMax[1], eMax[2])

    mnMM = swizzleVec3MM(mnMM, axCorSag)
    mxMM = swizzleVec3MM(mxMM, axCorSag)
    const fovMM = vec3.create()
    vec3.subtract(fovMM, mxMM, mnMM)
    return fovMM
}

/**
 * Parameters for extended voxel-aligned field of view
 */
export interface ScreenFieldOfViewExtendedVoxParams {
    extentsMinOrtho: vec3 | number[]
    extentsMaxOrtho: vec3 | number[]
    swizzleVec3MM: (v3: vec3, axCorSag: SLICE_TYPE) => vec3
    axCorSag: SLICE_TYPE
}

/**
 * Returns extended voxel-aligned field of view and bounds for the given slice orientation.
 * @param params - FOV calculation parameters
 * @returns Extended FOV object
 */
export function calculateScreenFieldOfViewExtendedVox(params: ScreenFieldOfViewExtendedVoxParams): ExtendedFOV {
    const { extentsMinOrtho, extentsMaxOrtho, swizzleVec3MM, axCorSag } = params

    let mnMM = vec3.fromValues(extentsMinOrtho[0], extentsMinOrtho[1], extentsMinOrtho[2])
    let mxMM = vec3.fromValues(extentsMaxOrtho[0], extentsMaxOrtho[1], extentsMaxOrtho[2])
    const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
    mnMM = swizzleVec3MM(mnMM, axCorSag)
    mxMM = swizzleVec3MM(mxMM, axCorSag)
    const fovMM = vec3.create()
    vec3.subtract(fovMM, mxMM, mnMM)
    return { mnMM, mxMM, rotation, fovMM }
}

/**
 * Parameters for extended millimeter-aligned field of view
 */
export interface ScreenFieldOfViewExtendedMMParams {
    volumesLength: number
    extentsMin: vec3 | number[]
    extentsMax: vec3 | number[]
    volumeObjectExtentsMin?: vec3 | number[]
    volumeObjectExtentsMax?: vec3 | number[]
    swizzleVec3MM: (v3: vec3, axCorSag: SLICE_TYPE) => vec3
    axCorSag: SLICE_TYPE
}

/**
 * Returns extended millimeter-aligned field of view and bounds for the given slice orientation.
 * @param params - FOV calculation parameters
 * @returns Extended FOV object
 */
export function calculateScreenFieldOfViewExtendedMM(params: ScreenFieldOfViewExtendedMMParams): ExtendedFOV {
    const { volumesLength, extentsMin, extentsMax, volumeObjectExtentsMin, volumeObjectExtentsMax, swizzleVec3MM, axCorSag } = params

    if (volumesLength < 1) {
        let mnMM = vec3.fromValues(extentsMin[0], extentsMin[1], extentsMin[2])
        let mxMM = vec3.fromValues(extentsMax[0], extentsMax[1], extentsMax[2])
        const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
        mnMM = swizzleVec3MM(mnMM, axCorSag)
        mxMM = swizzleVec3MM(mxMM, axCorSag)
        const fovMM = vec3.create()
        vec3.subtract(fovMM, mxMM, mnMM)
        return { mnMM, mxMM, rotation, fovMM }
    }

    // extent of volume/mesh (in millimeters) in screen space
    const eMin = volumeObjectExtentsMin ?? extentsMin
    const eMax = volumeObjectExtentsMax ?? extentsMax
    let mnMM = vec3.fromValues(eMin[0], eMin[1], eMin[2])
    let mxMM = vec3.fromValues(eMax[0], eMax[1], eMax[2])
    const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
    mnMM = swizzleVec3MM(mnMM, axCorSag)
    mxMM = swizzleVec3MM(mxMM, axCorSag)
    const fovMM = vec3.create()
    vec3.subtract(fovMM, mxMM, mnMM)
    return { mnMM, mxMM, rotation, fovMM }
}

/**
 * Slice scale result with volume scaling and voxel dimensions
 */
export interface SliceScaleResult {
    volScale: number[]
    vox: number[]
    longestAxis: number
    dimsMM: vec3
}

/**
 * Parameters for calculating slice scale
 */
export interface CalculateSliceScaleParams {
    forceVox: boolean
    getScreenFieldOfViewMM: (axCorSag: SLICE_TYPE) => vec3
    getScreenFieldOfViewVox: (axCorSag: SLICE_TYPE) => vec3
    backDims: number[]
}

/**
 * Calculates volume scaling factors and voxel dimensions for rendering.
 * @param params - Slice scale calculation parameters
 * @returns SliceScaleResult with volScale, vox, longestAxis, and dimsMM
 */
export function calculateSliceScale(params: CalculateSliceScaleParams): SliceScaleResult {
    const { forceVox, getScreenFieldOfViewMM, getScreenFieldOfViewVox, backDims } = params

    let dimsMM = getScreenFieldOfViewMM(SLICE_TYPE.AXIAL)
    if (forceVox) {
        dimsMM = getScreenFieldOfViewVox(SLICE_TYPE.AXIAL)
    }
    const longestAxis = Math.max(dimsMM[0], Math.max(dimsMM[1], dimsMM[2]))
    const volScale = [dimsMM[0] / longestAxis, dimsMM[1] / longestAxis, dimsMM[2] / longestAxis]
    const vox = [backDims[1], backDims[2], backDims[3]]
    return { volScale, vox, longestAxis, dimsMM }
}

/**
 * Parameters for xyMM2xyzMM calculation
 */
export interface XyMM2xyzMMParams {
    axCorSag: SLICE_TYPE
    sliceFrac: number
    frac2mm: (frac: [number, number, number]) => number[] | Float32Array
    swizzleVec3MM: (v3: vec3, axCorSag: SLICE_TYPE) => vec3
}

/**
 * Computes a plane in mm space for a given slice orientation and depth.
 * Returns [ax, ay, az, xMult, yMult] where (ax, ay, az) is a reference point
 * and (xMult, yMult) are multipliers for converting screen X/Y to world Z.
 * @param params - Plane calculation parameters
 * @returns Array [ax, ay, az, xMult, yMult]
 */
export function calculateXyMM2xyzMM(params: XyMM2xyzMMParams): number[] {
    const { axCorSag, sliceFrac, frac2mm, swizzleVec3MM } = params

    // given X and Y, find Z for a plane defined by 3 points (a,b,c)
    // https://math.stackexchange.com/questions/851742/calculate-coordinate-of-any-point-on-triangle-in-3d-plane
    let sliceDim = 2 // axial depth is NIfTI k dimension
    if (axCorSag === SLICE_TYPE.CORONAL) {
        sliceDim = 1
    } // coronal depth is NIfTI j dimension
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        sliceDim = 0
    } // sagittal depth is NIfTI i dimension

    const a: [number, number, number] = [0, 0, 0]
    const b: [number, number, number] = [1, 1, 0]
    const c: [number, number, number] = [1, 0, 1]

    a[sliceDim] = sliceFrac
    b[sliceDim] = sliceFrac
    c[sliceDim] = sliceFrac

    const aMM = frac2mm(a)
    const bMM = frac2mm(b)
    const cMM = frac2mm(c)

    const aSwizzled = swizzleVec3MM(vec3.fromValues(aMM[0], aMM[1], aMM[2]), axCorSag)
    const bSwizzled = swizzleVec3MM(vec3.fromValues(bMM[0], bMM[1], bMM[2]), axCorSag)
    const cSwizzled = swizzleVec3MM(vec3.fromValues(cMM[0], cMM[1], cMM[2]), axCorSag)

    const denom = (bSwizzled[0] - aSwizzled[0]) * (cSwizzled[1] - aSwizzled[1]) - (cSwizzled[0] - aSwizzled[0]) * (bSwizzled[1] - aSwizzled[1])
    let yMult = (bSwizzled[0] - aSwizzled[0]) * (cSwizzled[2] - aSwizzled[2]) - (cSwizzled[0] - aSwizzled[0]) * (bSwizzled[2] - aSwizzled[2])
    yMult /= denom
    let xMult = (bSwizzled[1] - aSwizzled[1]) * (cSwizzled[2] - aSwizzled[2]) - (cSwizzled[1] - aSwizzled[1]) * (bSwizzled[2] - aSwizzled[2])
    xMult /= denom

    const AxyzMxy = [0, 0, 0, 0, 0]
    AxyzMxy[0] = aSwizzled[0]
    AxyzMxy[1] = aSwizzled[1]
    AxyzMxy[2] = aSwizzled[2]
    AxyzMxy[3] = xMult
    AxyzMxy[4] = yMult
    return AxyzMxy
}

/**
 * Label style for legend panel calculations
 */
export interface LabelStyle {
    bulletScale?: number
    textScale: number
}

/**
 * Label for legend panel calculations
 */
export interface LegendLabel {
    text: string
    style: LabelStyle
}

/**
 * Parameters for calculating bullet margin width
 */
export interface CalculateBulletMarginWidthParams {
    labels: LegendLabel[]
    fontPx: number
    textHeight: (fontSize: number, text: string) => number
}

/**
 * Calculate bullet margin width based on widest bullet scale and tallest label height.
 * @param params - Bullet margin calculation parameters
 * @returns Bullet margin width in pixels
 */
export function calculateBulletMarginWidth(params: CalculateBulletMarginWidthParams): number {
    const { labels, fontPx, textHeight } = params

    if (labels.length === 0) {
        return 0
    }

    const widestBulletScale =
        labels.length === 1 ? (labels[0].style.bulletScale ?? 1) : (labels.reduce((a, b) => ((a.style.bulletScale ?? 1) > (b.style.bulletScale ?? 1) ? a : b)).style.bulletScale ?? 1)

    const tallestLabel =
        labels.length === 1
            ? labels[0]
            : labels.reduce((a, b) => {
                  const aSize = fontPx * a.style.textScale
                  const bSize = fontPx * b.style.textScale
                  const taller = textHeight(aSize, a.text) > textHeight(bSize, b.text) ? a : b
                  return taller
              })

    const size = fontPx * tallestLabel.style.textScale
    let bulletMargin = textHeight(size, tallestLabel.text) * widestBulletScale
    bulletMargin += size
    return bulletMargin
}

/**
 * Parameters for calculating legend panel width
 */
export interface CalculateLegendPanelWidthParams {
    labels: LegendLabel[]
    showLegend: boolean
    fontPx: number
    canvasWidth: number
    textWidth: (fontSize: number, text: string) => number
    getBulletMarginWidth: () => number
}

/**
 * Calculate width of legend panel based on labels and bullet margin.
 * Returns 0 if legend is hidden or too wide for canvas.
 * @param params - Legend panel width calculation parameters
 * @returns Legend panel width in pixels
 */
export function calculateLegendPanelWidth(params: CalculateLegendPanelWidthParams): number {
    const { labels, showLegend, fontPx, canvasWidth, textWidth, getBulletMarginWidth } = params

    if (!showLegend || labels.length === 0) {
        return 0
    }

    const scale = 1.0 // we may want to make this adjustable in the future
    const horizontalMargin = fontPx * scale
    let width = 0

    const longestLabel = labels.reduce((a, b) => {
        const aSize = fontPx * a.style.textScale
        const bSize = fontPx * b.style.textScale
        const longer = textWidth(aSize, a.text) > textWidth(bSize, b.text) ? a : b
        return longer
    })

    const longestTextSize = fontPx * longestLabel.style.textScale
    const longestTextLength = textWidth(longestTextSize, longestLabel.text)

    const bulletMargin = getBulletMarginWidth()

    if (longestTextLength) {
        width = bulletMargin + longestTextLength
        width += horizontalMargin * 2
    }

    if (width >= canvasWidth) {
        return 0
    }

    return width
}

/**
 * Parameters for calculating legend panel height
 */
export interface CalculateLegendPanelHeightParams {
    labels: LegendLabel[]
    fontPx: number
    panelScale: number
    textHeight: (fontSize: number, text: string) => number
}

/**
 * Calculate legend panel height based on labels and scale.
 * @param params - Legend panel height calculation parameters
 * @returns Legend panel height in pixels
 */
export function calculateLegendPanelHeight(params: CalculateLegendPanelHeightParams): number {
    const { labels, fontPx, panelScale, textHeight } = params

    let height = 0
    const verticalMargin = fontPx

    for (const label of labels) {
        const labelSize = fontPx * label.style.textScale * panelScale
        const labelHeight = textHeight(labelSize, label.text)
        height += labelHeight
    }

    if (height) {
        height += (verticalMargin / 2) * (labels.length + 1) * panelScale
    }

    return height
}

/**
 * Parameters for calculating colorbar panel
 */
export interface CalculateColorbarPanelParams {
    fontPx: number
    boundsRegion: [number, number, number, number]
    colorbarWidth: number
}

/**
 * Calculate and reserve canvas area for colorbar panel.
 * Returns [left, top, width, height] in device pixels.
 * @param params - Colorbar panel calculation parameters
 * @returns Tuple of [left, top, width, height] and the colorbar height to store
 */
export function calculateColorbarPanel(params: CalculateColorbarPanelParams): {
    leftTopWidthHeight: [number, number, number, number]
    colorbarHeight: number
} {
    const { fontPx, boundsRegion, colorbarWidth } = params

    const fullHt = 3 * fontPx
    if (fullHt < 0) {
        return {
            leftTopWidthHeight: [0, 0, 0, 0],
            colorbarHeight: 0
        }
    }

    const [regionX, regionY, regionW, regionH] = boundsRegion

    // Calculate width as a percentage of region width
    const widthPercentage = colorbarWidth > 0 && colorbarWidth <= 1 ? colorbarWidth : 1.0
    const width = widthPercentage * regionW

    // Position at bottom of the region (so it doesn't overlap content)
    const leftTopWidthHeight: [number, number, number, number] = [
        regionX + (regionW - width) / 2, // center within region
        regionY + regionH - fullHt, // top within region
        width,
        fullHt
    ]

    return {
        leftTopWidthHeight,
        colorbarHeight: fullHt + 1
    }
}

/**
 * Check if a point is inside a bounds region (CSS coordinates).
 * @param params - Point and bounds to check
 * @returns true if point is inside bounds
 */
export function isPointInBoundsCSS(params: { x: number; y: number; boundsRegion: [number, number, number, number] }): boolean {
    const { x, y, boundsRegion } = params
    const [bx, by, bw, bh] = boundsRegion
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh
}

/**
 * Check if cursor position is inside bounds region (device pixels).
 * @param params - Cursor position and bounds to check
 * @returns true if cursor is inside bounds
 */
export function isCursorInBounds(params: { mouseX: number; mouseY: number; boundsRegion: [number, number, number, number] }): boolean {
    const { mouseX, mouseY, boundsRegion } = params

    if (mouseX < 0 || mouseY < 0) {
        return false
    }

    const [regionX, regionY, regionW, regionH] = boundsRegion
    return mouseX >= regionX && mouseX <= regionX + regionW && mouseY >= regionY && mouseY <= regionY + regionH
}

/**
 * Parameters for getting slice dimension index
 */
export interface GetSliceDimensionParams {
    axCorSag: SLICE_TYPE
}

/**
 * Get the dimension index (0=i, 1=j, 2=k) for a slice type.
 * @param params - Slice type
 * @returns Dimension index
 */
export function getSliceDimension(params: GetSliceDimensionParams): number {
    const { axCorSag } = params

    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        return 0 // i dimension
    }
    if (axCorSag === SLICE_TYPE.CORONAL) {
        return 1 // j dimension
    }
    return 2 // k dimension (axial)
}
