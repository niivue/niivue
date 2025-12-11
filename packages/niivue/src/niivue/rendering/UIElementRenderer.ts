/**
 * UI element rendering helper functions for overlays, colorbars, text, shapes, rulers, and graphs.
 * This module provides pure functions for UI rendering calculations and state setup.
 *
 * Related to: colorbar, ruler, text rendering, shapes, graphs, orientation cube, labels
 */

import type { NVLabel3D } from '@/nvlabel'

/**
 * Font metrics for a single character glyph
 */
export interface GlyphMetrics {
    lbwh: number[]
    xadv: number
    uv_lbwh: number[]
}

/**
 * Font metrics data structure
 */
export interface FontMetrics {
    size: number
    distanceRange: number
    mets: Record<number, GlyphMetrics>
}

/**
 * Parameters for text width calculation
 */
export interface TextWidthParams {
    fontMets: FontMetrics
    scale: number
    str: string
}

/**
 * Calculate the pixel width of a text string based on glyph advances.
 * @param params - Parameters containing font metrics, scale, and string
 * @returns Width in pixels
 */
export function calculateTextWidth(params: TextWidthParams): number {
    const { fontMets, scale, str } = params
    if (!str) {
        return 0
    }

    let w = 0
    const bytes = new TextEncoder().encode(str)
    for (let i = 0; i < str.length; i++) {
        w += scale * fontMets.mets[bytes[i]].xadv
    }
    return w
}

/**
 * Parameters for text height calculation
 */
export interface TextHeightParams {
    fontMets: FontMetrics
    scale: number
    str: string
}

/**
 * Calculate the pixel height of a text string based on tallest glyph.
 * @param params - Parameters containing font metrics, scale, and string
 * @returns Height in pixels
 */
export function calculateTextHeight(params: TextHeightParams): number {
    const { fontMets, scale, str } = params
    if (!str) {
        return 0
    }

    const byteSet = new Set(Array.from(str))
    const bytes = new TextEncoder().encode(Array.from(byteSet).join(''))

    const tallest = Object.values(fontMets.mets)
        .filter((_, index) => bytes.includes(index))
        .reduce((a, b) => (a.lbwh[3] > b.lbwh[3] ? a : b))
    const height = tallest.lbwh[3]
    return scale * height
}

/**
 * Parameters for text position calculations
 */
export interface TextPositionParams {
    xy: number[]
    str: string
    fontPx: number
    scale: number
    canvasWidth: number
}

/**
 * Calculate text position centered below a point with canvas boundary clamping.
 * @param params - Text position parameters
 * @param getTextWidth - Function to get text width for given size and string
 * @returns Adjusted [x, y] position and adjusted scale
 */
export function calculateTextBelowPosition(params: TextPositionParams, getTextWidth: (size: number, str: string) => number): { x: number; y: number; scale: number } {
    const { xy, str, fontPx, canvasWidth } = params
    let scale = params.scale

    let size = fontPx * scale
    let width = getTextWidth(size, str)
    if (width > canvasWidth) {
        scale *= (canvasWidth - 2) / width
        size = fontPx * scale
        width = getTextWidth(size, str)
    }

    let x = xy[0] - 0.5 * getTextWidth(size, str)
    x = Math.max(x, 1) // clamp left edge of canvas
    x = Math.min(x, canvasWidth - width - 1) // clamp right edge of canvas

    return { x, y: xy[1], scale }
}

/**
 * Calculate text position centered above a point with canvas boundary clamping.
 * @param params - Text position parameters
 * @param getTextWidth - Function to get text width for given size and string
 * @returns Adjusted [x, y] position and adjusted scale
 */
