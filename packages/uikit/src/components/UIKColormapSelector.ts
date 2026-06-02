import { UIKRenderer } from '../uikrenderer.js'
import { UIKFont } from '../assets/uikfont.js'
import { Vec4, Color } from '../types.js'

/** Resolves a colormap name to its RGBA lookup table — a flat array of
 * `[r,g,b,a, r,g,b,a, …]` bytes (0–255), e.g. NiiVue's `nv.colormap(name)`
 * (256×4). Return null/undefined for unknown names. When supplied, the gradient
 * preview is drawn from the real LUT instead of the built-in approximation. */
export type ColormapLUTResolver = (name: string) => Uint8ClampedArray | Uint8Array | number[] | null | undefined

export interface UIKColormapSelectorOptions {
    bounds: Vec4
    selectedColormap: string
    colormaps: string[]
    /** @deprecated The selector no longer renders labels (only the selection
     * indicator + color gradient), so a font is not required. Accepted for
     * backward compatibility but ignored. Use a host tooltip to surface names. */
    font?: UIKFont
    onColormapChange: (colormap: string) => void
    /** Optional: resolve a colormap name to its real RGBA LUT so the gradient
     * preview matches the host's actual colormaps (e.g. `(n) => nv.colormap(n)`).
     * Without it, only the small built-in approximation table is available and
     * unknown names fall back to gray. */
    colormapLUT?: ColormapLUTResolver
    /** Visual customization surface. Since the selector draws only the
     * selection bullet + color gradient (no labels), the only colors it uses
     * are `backgroundColor` (the selected-bullet disk fill) and `textColor`
     * (the bullet/hover ring). */
    style?: {
        backgroundColor?: Color
        textColor?: Color
    }
}

export class UIKColormapSelector {
    private renderer: UIKRenderer
    private bounds: Vec4
    private selectedColormap: string
    private colormaps: string[]
    private onColormapChange: (colormap: string) => void
    private colormapLUT?: ColormapLUTResolver
    private style: {
        backgroundColor: Color
        textColor: Color
    }
    private hoveredIndex: number = -1
    private selectedIndex: number = 0

    constructor(renderer: UIKRenderer, options: UIKColormapSelectorOptions) {
        this.renderer = renderer
        this.bounds = options.bounds
        this.selectedColormap = options.selectedColormap
        this.colormaps = options.colormaps
        this.onColormapChange = options.onColormapChange
        this.colormapLUT = options.colormapLUT

        // Default styling
        this.style = {
            backgroundColor: options.style?.backgroundColor || [0.15, 0.18, 0.22, 1.0],
            textColor: options.style?.textColor || [1.0, 1.0, 1.0, 1.0]
        }

        // Find selected index, snapping an unknown initial value to the first
        // entry so getSelectedColormap() agrees with the highlighted row (same
        // normalization as setSelectedColormap).
        this.selectedIndex = this.colormaps.indexOf(this.selectedColormap)
        if (this.selectedIndex === -1) this.selectedIndex = 0
        this.selectedColormap = this.colormaps[this.selectedIndex] ?? this.selectedColormap
    }

    public render(): void {
        if (this.colormaps.length === 0) {
            return
        }
        const [x, y, width, height] = this.bounds
        const itemHeight = height / this.colormaps.length

        // Layout per row, left → right:
        //   [selection circle area]  [gradient bar]
        // No labels are drawn — the circle marks the selected row (radio-button
        // style) and the gradient claims the rest of the row width. The host
        // can surface the colormap name via a tooltip (see getHoveredColormap).
        const PADDING_X = 6
        const LEFT_COL_WIDTH = itemHeight
        const GRADIENT_INSET_Y = 1

        const gradientLeft = x + LEFT_COL_WIDTH
        const gradientRight = x + width - PADDING_X
        const gradientWidth = Math.max(8, gradientRight - gradientLeft)

        // Selection-circle geometry — matches UIKSlider thumb style: a disk
        // in the panel bg color with a single ring outline in textColor.
        // ringRadius is the outermost extent; clamp it so the ring (plus its
        // 1px overshoot and a small margin) always fits within the row height.
        // Otherwise the puck on the first/last row is clipped at the canvas
        // edge, and a tall puck bleeds into the neighbouring rows.
        const circleCenterX = x + LEFT_COL_WIDTH / 2
        const VERT_MARGIN = 3
        const maxRingRadius = Math.max(3, itemHeight / 2 - VERT_MARGIN)
        const ringRadius = Math.min(itemHeight * 0.24 + 1, maxRingRadius)
        const diskRadius = Math.max(2, ringRadius - 1)

        for (let i = 0; i < this.colormaps.length; i++) {
            const itemY = y + (i * itemHeight)
            const isSelected = i === this.selectedIndex
            const isHovered = i === this.hoveredIndex && !isSelected

            // Gradient bar fills the area right of the selection circle.
            this.drawColormapPreview(
                gradientLeft,
                itemY + GRADIENT_INSET_Y,
                gradientWidth,
                Math.max(2, itemHeight - 2 * GRADIENT_INSET_Y),
                this.colormaps[i]
            )

            // Selection / hover indicator on the right, drawn to match the
            // UIKSlider thumb (filled bg disk + 0.2-fill ring in textColor).
            const cy = itemY + itemHeight / 2
            if (isSelected) {
                this.renderer.drawCircle({
                    leftTopWidthHeight: [
                        circleCenterX - diskRadius,
                        cy - diskRadius,
                        diskRadius * 2,
                        diskRadius * 2
                    ],
                    circleColor: this.style.backgroundColor,
                    fillPercent: 1.0
                })
                this.renderer.drawCircle({
                    leftTopWidthHeight: [
                        circleCenterX - ringRadius,
                        cy - ringRadius,
                        ringRadius * 2,
                        ringRadius * 2
                    ],
                    circleColor: this.style.textColor,
                    fillPercent: 0.2
                })
            } else if (isHovered) {
                // Empty ring as a preview affordance — clicking will fill it.
                this.renderer.drawCircle({
                    leftTopWidthHeight: [
                        circleCenterX - ringRadius,
                        cy - ringRadius,
                        ringRadius * 2,
                        ringRadius * 2
                    ],
                    circleColor: this.style.textColor,
                    fillPercent: 0.15
                })
            }
        }
    }

