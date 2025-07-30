import { UIKRenderer } from '../uikrenderer.js'
import { UIKFont } from '../assets/uikfont.js'
import { Vec4, Color, Vec2 } from '../types.js'

export interface UIKColormapSelectorOptions {
    bounds: Vec4
    selectedColormap: string
    colormaps: string[]
    font: UIKFont
    onColormapChange: (colormap: string) => void
    style?: {
        backgroundColor?: Color
        selectedColor?: Color
        hoverColor?: Color
        textColor?: Color
        borderColor?: Color
        /** Text scaling factor for colormap names */
        textScale?: number
        /** Width of gradient preview bars */
        gradientWidth?: number
        /** Height of gradient preview bars */
        gradientHeight?: number
        /** Padding around items */
        itemPadding?: number
        /** Spacing between gradient and text */
        textSpacing?: number
        /** Text vertical offset for alignment */
        textVerticalOffset?: number
        /** Number of gradient segments for smoothness */
        gradientSegments?: number
    }
}

export class UIKColormapSelector {
    private renderer: UIKRenderer
    private bounds: Vec4
    private selectedColormap: string
    private colormaps: string[]
    private font: UIKFont
    private onColormapChange: (colormap: string) => void
    private style: {
        backgroundColor: Color
        selectedColor: Color
        hoverColor: Color
        textColor: Color
        borderColor: Color
        textScale: number
        gradientWidth: number
        gradientHeight: number
        itemPadding: number
        textSpacing: number
        textVerticalOffset: number
        gradientSegments: number
    }
    private hoveredIndex: number = -1
    private selectedIndex: number = 0

    constructor(renderer: UIKRenderer, options: UIKColormapSelectorOptions) {
        this.renderer = renderer
        this.bounds = options.bounds
        this.selectedColormap = options.selectedColormap
        this.colormaps = options.colormaps
        this.font = options.font
        this.onColormapChange = options.onColormapChange

        // Default styling
        this.style = {
            backgroundColor: options.style?.backgroundColor || [0.15, 0.18, 0.22, 1.0],
            selectedColor: options.style?.selectedColor || [0.2, 0.7, 1.0, 1.0],
            hoverColor: options.style?.hoverColor || [0.25, 0.28, 0.32, 1.0],
            textColor: options.style?.textColor || [1.0, 1.0, 1.0, 1.0],
            borderColor: options.style?.borderColor || [0.4, 0.4, 0.4, 1.0],
            textScale: options.style?.textScale || 0.018, // Default text scale
            gradientWidth: options.style?.gradientWidth || 60, // Default gradient width
            gradientHeight: options.style?.gradientHeight || 10, // Default gradient height
            itemPadding: options.style?.itemPadding || 2, // Default item padding
            textSpacing: options.style?.textSpacing || 8, // Default text spacing
            textVerticalOffset: options.style?.textVerticalOffset || 0, // Default text vertical offset
            gradientSegments: options.style?.gradientSegments || 20 // Default gradient segments
        }

        // Find selected index
        this.selectedIndex = this.colormaps.indexOf(this.selectedColormap)
        if (this.selectedIndex === -1) this.selectedIndex = 0
    }

    public render(): void {
        const [x, y, width, height] = this.bounds
        const itemHeight = height / this.colormaps.length
        
        // Draw background using lines to create a rectangle
        this.drawRectangle(x, y, width, height, this.style.backgroundColor)

        // Draw border
        this.renderer.drawLine({
            startEnd: [x, y, x + width, y],
            thickness: 1,
            color: this.style.borderColor
        })
        this.renderer.drawLine({
            startEnd: [x, y + height, x + width, y + height],
            thickness: 1,
            color: this.style.borderColor
        })
        this.renderer.drawLine({
            startEnd: [x, y, x, y + height],
            thickness: 1,
            color: this.style.borderColor
        })
        this.renderer.drawLine({
            startEnd: [x + width, y, x + width, y + height],
            thickness: 1,
            color: this.style.borderColor
        })

        // Draw colormap items
        for (let i = 0; i < this.colormaps.length; i++) {
            const itemY = y + (i * itemHeight)
            const isSelected = i === this.selectedIndex
            const isHovered = i === this.hoveredIndex

            // Draw item background
            let itemColor = this.style.backgroundColor
            if (isSelected) {
                itemColor = this.style.selectedColor
            } else if (isHovered) {
                itemColor = this.style.hoverColor
            }

            this.drawRectangle(x + 2, itemY + 1, width - 4, itemHeight - 2, itemColor)

            // Draw colormap preview (gradient bar)
            const gradientWidth = this.style.gradientWidth
            const gradientHeight = this.style.gradientHeight
            const gradientX = x + this.style.itemPadding + 3
            const gradientY = itemY + (itemHeight - gradientHeight) / 2

            // Draw gradient preview for each colormap
            this.drawColormapPreview(gradientX, gradientY, gradientWidth, gradientHeight, this.colormaps[i])

            // Draw colormap name
            const textX = gradientX + gradientWidth + this.style.textSpacing
            const textY = itemY + (itemHeight / 2) + this.style.textVerticalOffset + 5
            
            // Capitalize first letter of colormap name
            const colormapName = this.colormaps[i]
            const capitalizedName = colormapName.charAt(0).toUpperCase() + colormapName.slice(1)
            
            // Configure font outline for enhanced medical readability
            if (this.font) {
                this.font.setOutlineConfig({
                    enabled: true,
                    width: 0.18,                    // Moderate outline width for colormap names
                    color: [0.0, 0.0, 0.0, 0.85],  // Semi-transparent black for subtlety
                    style: 'solid',                 // Clean solid outline
                    softness: 0.15,                 // Slight softness for smooth appearance
                    offset: [0, 0]                  // No offset for clean look
                })
            }
            
            this.renderer.drawRotatedText({
                font: this.font,
                xy: [textX, textY],
                str: capitalizedName, // Use capitalized name
                scale: this.style.textScale, // Use textScale from style
                color: this.style.textColor
            })
        }
    }

