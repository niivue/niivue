import { UIKRenderer } from '../uikrenderer.js'
import { UIKFont } from '../assets/uikfont.js'
import { Vec4, Color } from '../types.js'

export interface UIKViewModeSelectorOptions {
    bounds: Vec4
    selectedMode: string
    modes: string[]
    font: UIKFont
    onModeChange: (mode: string) => void
    style?: {
        backgroundColor?: Color
        selectedColor?: Color
        hoverColor?: Color
        textColor?: Color
        borderColor?: Color
    }
}

export class UIKViewModeSelector {
    private renderer: UIKRenderer
    private bounds: Vec4
    private selectedMode: string
    private modes: string[]
    private font: UIKFont
    private onModeChange: (mode: string) => void
    private style: {
        backgroundColor: Color
        selectedColor: Color
        hoverColor: Color
        textColor: Color
        borderColor: Color
    }
    private hoveredIndex: number = -1
    private selectedIndex: number = 0

    constructor(renderer: UIKRenderer, options: UIKViewModeSelectorOptions) {
        this.renderer = renderer
        this.bounds = options.bounds
        this.selectedMode = options.selectedMode
        this.modes = options.modes
        this.font = options.font
        this.onModeChange = options.onModeChange

        // Default styling
        this.style = {
            backgroundColor: options.style?.backgroundColor || [0.15, 0.18, 0.22, 1.0], // Darker, more modern background
            selectedColor: options.style?.selectedColor || [0.2, 0.7, 1.0, 1.0], // Bright blue for selection
            hoverColor: options.style?.hoverColor || [0.25, 0.28, 0.32, 1.0], // Subtle hover effect
            textColor: options.style?.textColor || [1.0, 1.0, 1.0, 1.0],
            borderColor: options.style?.borderColor || [0.4, 0.4, 0.4, 1.0] // Lighter border for better contrast
        }

        // Find selected index, snapping an unknown initial value to the first
        // entry so getSelectedMode() agrees with the highlighted slot (same
        // normalization as setSelectedMode).
        this.selectedIndex = this.modes.indexOf(this.selectedMode)
        if (this.selectedIndex === -1) this.selectedIndex = 0
        this.selectedMode = this.modes[this.selectedIndex] ?? this.selectedMode
    }