    // Built-in approximation table, used only when the host doesn't supply a
    // real LUT via `colormapLUT`. Hoisted to a static so it isn't rebuilt on
    // every call/frame. These are coarse stops — a host with real colormaps
    // (e.g. NiiVue) should pass `colormapLUT` for accurate previews.
    private static readonly FALLBACK_COLORMAPS: { [key: string]: Color[] } = {
        gray: [[0.1, 0.1, 0.1, 1], [0.9, 0.9, 0.9, 1]],
        plasma: [[0.05, 0.03, 0.53, 1], [0.9, 0.9, 0.13, 1]],
        viridis: [[0.27, 0.0, 0.33, 1], [0.99, 0.91, 0.14, 1]],
        inferno: [[0.0, 0.0, 0.0, 1], [0.4, 0.09, 0.43, 1], [0.99, 0.65, 0.04, 1], [1.0, 1.0, 0.85, 1]],
        hot: [[0.0, 0.0, 0.0, 1], [1.0, 0.2, 0.0, 1], [1.0, 1.0, 0.0, 1], [1.0, 1.0, 1.0, 1]],
        cool: [[0.0, 1.0, 1.0, 1], [1.0, 0.0, 1.0, 1]]
    }

    private drawColormapPreview(x: number, y: number, width: number, height: number, colormap: string): void {
        // Prefer the host-supplied real LUT (e.g. nv.colormap(name)) so the
        // preview matches the actual colormap; otherwise fall back to the
        // built-in approximation, then gray for unknown names. The previous
        // code only had the approximation table, so e.g. 'inferno' rendered as
        // a near-gray 2-stop ramp and any unlisted name became gray.
        const lut = this.colormapLUT ? this.colormapLUT(colormap) : null
        let colorAt: (t: number) => Color
        if (lut && lut.length >= 4) {
            const stops = Math.floor(lut.length / 4)
            colorAt = (t: number): Color => {
                const idx = Math.min(stops - 1, Math.max(0, Math.round(t * (stops - 1))))
                const o = idx * 4
                return [lut[o] / 255, lut[o + 1] / 255, lut[o + 2] / 255, 1.0]
            }
        } else {
            const colors = UIKColormapSelector.FALLBACK_COLORMAPS[colormap.toLowerCase()]
                || UIKColormapSelector.FALLBACK_COLORMAPS.gray
            const last = colors.length - 1
            colorAt = (t: number): Color => {
                if (colors.length === 1) {
                    return colors[0]
                }
                // General N-stop linear interpolation.
                const seg = Math.min(Math.floor(t * last), last - 1)
                const localT = t * last - seg
                const a = colors[seg]
                const b = colors[seg + 1]
                return [
                    a[0] + localT * (b[0] - a[0]),
                    a[1] + localT * (b[1] - a[1]),
                    a[2] + localT * (b[2] - a[2]),
                    1.0
                ]
            }
        }

        // Render the gradient one output column at a time. Each column is a
        // single drawLine, and its height is shrunk toward the left/right ends
        // to follow a rounded-capsule profile (radius = height/2) so the bar
        // reads as a beveled capsule like the other UIK controls — no extra
        // shader, just a per-column height.
        const pixelCount = Math.max(2, Math.ceil(width))
        const inv = 1 / (pixelCount - 1)
        const r = height / 2
        for (let i = 0; i < pixelCount; i++) {
            const px = x + i
            // Horizontal distance into the nearest rounded end-cap (0 in the
            // flat middle); the cap is a circle of radius r, so the column's
            // half-height there is sqrt(r^2 - capDist^2).
            const capDist = Math.max(0, (x + r) - px, px - (x + width - r))
            const colHeight = capDist > 0 ? 2 * Math.sqrt(Math.max(0, r * r - capDist * capDist)) : height
            // Overlap each column by 1px so the line shader's edge AA doesn't
            // leave a sub-pixel gap between adjacent columns.
            this.renderer.drawLine({
                startEnd: [px, y + height / 2, px + 2, y + height / 2],
                thickness: colHeight,
                color: colorAt(i * inv)
            })
        }

        // High-contrast capsule rim on top, matching the slider thumb / toggle
        // / button / view-mode outline. Transparent fill so the gradient shows
        // through; only the border band paints.
        this.renderer.drawRoundedRect({
            bounds: [x, y, width, height],
            fillColor: [0, 0, 0, 0],
            outlineColor: this.style.textColor,
            cornerRadius: r,
            thickness: 2
        })
    }

