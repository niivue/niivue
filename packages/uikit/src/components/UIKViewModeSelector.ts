import { UIKRenderer } from '../uikrenderer'
import { UIKFont, UIKFontOutlineConfig } from '../assets/uikfont'
import { Vec4, Color } from '../types'
import { vec2 } from 'gl-matrix'

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
        /** Enhanced text outline configuration for better readability */
        textOutline?: Partial<UIKFontOutlineConfig>
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
        textOutline?: Partial<UIKFontOutlineConfig>
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
            textScale: options.style?.textScale || 0.020, // FIXED: Coordinated with multiplier
            buttonPadding: options.style?.buttonPadding || 4, // Default button padding
            textVerticalOffset: options.style?.textVerticalOffset || 2, // FIXED: Slight downward adjustment for better centering
            charWidthMultiplier: options.style?.charWidthMultiplier || 0.50, // FIXED: Reduced for better horizontal centering
            textOutline: options.style?.textOutline
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

            // DEBUG: Visual debugging boundaries for text centering
            const debugMode = false // Set to true to enable visual debugging
            
            // Draw mode text with visual indicators
            const modeLabels: { [key: string]: string } = {
                'Axial': 'Axial',
                'Sagittal': 'Sagittal', 
                'Coronal': 'Coronal',
                'MultiPlanar': 'Multi'
            }
            
            const displayText = modeLabels[this.modes[i]] || this.modes[i]
            
            // FIXED: Calculate text dimensions with proper scaling for WebGL
            let textWidth: number
            let textHeight: number
            
            if (this.font && this.font.isFontLoaded) {
                // CRITICAL FIX: Font returns normalized values, need proper canvas scaling
                // The font metrics are in EM units, need to convert to canvas pixels
                const fontSize = this.style.textScale * 1000 // Convert scale to pixel size
                textWidth = this.font.getTextWidth(displayText, this.style.textScale) * fontSize
                textHeight = this.font.getTextHeight(displayText, this.style.textScale) * fontSize
            } else {
                // FIXED: Coordinated fallback calculation with proper scaling
                const charWidth = this.style.charWidthMultiplier * this.style.textScale * 800
                textWidth = displayText.length * charWidth
                textHeight = this.style.textScale * 800
            }
            
            // FIXED: Proper horizontal centering within individual button bounds
            const textX = buttonX + (buttonWidth - textWidth) / 2
            
            // FIXED: Proper vertical centering with WebGL baseline adjustment
            const textY = y + (height / 2) + this.style.textVerticalOffset + 3
            
            console.log(`Button ${i} (${displayText}): buttonX=${buttonX}, buttonWidth=${buttonWidth}, textWidth=${textWidth}, textX=${textX}`)
            
            // DEBUG: Visual debugging boundaries
            if (debugMode) {
                // Draw individual button boundary in red
                this.renderer.drawLine({
                    startEnd: [buttonX, y, buttonX + buttonWidth, y],
                    thickness: 2,
                    color: [1, 0, 0, 1] // Red - top
                })
                this.renderer.drawLine({
                    startEnd: [buttonX, y + height, buttonX + buttonWidth, y + height],
                    thickness: 2,
                    color: [1, 0, 0, 1] // Red - bottom
                })
                this.renderer.drawLine({
                    startEnd: [buttonX, y, buttonX, y + height],
                    thickness: 2,
                    color: [1, 0, 0, 1] // Red - left
                })
                this.renderer.drawLine({
                    startEnd: [buttonX + buttonWidth, y, buttonX + buttonWidth, y + height],
                    thickness: 2,
                    color: [1, 0, 0, 1] // Red - right
                })
                
                // Draw text boundary in green
                this.renderer.drawLine({
                    startEnd: [textX, textY - textHeight/2, textX + textWidth, textY - textHeight/2],
                    thickness: 1,
                    color: [0, 1, 0, 1] // Green - top
                })
                this.renderer.drawLine({
                    startEnd: [textX, textY + textHeight/2, textX + textWidth, textY + textHeight/2],
                    thickness: 1,
                    color: [0, 1, 0, 1] // Green - bottom
                })
                this.renderer.drawLine({
                    startEnd: [textX, textY - textHeight/2, textX, textY + textHeight/2],
                    thickness: 1,
                    color: [0, 1, 0, 1] // Green - left
                })
                this.renderer.drawLine({
                    startEnd: [textX + textWidth, textY - textHeight/2, textX + textWidth, textY + textHeight/2],
                    thickness: 1,
                    color: [0, 1, 0, 1] // Green - right
                })
                
                // Draw button center point in blue
                const centerX = buttonX + buttonWidth / 2
                const centerY = y + height / 2
                this.renderer.drawCircle({
                    leftTopWidthHeight: [centerX - 2, centerY - 2, 4, 4],
                    circleColor: [0, 0, 1, 1] // Blue
                })
                
                // Draw vertical center line of button in cyan
                this.renderer.drawLine({
                    startEnd: [centerX, y, centerX, y + height],
                    thickness: 1,
                    color: [0, 1, 1, 1] // Cyan - vertical center line
                })
                
                // Draw text positioning info
                this.renderer.drawRotatedText({
                    font: this.font,
                    xy: [buttonX + 5, y + height + 15],
                    str: `W:${textWidth.toFixed(1)} H:${textHeight.toFixed(1)} X:${textX.toFixed(1)}`,
                    scale: 0.015,
                    color: [1, 1, 1, 1]
                })
            }
            
            // Configure font outline for enhanced readability
            if (this.font && this.style.textOutline) {
                this.font.setOutlineConfig({
                    enabled: true,
                    width: this.style.textOutline.width ?? 0.25,
                    color: this.style.textOutline.color ?? [0.0, 0.0, 0.0, 1.0],
                    style: this.style.textOutline.style ?? 'solid',
                    softness: this.style.textOutline.softness ?? 0.15,
                    offset: this.style.textOutline.offset ?? [0, 0]
                })
            } else if (this.font) {
                // Use medical imaging optimized defaults
                this.font.setOutlineConfig({
                    enabled: true,
                    width: 0.2,
                    color: [0.0, 0.0, 0.0, 0.8],
                    style: 'solid',
                    softness: 0.15,
                    offset: [0, 0]
                })
            }
            
            this.renderer.drawRotatedText({
                font: this.font,
                xy: [textX + 2, textY],
                str: displayText,
                scale: this.style.textScale,
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