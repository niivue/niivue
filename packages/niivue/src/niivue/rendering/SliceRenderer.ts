/**
 * Slice rendering helper functions for 2D slice visualization.
 * This module provides pure functions for slice rendering operations.
 *
 * Related to: 2D slice rendering (axial, coronal, sagittal), mosaic views, crosshairs
 */

import { SLICE_TYPE } from '@/nvdocument'

// WebGL texture unit constants
const TEXTURE0_BACK_VOL = 33984
const TEXTURE2_OVERLAY_VOL = 33986

/**
 * Parameters for updating texture interpolation
 */
export interface UpdateInterpolationParams {
    gl: WebGL2RenderingContext
    layer: number
    isForceLinear?: boolean
    isNearestInterpolation: boolean
    is2DSliceShader: boolean
}

/**
 * Update texture interpolation mode (nearest or linear) for background or overlay layer.
 * @param params - Parameters containing GL context, layer index, and interpolation settings
 */
export function updateInterpolation(params: UpdateInterpolationParams): void {
    const { gl, layer, isForceLinear = false, isNearestInterpolation, is2DSliceShader } = params

    let interp: number = gl.LINEAR
    if (!isForceLinear && isNearestInterpolation) {
        interp = gl.NEAREST
    }

    if (layer === 0) {
        gl.activeTexture(TEXTURE0_BACK_VOL) // background
    } else {
        gl.activeTexture(TEXTURE2_OVERLAY_VOL) // overlay
    }

    if (is2DSliceShader) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, interp)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, interp)
    } else {
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, interp)
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, interp)
    }
}

/**
 * Parsed mosaic item with rendering information
 */
export interface MosaicItem {
    axCorSag: SLICE_TYPE
    sliceMM: number
    isRender: boolean
    isLabel: boolean
    isCrossLines: boolean
}

/**
 * Result of parsing a mosaic string
 */
export interface MosaicParseResult {
    items: MosaicItem[][]
    axiMM: number[]
    corMM: number[]
    sagMM: number[]
    horizontalOverlap: number
}

/**
 * Parse a mosaic string into structured tile information.
 * @param mosaicStr - The mosaic string specification (e.g., "A -10 0 20; C 0")
 * @returns Parsed mosaic structure with rows of items and slice positions
 */
export function parseMosaicString(mosaicStr: string): MosaicParseResult {
    const normalizedStr = mosaicStr.replaceAll(';', ' ;').trim()
    const tokens = normalizedStr.split(/\s+/)

    const axiMM: number[] = []
    const corMM: number[] = []
    const sagMM: number[] = []
    const rows: MosaicItem[][] = []
    let currentRow: MosaicItem[] = []
    let horizontalOverlap = 0

    let axCorSag = SLICE_TYPE.AXIAL
    let isRender = false
    let isLabel = false
    let isCrossLines = false

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        if (token.includes('X')) {
            isCrossLines = true
            continue
        }
        if (token.includes('L')) {
            isLabel = !token.includes('-')
            continue
        }
        if (token.includes('H')) {
            i++
            horizontalOverlap = Math.abs(Math.max(0, Math.min(1, parseFloat(tokens[i]))))
            continue
        }
        if (token.includes('V')) {
            i++
            continue
        }
        if (token.includes('A')) {
            axCorSag = SLICE_TYPE.AXIAL
            continue
        }
        if (token.includes('C')) {
            axCorSag = SLICE_TYPE.CORONAL
            continue
        }
        if (token.includes('S')) {
            axCorSag = SLICE_TYPE.SAGITTAL
            continue
        }
        if (token.includes('R')) {
            isRender = true
            continue
        }
        if (token.includes(';')) {
            if (currentRow.length > 0) {
                rows.push(currentRow)
                currentRow = []
            }
            continue
        }

        const sliceMM = parseFloat(token)
        if (isNaN(sliceMM)) {
            continue
        }

        // Track slice positions for crosshairs
        if (!isRender) {
            if (axCorSag === SLICE_TYPE.AXIAL) {
                axiMM.push(sliceMM)
            }
            if (axCorSag === SLICE_TYPE.CORONAL) {
                corMM.push(sliceMM)
            }
            if (axCorSag === SLICE_TYPE.SAGITTAL) {
                sagMM.push(sliceMM)
            }
        }

        currentRow.push({
            axCorSag,
            sliceMM,
            isRender,
            isLabel,
            isCrossLines
        })

        // Reset per-item flags after creating item
        isRender = false
        isCrossLines = false
    }

    // Don't forget the last row
    if (currentRow.length > 0) {
        rows.push(currentRow)
    }

    return {
        items: rows,
        axiMM,
        corMM,
        sagMM,
        horizontalOverlap
    }
}

