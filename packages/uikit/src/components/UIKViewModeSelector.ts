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
        /** Text scaling factor for mode labels */
        textScale?: number
        /** Padding inside buttons */
        buttonPadding?: number
        /** Text vertical offset for alignment */
        textVerticalOffset?: number
        /** Character width multiplier for text centering */
        charWidthMultiplier?: number
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
        textScale: number
        buttonPadding: number
        textVerticalOffset: number
        charWidthMultiplier: number
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
            borderColor: options.style?.borderColor || [0.4, 0.4, 0.4, 1.0], // Lighter border for better contrast
            textScale: options.style?.textScale || 0.016, // Default text scaling
            buttonPadding: options.style?.buttonPadding || 4, // Default button padding
            textVerticalOffset: options.style?.textVerticalOffset || 0, // Default text vertical offset
            charWidthMultiplier: options.style?.charWidthMultiplier || 1.8 // Default character width multiplier
        }

        // Find selected index
        this.selectedIndex = this.modes.indexOf(this.selectedMode)
        if (this.selectedIndex === -1) this.selectedIndex = 0
    }

    public render(): void {
        const [x, y, width, height] = this.bounds
        const buttonWidth = width / this.modes.length
        
        // Draw background
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

        // Draw mode buttons
        for (let i = 0; i < this.modes.length; i++) {
            const buttonX = x + (i * buttonWidth)
            const isSelected = i === this.selectedIndex
            const isHovered = i === this.hoveredIndex

            // Draw button background
            let buttonColor = this.style.backgroundColor
            if (isSelected) {
                buttonColor = this.style.selectedColor
            } else if (isHovered) {
                buttonColor = this.style.hoverColor
            }

            this.drawRectangle(buttonX + this.style.buttonPadding / 2, y + this.style.buttonPadding / 2, 
                             buttonWidth - this.style.buttonPadding, height - this.style.buttonPadding, buttonColor)

            // Draw button border
            if (i > 0) {
                this.renderer.drawLine({
                    startEnd: [buttonX, y, buttonX, y + height],
                    thickness: 1,
                    color: this.style.borderColor
                })
            }

            // Draw mode text with visual indicators
            const modeLabels: { [key: string]: string } = {
                'Axial': 'Axial',
                'Sagittal': 'Sagittal', 
                'Coronal': 'Coronal',
                'MultiPlanar': 'Multi'
            }
            
            const displayText = modeLabels[this.modes[i]] || this.modes[i]
            
            // Much more accurate centering for small buttons
            // At scale 0.016, each character is approximately 1.8 pixels wide
            const charWidth = this.style.charWidthMultiplier
            const textWidth = displayText.length * charWidth
            
            // Ensure text stays well within button bounds
            const textX = buttonX + (buttonWidth / 2) - (textWidth / 2)
            const textY = y + (height / 2) + this.style.textVerticalOffset // Simple vertical centering
            
            this.renderer.drawRotatedText({
                font: this.font,
                xy: [textX, textY],
                str: displayText,
                scale: this.style.textScale, // Keep the small scale for fitting in small buttons
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

        const buttonWidth = width / this.modes.length
        const buttonIndex = Math.floor((mouseX - x) / buttonWidth)

        if (event.type === 'mousemove') {
            this.hoveredIndex = buttonIndex
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

    public setSelectedMode(mode: string): void {
        this.selectedMode = mode
        this.selectedIndex = this.modes.indexOf(mode)
        if (this.selectedIndex === -1) this.selectedIndex = 0
    }

    public getSelectedMode(): string {
        return this.selectedMode
    }
} 