export function calculateTextAbovePosition(params: TextPositionParams, getTextWidth: (size: number, str: string) => number): { x: number; y: number; scale: number } {
    const { xy, str, fontPx, canvasWidth } = params
    let scale = params.scale

    let size = fontPx * scale
    let width = getTextWidth(size, str)
    if (width > canvasWidth) {
        scale *= (canvasWidth - 2) / width
        size = fontPx * scale
        width = getTextWidth(size, str)
    }

    let x = xy[0] - 0.5 * getTextWidth(size, str)
    x = Math.max(x, 1) // clamp left edge of canvas
    x = Math.min(x, canvasWidth - width - 1) // clamp right edge of canvas
    const y = xy[1] - size // position above the y coordinate

    return { x, y, scale }
}

/**
 * Calculate text position centered between two points with background rect.
 * @param startXYendXY - Start and end points [x1, y1, x2, y2]
 * @param fontPx - Font pixel size
 * @param scale - Text scale
 * @param getTextWidth - Function to get text width
 * @returns Position data for text and background rect
 */
export function calculateTextBetweenPosition(
    startXYendXY: number[],
    str: string,
    fontPx: number,
    scale: number,
    getTextWidth: (size: number, str: string) => number
): { textX: number; textY: number; rectLTWH: number[] } {
    const size = fontPx * scale
    const w = getTextWidth(size, str)
    const x = (startXYendXY[0] + startXYendXY[2]) * 0.5 - 0.5 * w
    const y = (startXYendXY[1] + startXYendXY[3]) * 0.5 - 0.5 * size

    return {
        textX: x,
        textY: y,
        rectLTWH: [x - 1, y - 1, w + 2, size + 2]
    }
}

/**
 * Determine background color for text between points based on text color brightness.
 * @param color - Text color or null
 * @param crosshairColor - Default crosshair color
 * @returns Background color [r, g, b, a]
 */
export function getTextBetweenBackgroundColor(color: number[] | null, crosshairColor: number[]): number[] {
    const clr = color ?? crosshairColor
    // if color is bright, make rect background dark and vice versa
    if (clr && clr[0] + clr[1] + clr[2] > 0.8) {
        return [0, 0, 0, 0.5]
    }
    return [1, 1, 1, 0.5]
}

/**
 * Parameters for ruler geometry calculation
 */
export interface RulerGeometryParams {
    fovMM: number[]
    ltwh: number[]
    rulerWidth: number
    regionBounds: { x: number; y: number; w: number; h: number }
}

/**
 * Result of ruler geometry calculation
 */
export interface RulerGeometry {
    startXYendXY: [number, number, number, number]
    pix1cm: number
    clipped: boolean
}

/**
 * Calculate ruler geometry for a 10cm ruler on a 2D slice.
 * @param params - Ruler geometry parameters
 * @returns Ruler geometry including start/end points and 1cm pixel size
 */
export function calculateRulerGeometry(params: RulerGeometryParams): RulerGeometry | null {
    const { fovMM, ltwh, rulerWidth, regionBounds } = params

    if (ltwh.length < 4 || fovMM.length < 1) {
        return null
    }

    const frac10cm = 100.0 / fovMM[0]
    const pix10cm = frac10cm * ltwh[2]
    const pix1cm = Math.max(Math.round(pix10cm * 0.1), 2)

    // position ruler horizontally centered in slice, at bottom of slice
    const pixLeft = Math.floor(ltwh[0] + 0.5 * ltwh[2] - 0.5 * pix10cm)
    const pixTop = Math.floor(ltwh[1] + ltwh[3] - pix1cm) + 0.5 * rulerWidth

    // Clip to bounds region
    const clippedLeft = Math.max(regionBounds.x, pixLeft)
    const clippedRight = Math.min(regionBounds.x + regionBounds.w, pixLeft + pix10cm)
    const clippedY = Math.min(regionBounds.y + regionBounds.h, pixTop)

    if (clippedRight <= clippedLeft) {
        return null // fully clipped out
    }

    return {
        startXYendXY: [clippedLeft, clippedY, clippedRight, clippedY],
        pix1cm,
        clipped: clippedLeft > pixLeft || clippedRight < pixLeft + pix10cm
    }
}