/**
 * Parameters for calculating mosaic tile layout
 */
export interface MosaicLayoutParams {
    regionWidth: number
    regionHeight: number
    tileMargin: number
    centerMosaic: boolean
    getFovMM: (axCorSag: SLICE_TYPE, isRender: boolean) => [number, number, number]
    tileGap?: number
}

/**
 * Layout information for a single mosaic tile
 */
export interface MosaicTileLayout {
    left: number
    top: number
    width: number
    height: number
    item: MosaicItem
}

/**
 * Result of mosaic layout calculation
 */
export interface MosaicLayoutResult {
    tiles: MosaicTileLayout[]
    scale: number
    marginLeft: number
    marginTop: number
}

/**
 * Calculate layout positions for mosaic tiles.
 * @param params - Layout parameters
 * @param parsedMosaic - Parsed mosaic structure
 * @returns Layout positions for all tiles
 */
export function calculateMosaicLayout(params: MosaicLayoutParams, parsedMosaic: MosaicParseResult): MosaicLayoutResult {
    const { regionWidth, regionHeight, tileMargin, centerMosaic, getFovMM, tileGap = 0 } = params
    const { items, horizontalOverlap } = parsedMosaic

    // First pass: calculate total dimensions
    let totalHeight = 0
    let maxRowWidth = 0

    const rowLayouts: Array<{ width: number; height: number; tiles: Array<{ w: number; h: number; item: MosaicItem }> }> = []

    for (const row of items) {
        let rowWidth = 0
        let rowHeight = 0
        const rowTiles: Array<{ w: number; h: number; item: MosaicItem }> = []
        let prevWidth = 0

        for (const item of row) {
            const fov = getFovMM(item.axCorSag, item.isRender)
            const w = item.axCorSag === SLICE_TYPE.SAGITTAL ? fov[1] : fov[0]
            const h = item.axCorSag === SLICE_TYPE.AXIAL ? fov[1] : fov[2]

            // Apply horizontal overlap
            if (horizontalOverlap > 0 && !item.isRender && rowTiles.length > 0) {
                rowWidth += Math.round(prevWidth * (1.0 - horizontalOverlap))
            } else if (rowTiles.length > 0) {
                rowWidth += prevWidth + tileGap
            }

            rowTiles.push({ w, h, item })
            rowHeight = Math.max(rowHeight, h)
            prevWidth = w
        }

        // Add the last tile width
        rowWidth += prevWidth

        rowLayouts.push({ width: rowWidth, height: rowHeight, tiles: rowTiles })
        totalHeight += rowHeight
        maxRowWidth = Math.max(maxRowWidth, rowWidth)
    }

    if (maxRowWidth <= 0 || totalHeight <= 0) {
        return { tiles: [], scale: 1, marginLeft: 0, marginTop: 0 }
    }

    // Calculate scale to fit in region
    const scaleW = (regionWidth - 2 * tileMargin - tileGap) / maxRowWidth
    const scaleH = (regionHeight - 2 * tileMargin) / totalHeight
    const scale = Math.min(scaleW, scaleH)

    // Calculate margins
    let marginLeft = tileMargin
    let marginTop = tileMargin
    if (centerMosaic) {
        marginLeft = Math.floor(0.5 * (regionWidth - maxRowWidth * scale))
        marginTop = Math.floor(0.5 * (regionHeight - totalHeight * scale))
    }

    // Second pass: calculate actual positions
    const tiles: MosaicTileLayout[] = []
    let top = 0

    for (const rowLayout of rowLayouts) {
        let left = 0
        let prevWidth = 0

        for (let i = 0; i < rowLayout.tiles.length; i++) {
            const tile = rowLayout.tiles[i]

            // Apply horizontal overlap
            if (horizontalOverlap > 0 && !tile.item.isRender && i > 0) {
                left += Math.round(prevWidth * (1.0 - horizontalOverlap))
            } else if (i > 0) {
                left += prevWidth + tileGap
            }

            tiles.push({
                left,
                top,
                width: tile.w,
                height: tile.h,
                item: tile.item
            })

            prevWidth = tile.w
        }

        top += rowLayout.height
    }

    return { tiles, scale, marginLeft, marginTop }
}