    private drawRectangle(x: number, y: number, width: number, height: number, color: Color): void {
        // Draw filled rectangle using multiple horizontal lines
        for (let i = 0; i < height; i++) {
            this.renderer.drawLine({
                startEnd: [x, y + i, x + width, y + i],
                thickness: 1,
                color: color
            })
        }
    }

    private drawColormapPreview(x: number, y: number, width: number, height: number, colormap: string): void {
        // Define colormap colors with more sophisticated gradients
        const colormapColors: { [key: string]: Color[] } = {
            'gray': [[0.1, 0.1, 0.1, 1], [0.9, 0.9, 0.9, 1]],
            'plasma': [[0.05, 0.03, 0.53, 1], [0.9, 0.9, 0.13, 1]],
            'viridis': [[0.27, 0.0, 0.33, 1], [0.99, 0.91, 0.14, 1]],
            'inferno': [[0.0, 0.0, 0.0, 1], [1.0, 1.0, 0.88, 1]],
            'hot': [[0.0, 0.0, 0.0, 1], [1.0, 0.2, 0.0, 1], [1.0, 1.0, 0.0, 1], [1.0, 1.0, 1.0, 1]],
            'cool': [[0.0, 1.0, 1.0, 1], [1.0, 0.0, 1.0, 1]]
        }

        const colors = colormapColors[colormap.toLowerCase()] || colormapColors['gray']
        const segments = this.style.gradientSegments // Use gradientSegments from style

        // Draw gradient with smooth transitions
        for (let i = 0; i < segments; i++) {
            const segmentWidth = Math.max(1, width / segments)
            const segmentX = x + (i * segmentWidth)
            const t = i / (segments - 1)
            
            let color: Color
            if (colors.length === 2) {
                // Simple two-color gradient
                color = [
                    colors[0][0] + t * (colors[1][0] - colors[0][0]),
                    colors[0][1] + t * (colors[1][1] - colors[0][1]),
                    colors[0][2] + t * (colors[1][2] - colors[0][2]),
                    1.0
                ]
            } else if (colors.length === 4) {
                // Multi-color gradient (for hot colormap)
                const segment = Math.floor(t * (colors.length - 1))
                const localT = (t * (colors.length - 1)) - segment
                const startColor = colors[Math.min(segment, colors.length - 1)]
                const endColor = colors[Math.min(segment + 1, colors.length - 1)]
                
                color = [
                    startColor[0] + localT * (endColor[0] - startColor[0]),
                    startColor[1] + localT * (endColor[1] - startColor[1]),
                    startColor[2] + localT * (endColor[2] - startColor[2]),
                    1.0
                ]
            } else {
                color = colors[0]
            }

            // Draw segment with slight overlap for smoother appearance
            this.drawRectangle(segmentX, y, segmentWidth + 1, height, color)
        }
        
        // Add subtle border around gradient for definition
        this.renderer.drawLine({
            startEnd: [x, y, x + width, y],
            thickness: 1,
            color: [0.6, 0.6, 0.6, 0.8]
        })
        this.renderer.drawLine({
            startEnd: [x, y + height, x + width, y + height],
            thickness: 1,
            color: [0.6, 0.6, 0.6, 0.8]
        })
        this.renderer.drawLine({
            startEnd: [x, y, x, y + height],
            thickness: 1,
            color: [0.6, 0.6, 0.6, 0.8]
        })
        this.renderer.drawLine({
            startEnd: [x + width, y, x + width, y + height],
            thickness: 1,
            color: [0.6, 0.6, 0.6, 0.8]
        })
    }

    public handleMouseEvent(event: MouseEvent): boolean {
        const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top

        const [x, y, width, height] = this.bounds
        
        // Check if mouse is within bounds
        if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) {
            this.hoveredIndex = -1
            return false
        }

        const itemHeight = height / this.colormaps.length
        const itemIndex = Math.floor((mouseY - y) / itemHeight)

        if (event.type === 'mousemove') {
            this.hoveredIndex = itemIndex
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
        this.selectedColormap = colormap
        this.selectedIndex = this.colormaps.indexOf(colormap)
        if (this.selectedIndex === -1) this.selectedIndex = 0
    }

    public getSelectedColormap(): string {
        return this.selectedColormap
    }
} 