/**
 * Determine ruler outline color based on ruler color brightness.
 * @param rulerColor - The ruler color [r, g, b, a]
 * @returns Outline color (black for bright rulers, white for dark)
 */
export function getRulerOutlineColor(rulerColor: number[]): number[] {
    if (rulerColor[0] + rulerColor[1] + rulerColor[2] < 0.8) {
        return [1, 1, 1, 1]
    }
    return [0, 0, 0, 1]
}

/**
 * Calculate tick mark positions for ruler
 * @param startXYendXY - Ruler start/end coordinates
 * @param rulerWidth - Ruler line thickness
 * @returns Array of tick mark line coordinates [x1, y1, x2, y2] for each tick
 */
export function calculateRulerTicks(startXYendXY: number[], rulerWidth: number): number[][] {
    const ticks: number[][] = []
    const w1cm = -0.1 * (startXYendXY[0] - startXYendXY[2])
    const b = startXYendXY[1] - Math.floor(0.5 * rulerWidth)
    const t = Math.floor(b - 0.35 * w1cm)
    const t2 = Math.floor(b - 0.7 * w1cm)

    for (let i = 0; i < 11; i++) {
        let l = startXYendXY[0] + i * w1cm
        l = Math.max(l, startXYendXY[0] + 0.5 * rulerWidth)
        l = Math.min(l, startXYendXY[2] - 0.5 * rulerWidth)
        const xyxy = [l, b, l, i % 5 === 0 ? t2 : t]
        ticks.push(xyxy)
    }

    return ticks
}

/**
 * Parameters for colorbar panel reservation
 */
export interface ColorbarPanelParams {
    canvasHeight: number
    fontPx: number
    regionBounds: { x: number; y: number; w: number; h: number }
    legendPanelWidth: number
}

/**
 * Calculate the reserved colorbar panel area.
 * @param params - Colorbar panel parameters
 * @returns Left-top-width-height array for colorbar panel
 */
export function calculateColorbarPanel(params: ColorbarPanelParams): number[] {
    const { canvasHeight, fontPx, regionBounds, legendPanelWidth } = params

    const fullHt = 3 * fontPx

    // Adjust for legend panel
    const adjustedWidth = regionBounds.w - legendPanelWidth

    return [regionBounds.x, canvasHeight - fullHt, adjustedWidth, fullHt]
}

/**
 * Spacing and tick range result from tickSpacing calculation
 */
export type TickSpacingResult = [spacing: number, ticMin: number, ticMax: number]

/**
 * Calculate tick spacing for colorbar or graph axis.
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Tuple of [spacing, ticMin, ticMax]
 */
export function calculateTickSpacing(min: number, max: number): TickSpacingResult {
    const range = max - min
    if (range <= 0) {
        return [1, min, max]
    }

    // Calculate order of magnitude
    const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(range)))

    // Try different nice step values
    const niceSteps = [1, 2, 5, 10]
    let bestSpacing = orderOfMagnitude
    let bestTickCount = Math.ceil(range / orderOfMagnitude)

    for (const step of niceSteps) {
        const spacing = orderOfMagnitude * step
        const tickCount = Math.ceil(range / spacing)
        if (tickCount >= 2 && tickCount <= 10 && (bestTickCount < 2 || bestTickCount > 10 || tickCount <= bestTickCount)) {
            bestSpacing = spacing
            bestTickCount = tickCount
        }
    }

    // Calculate nice min/max
    const ticMin = Math.floor(min / bestSpacing) * bestSpacing
    const ticMax = Math.ceil(max / bestSpacing) * bestSpacing

    return [bestSpacing, ticMin, ticMax]
}

/**
 * Format number by dropping trailing zeros.
 * @param x - Number to format
 * @returns Formatted string
 */
export function humanizeNumber(x: number): string {
    return x.toFixed(6).replace(/\.?0*$/, '')
}

/**
 * Parameters for graph layout calculation
 */