/**
 * Get the lines arrays (horizontal and vertical) for a given slice type.
 * @param axCorSag - Slice orientation
 * @param axiMM - Axial slice positions
 * @param corMM - Coronal slice positions
 * @param sagMM - Sagittal slice positions
 * @returns Object with linesH and linesV arrays
 */
export function getCrossLinesForSliceType(axCorSag: SLICE_TYPE, axiMM: number[], corMM: number[], sagMM: number[]): { linesH: number[]; linesV: number[] } {
    let linesH = corMM.slice()
    let linesV = sagMM.slice()

    if (axCorSag === SLICE_TYPE.CORONAL) {
        linesH = axiMM.slice()
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        linesH = axiMM.slice()
        linesV = corMM.slice()
    }

    return { linesH, linesV }
}

/**
 * Get the slice dimension index for a given slice type.
 * @param axCorSag - Slice orientation
 * @returns Dimension index (0=i/sagittal, 1=j/coronal, 2=k/axial)
 */
export function getSliceDimension(axCorSag: SLICE_TYPE): number {
    if (axCorSag === SLICE_TYPE.CORONAL) {
        return 1 // j dimension
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        return 0 // i dimension
    }
    return 2 // k dimension (axial)
}

/**
 * Calculate azimuth and elevation angles for a given slice type and orientation.
 * @param axCorSag - Slice orientation
 * @param isRadiological - Whether to use radiological convention
 * @returns Object with azimuth and elevation in degrees
 */
export function getSliceAngles(axCorSag: SLICE_TYPE, isRadiological: boolean): { azimuth: number; elevation: number } {
    let elevation = 0
    let azimuth = 0

    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        azimuth = isRadiological ? 90 : -90
    } else if (axCorSag === SLICE_TYPE.CORONAL) {
        azimuth = isRadiological ? 180 : 0
    } else {
        // AXIAL
        azimuth = isRadiological ? 180 : 0
        elevation = isRadiological ? -90 : 90
    }

    return { azimuth, elevation }
}

/**
 * Determine if radiological convention should be used based on options and slice type.
 * @param axCorSag - Slice orientation
 * @param isRadiologicalConvention - Global radiological convention setting
 * @param sagittalNoseLeft - Sagittal nose left setting
 * @param customMM - Custom MM value (Infinity or -Infinity for special cases)
 * @returns Whether to use radiological convention for rendering
 */
export function determineRadiologicalConvention(axCorSag: SLICE_TYPE, isRadiologicalConvention: boolean, sagittalNoseLeft: boolean, customMM: number): boolean {
    let isRadiological = isRadiologicalConvention && axCorSag < SLICE_TYPE.SAGITTAL

    if (customMM === Infinity || customMM === -Infinity) {
        isRadiological = customMM !== Infinity
        if (axCorSag === SLICE_TYPE.CORONAL) {
            isRadiological = !isRadiological
        }
    } else if (sagittalNoseLeft && axCorSag === SLICE_TYPE.SAGITTAL) {
        isRadiological = !isRadiological
    }

    return isRadiological
}

/**
 * Calculate width and height to fit a slice within a container, preserving aspect ratio.
 * @param sliceType - Slice orientation
 * @param volScale - Volume scale factors [x, y, z]
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @returns Tuple of [actualWidth, actualHeight]
 */
export function calculateSliceDimensions(sliceType: SLICE_TYPE, volScale: number[], containerWidth: number, containerHeight: number): [number, number] {
    let xScale: number
    let yScale: number

    switch (sliceType) {
        case SLICE_TYPE.AXIAL:
            xScale = volScale[0]
            yScale = volScale[1]
            break
        case SLICE_TYPE.CORONAL:
            xScale = volScale[0]
            yScale = volScale[2]
            break
        case SLICE_TYPE.SAGITTAL:
            xScale = volScale[1]
            yScale = volScale[2]
            break
        default:
            return [containerWidth, containerHeight]
    }

    // Calculate scale factor to fit within container while preserving aspect ratio
    const aspectRatio = xScale / yScale
    const containerAspect = containerWidth / containerHeight

    let actualWidth: number
    let actualHeight: number

    if (aspectRatio > containerAspect) {
        // width-constrained
        actualWidth = containerWidth
        actualHeight = containerWidth / aspectRatio
    } else {
        // height-constrained
        actualHeight = containerHeight
        actualWidth = containerHeight * aspectRatio
    }

    return [actualWidth, actualHeight]
}