    public render(): void {
        if (this.modes.length === 0) {
            return
        }
        const [x, y, width, height] = this.bounds
        const buttonWidth = width / this.modes.length

        // Outer rounded capsule: a thicker high-contrast outline (borderColor)
        // that wraps all of the options. Replaces the previous faint 1-px
        // four-line perimeter which read as a dim rectangle on dark
        // backgrounds. Using borderColor (rather than the selected-item color)
        // gives the capsule the same high-contrast rim as the buttons, slider
        // thumb and colormap ring, while the selected-slot fill (drawn next)
        // keeps the selectedColor so the active pill still stands out. Stroke
        // is in backing-buffer pixels — at DPR=2 a value of 4 lands as a
        // 2-CSS-pixel-wide line, prominent against the page background without
        // overpowering the labels.
        const OUTER_STROKE = 4
        const OUTER_RADIUS = Math.max(2, height / 2)
        const INSET = OUTER_STROKE
        const INNER_RADIUS = Math.max(2, OUTER_RADIUS - INSET)

        // Per-slot fill underneath (selected + hover). Drawn before the
        // capsule outline so the outline can "cap" the fill where they
        // meet at the perimeter edge of the slot.
        for (let i = 0; i < this.modes.length; i++) {
            const isSelected = i === this.selectedIndex
            const isHovered = i === this.hoveredIndex && !isSelected
            if (!isSelected && !isHovered) continue
            const fillColor = isSelected ? this.style.selectedColor : this.style.hoverColor
            const buttonX = x + (i * buttonWidth)
            this.renderer.drawRoundedRect({
                bounds: [
                    buttonX + INSET,
                    y + INSET,
                    buttonWidth - 2 * INSET,
                    height - 2 * INSET
                ],
                fillColor,
                outlineColor: fillColor,
                cornerRadius: INNER_RADIUS,
                thickness: 0
            })
        }

        // Outer capsule outline drawn on top of any selected/hover fill.
        // Transparent fill so the underlying selected color shows through
        // the interior; only the border band paints. Thickness > 1 keeps
        // it readable against dark backgrounds.
        this.renderer.drawRoundedRect({
            bounds: [x, y, width, height],
            fillColor: [0, 0, 0, 0],
            outlineColor: this.style.borderColor,
            cornerRadius: OUTER_RADIUS,
            thickness: OUTER_STROKE
        })

        // Mode labels on top of the chrome — abbreviated so they fit the
        // narrow per-mode buttons without crowding.
        const labelMap: { [key: string]: string } = {
            'Axial': 'Ax',
            'Sagittal': 'Sag',
            'Coronal': 'Cor',
            'MultiPlanar': 'Multi'
        }
        // Target ~40% of the bar height, floored at the crisp-MSDF device
        // pixel minimum so labels stay sharp on standard-resolution monitors.
        // The 0.45 cap matches the UIKColormapSelector label size so all panel
        // text reads at a consistent size.
        const scale = this.font.fitTextScale(height, 0.4, 0.45)
        for (let i = 0; i < this.modes.length; i++) {
            const buttonX = x + (i * buttonWidth)
            const displayText = labelMap[this.modes[i]] || this.modes[i]
            const textWidth = this.font.getTextWidth(displayText, scale)
            const textHeight = this.font.getTextHeight(displayText, scale)
            const textX = buttonX + (buttonWidth - textWidth) / 2
            const textY = y + height / 2 + textHeight * 0.25
            this.renderer.drawRotatedText({
                font: this.font,
                xy: [textX, textY],
                str: displayText,
                scale,
                color: this.style.textColor
            })
        }
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

        if (this.modes.length === 0) {
            this.hoveredIndex = -1
            return false
        }
        const buttonWidth = width / this.modes.length
        const buttonIndex = Math.floor((mouseX - x) / buttonWidth)

        if (event.type === 'mousemove') {
            // Clamp to a valid slot: at the exact right edge buttonIndex can
            // equal modes.length (out of range), which would leave a stale hover.
            this.hoveredIndex = buttonIndex >= 0 && buttonIndex < this.modes.length ? buttonIndex : -1
            return true
        }

        if (event.type === 'click' && buttonIndex >= 0 && buttonIndex < this.modes.length) {
            this.selectedIndex = buttonIndex
            this.selectedMode = this.modes[buttonIndex]
            this.onModeChange(this.selectedMode)
            return true
        }

        return false
    }

    /**
     * Merge a partial style record into the selector's user-supplied style.
     * Lets the host page theme the selector at runtime without recreating it.
     */
    public setColors(partial: Partial<{
        backgroundColor: Color
        selectedColor: Color
        hoverColor: Color
        textColor: Color
        borderColor: Color
    }>): void {
        this.style = { ...this.style, ...partial }
    }

    public setSelectedMode(mode: string): void {
        const idx = this.modes.indexOf(mode)
        // Snap the stored value to the highlighted slot when the requested mode
        // isn't in the list, so getSelectedMode() never disagrees with the UI.
        this.selectedIndex = idx === -1 ? 0 : idx
        this.selectedMode = this.modes[this.selectedIndex] ?? mode
    }

    public getSelectedMode(): string {
        return this.selectedMode
    }

    /**
     * Get the bounding rectangle for hit testing.
     */
    public getBounds(): Vec4 {
        return this.bounds
    }

    /**
     * Update the selector bounds (for responsive / DPR-change layouts). The
     * label scale is derived from these bounds on each render, so updating
     * them after a device-pixel-ratio change is enough to keep text sharp.
     */
    public setBounds(bounds: Vec4): void {
        this.bounds = bounds
    }
} 