export interface GraphLayoutParams {
    graphLTWH: number[]
    fontPx: number
    dpr: number
    regionBounds: { x: number; y: number; w: number; h: number }
    fontMinPx: number
}

/**
 * Calculate graph layout dimensions including margins and plot area.
 * @param params - Graph layout parameters
 * @param min - Data minimum value
 * @param max - Data maximum value
 * @param getTextWidth - Function to calculate text width
 * @returns Graph layout information
 */
export function calculateGraphLayout(
    params: GraphLayoutParams,
    min: number,
    max: number,
    getTextWidth: (size: number, str: string) => number
): {
    plotLTWH: number[]
    fntSize: number
    fntScale: number
    spacing: number
    ticMin: number
    mn: number
    mx: number
    digits: number
} | null {
    const { graphLTWH, fontPx, dpr, regionBounds, fontMinPx } = params

    const [spacing, ticMin, ticMax] = calculateTickSpacing(min, max)
    const digits = Math.max(0, -1 * Math.floor(Math.log(spacing) / Math.log(10)))
    const mn = Math.min(ticMin, min)
    const mx = Math.max(ticMax, max)

    // Font scaling based on region size
    let fntSize = fontPx * 0.7
    const screenWidthPts = regionBounds.w / dpr
    const screenHeightPts = regionBounds.h / dpr
    const screenAreaPts = screenWidthPts * screenHeightPts
    const refAreaPts = 800 * 600

    if (screenAreaPts < refAreaPts) {
        fntSize = 0
    } else {
        fntSize = Math.max(fntSize, fontMinPx)
    }

    const fntScale = fontPx > 0 ? fntSize / fontPx : 1

    // Determine widest label in vertical axis
    let maxTextWid = 0
    if (fntSize > 0) {
        let lineH = ticMin
        while (lineH <= mx) {
            const str = lineH.toFixed(digits)
            const w = getTextWidth(fntSize, str)
            maxTextWid = Math.max(w, maxTextWid)
            lineH += spacing
        }
    }

    const margin = 0.05
    const frameWid = Math.abs(graphLTWH[2])
    const frameHt = Math.abs(graphLTWH[3])

    // Plot is region where lines are drawn
    const plotLTWH = [
        graphLTWH[0] + margin * frameWid + maxTextWid,
        graphLTWH[1] + margin * frameHt,
        graphLTWH[2] - maxTextWid - 2 * margin * frameWid,
        graphLTWH[3] - fntSize - 2.5 * margin * frameHt
    ]

    if (plotLTWH[2] <= 0 || plotLTWH[3] <= 0) {
        return null
    }

    return {
        plotLTWH,
        fntSize,
        fntScale,
        spacing,
        ticMin,
        mn,
        mx,
        digits
    }
}

/**
 * Calculate graph background colors based on background brightness.
 * @param backColor - Background color [r, g, b, a]
 * @param opacity - Graph opacity
 * @returns Graph colors
 */
export function calculateGraphColors(
    backColor: number[],
    opacity: number
): {
    graphBackColor: number[]
    lineColor: number[]
    textColor: number[]
} {
    let graphBackColor = [0.15, 0.15, 0.15, opacity]
    let lineColor = [1, 1, 1, 1]

    if (backColor[0] + backColor[1] + backColor[2] > 1.5) {
        graphBackColor = [0.95, 0.95, 0.95, opacity]
        lineColor = [0, 0, 0, 1]
    }

    const textColor = [...lineColor]
    textColor[3] = 1

    return { graphBackColor, lineColor, textColor }
}

/**
 * Parameters for measurement tool line calculation
 */
export interface MeasurementLineParams {
    startXYendXY: number[]
    distance: number
}

/**
 * Calculate extended line coordinates for measurement tool end caps.
 * @param params - Measurement line parameters
 * @returns Extended origin and terminus points
 */