    public handleMouseEvent(event: MouseEvent): boolean {
        // Prefer event.offsetX/Y — when the host page DPR-scales canvas
        // backing buffers, the demo wrapper hands us offsets already in
        // device-pixel units that match this.bounds. Falling back to
        // clientX-rect math returns CSS pixels which mismatches the
        // device-pixel bounds on a retina display.
        let mouseX: number
        let mouseY: number
        if (typeof event.offsetX === 'number' && typeof event.offsetY === 'number') {
            mouseX = event.offsetX
            mouseY = event.offsetY
        } else {
            const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
            mouseX = event.clientX - rect.left
            mouseY = event.clientY - rect.top
        }

        const [x, y, width, height] = this.bounds
        
        // Check if mouse is within bounds
        if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) {
            this.hoveredIndex = -1
            return false
        }

        if (this.colormaps.length === 0) {
            this.hoveredIndex = -1
            return false
        }
        const itemHeight = height / this.colormaps.length
        const itemIndex = Math.floor((mouseY - y) / itemHeight)

        if (event.type === 'mousemove') {
            // Clamp to a valid row: at the exact bottom edge itemIndex can equal
            // colormaps.length (out of range), which would leave a stale hover.
            this.hoveredIndex = itemIndex >= 0 && itemIndex < this.colormaps.length ? itemIndex : -1
            return true
        }

        if (event.type === 'click' && itemIndex >= 0 && itemIndex < this.colormaps.length) {
            this.selectedIndex = itemIndex
            this.selectedColormap = this.colormaps[itemIndex]
            this.onColormapChange(this.selectedColormap)
            return true
        }

        return false
    }

    public setSelectedColormap(colormap: string): void {
        const idx = this.colormaps.indexOf(colormap)
        // Snap the stored value to the highlighted row when the requested
        // colormap isn't in the list, so getSelectedColormap() never disagrees
        // with the UI.
        this.selectedIndex = idx === -1 ? 0 : idx
        this.selectedColormap = this.colormaps[this.selectedIndex] ?? colormap
    }

    public getSelectedColormap(): string {
        return this.selectedColormap
    }

    /**
     * The colormap currently under the cursor, or null when nothing is
     * hovered. The selector renders no labels, so a host can use this (plus
     * the mouse position) to show a name tooltip in regular page fonts.
     */
    public getHoveredColormap(): string | null {
        if (this.hoveredIndex >= 0 && this.hoveredIndex < this.colormaps.length) {
            return this.colormaps[this.hoveredIndex]
        }
        return null
    }

    /**
     * Merge a partial style record into the selector's user-supplied style.
     * Lets the host page theme the selector at runtime without recreating it.
     */
    public setColors(partial: Partial<{
        backgroundColor: Color
        textColor: Color
    }>): void {
        // Only backgroundColor/textColor affect rendering; any extra keys a
        // host passes (e.g. a palette shared with the view-mode selector) are
        // harmlessly ignored.
        this.style = {
            backgroundColor: partial.backgroundColor ?? this.style.backgroundColor,
            textColor: partial.textColor ?? this.style.textColor
        }
    }

    /**
     * Get the bounding rectangle for hit testing.
     */
    public getBounds(): Vec4 {
        return this.bounds
    }

    /**
     * Update the selector bounds (for responsive / DPR-change layouts). The
     * label scale is derived from the per-row height of these bounds on each
     * render, so updating them after a device-pixel-ratio change is enough to
     * keep text sharp.
     */
    public setBounds(bounds: Vec4): void {
        this.bounds = bounds
    }
}