export function extendMeasurementLine(params: MeasurementLineParams): { origin: number[]; terminus: number[] } {
    const { startXYendXY, distance } = params
    const x0 = startXYendXY[0]
    const y0 = startXYendXY[1]
    const x1 = startXYendXY[2]
    const y1 = startXYendXY[3]

    const x = x0 - x1
    const y = y0 - y1

    if (x === 0 && y === 0) {
        return {
            origin: [x1 + distance, y1],
            terminus: [x1 + distance, y1]
        }
    }

    const c = Math.sqrt(x * x + y * y)
    const dX = (distance * x) / c
    const dY = (distance * y) / c

    return {
        origin: [x0 + dX, y0 + dY], // next to start point
        terminus: [x1 - dX, y1 - dY] // next to end point
    }
}

/**
 * Parameters for bullet margin calculation
 */
export interface BulletMarginParams {
    labels: NVLabel3D[]
    fontPx: number
    getTextHeight: (scale: number, str: string) => number
}

/**
 * Calculate bullet margin width based on widest bullet scale and tallest label height.
 * @param params - Bullet margin parameters
 * @returns Bullet margin width in pixels
 */
export function calculateBulletMarginWidth(params: BulletMarginParams): number {
    const { labels, fontPx, getTextHeight } = params

    if (labels.length === 0) {
        return 0
    }

    const widestBulletScale = labels.length === 1 ? labels[0].style.bulletScale : labels.reduce((a, b) => (a.style.bulletScale! > b.style.bulletScale! ? a : b)).style.bulletScale

    const tallestLabel =
        labels.length === 1
            ? labels[0]
            : labels.reduce((a, b) => {
                  const heightA = getTextHeight(a.style.textScale, a.text) * fontPx * a.style.textScale
                  const heightB = getTextHeight(b.style.textScale, b.text) * fontPx * b.style.textScale
                  return heightA > heightB ? a : b
              })

    const height = getTextHeight(tallestLabel.style.textScale, tallestLabel.text) * fontPx * tallestLabel.style.textScale
    return (widestBulletScale ?? 1) * height
}

/**
 * Parameters for legend panel height calculation
 */
export interface LegendPanelHeightParams {
    labels: NVLabel3D[]
    fontPx: number
    scaling: number
    getTextHeight: (scale: number, str: string) => number
}

/**
 * Calculate total height of legend panel for given labels.
 * @param params - Legend panel height parameters
 * @returns Total height in pixels
 */
export function calculateLegendPanelHeight(params: LegendPanelHeightParams): number {
    const { labels, fontPx, scaling, getTextHeight } = params

    if (labels.length === 0) {
        return 0
    }

    let totalHeight = 0
    const size = fontPx * scaling

    for (const label of labels) {
        const labelSize = fontPx * label.style.textScale
        const textHeight = getTextHeight(labelSize, label.text) * scaling
        totalHeight += textHeight + size / 2
    }

    return totalHeight
}

/**
 * Parameters for legend panel width calculation
 */
export interface LegendPanelWidthParams {
    labels: NVLabel3D[]
    fontPx: number
    getTextWidth: (size: number, str: string) => number
    getBulletMarginWidth: () => number
}

/**
 * Calculate total width of legend panel for given labels.
 * @param params - Legend panel width parameters
 * @returns Total width in pixels
 */
export function calculateLegendPanelWidth(params: LegendPanelWidthParams): number {
    const { labels, fontPx, getTextWidth, getBulletMarginWidth } = params

    if (labels.length === 0) {
        return 0
    }

    let maxWidth = 0
    const bulletMargin = getBulletMarginWidth()

    for (const label of labels) {
        const labelSize = fontPx * label.style.textScale
        const textWidth = getTextWidth(labelSize, label.text)
        const width = textWidth + bulletMargin + labelSize * 1.5
        maxWidth = Math.max(maxWidth, width)
    }

    return maxWidth
}

/**
 * Dotted line segment result
 */
export interface DottedLineSegment {
    startX: number
    startY: number
    endX: number
    endY: number
}

/**
 * Calculate dotted line segments for a given line.
 * @param startXYendXY - Line start and end [x1, y1, x2, y2]
 * @param fontPx - Font pixel size (used for segment sizing)
 * @param scale - Scale factor
 * @returns Array of visible segment coordinates
 */
export function calculateDottedLineSegments(startXYendXY: number[], fontPx: number, scale: number): DottedLineSegment[] {
    const segments: DottedLineSegment[] = []

    // Calculate segment vector
    const segmentX = startXYendXY[2] - startXYendXY[0]
    const segmentY = startXYendXY[3] - startXYendXY[1]
    const totalLength = Math.sqrt(segmentX * segmentX + segmentY * segmentY)

    if (totalLength === 0) {
        return segments
    }

    const size = fontPx * scale
    const segmentLength = size / 2
    const normalizedX = segmentX / totalLength
    const normalizedY = segmentY / totalLength
    const stepX = normalizedX * segmentLength
    const stepY = normalizedY * segmentLength

    let segmentCount = Math.floor(totalLength / segmentLength)
    if (totalLength % segmentLength) {
        segmentCount++
    }

    let currentX = startXYendXY[0]
    let currentY = startXYendXY[1]

    // Draw all segments except for the last one
    for (let i = 0; i < segmentCount - 1; i++) {
        if (i % 2 === 0) {
            // Only draw even segments (creates dotted pattern)
            segments.push({
                startX: currentX,
                startY: currentY,
                endX: currentX + stepX,
                endY: currentY + stepY
            })
        }
        currentX += stepX
        currentY += stepY
    }

    return segments
}

/**
 * Calculate screen pixel range for MSDF font rendering.
 * @param fontPx - Base font pixel size
 * @param scale - Text scale factor
 * @param fontMets - Font metrics data
 * @returns Screen pixel range value (minimum 1.0)
 */
export function calculateScreenPxRange(fontPx: number, scale: number, fontMets: FontMetrics): number {
    const size = fontPx * scale
    const screenPxRange = (size / fontMets.size) * fontMets.distanceRange
    return Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
}

/**
 * Calculate thumbnail dimensions to fit within a region.
 * @param regionWidth - Region width in pixels
 * @param regionHeight - Region height in pixels
 * @param aspectRatio - Image width/height ratio
 * @returns Thumbnail left, top, width, height
 */
export function calculateThumbnailDimensions(regionWidth: number, regionHeight: number, aspectRatio: number): { left: number; top: number; width: number; height: number } {
    let h = regionHeight
    let w = regionHeight * aspectRatio

    if (w > regionWidth) {
        // constrained by width
        h = regionWidth / aspectRatio
        w = regionWidth
    }

    return {
        left: (regionWidth - w) / 2,
        top: (regionHeight - h) / 2,
        width: w,
        height: h
    }
}

/**
 * Calculate orientation cube position and size.
 * @param leftTopWidthHeight - Tile bounds
 * @param effectiveCanvasHeight - Canvas height minus colorbar
 * @param canvasHeight - Full canvas height
 * @returns Position and size for orientation cube, or null if too small
 */
export function calculateOrientationCubePosition(leftTopWidthHeight: number[], effectiveCanvasHeight: number, canvasHeight: number): { x: number; y: number; size: number } | null {
    const sz = 0.05 * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3])
    if (sz < 5) {
        return null
    }

    let translateUpForColorbar = 0
    if (leftTopWidthHeight[1] === 0) {
        translateUpForColorbar = canvasHeight - effectiveCanvasHeight
    }

    return {
        x: 1.8 * sz + leftTopWidthHeight[0],
        y: translateUpForColorbar + 1.8 * sz + leftTopWidthHeight[1],
        size: sz
    }
}

/**
 * Calculate the stride for graph vertical lines based on data points.
 * @param dataLength - Number of data points
 * @returns Stride value
 */
export function calculateGraphLineStride(dataLength: number): number {
    let stride = 1
    while (dataLength / stride > 20) {
        stride *= 5
    }
    return stride
}
