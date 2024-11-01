// components/textcomponent.ts

import { IColorable } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { Color, Vec2, Vec4 } from '../types.js'
import { NVFont } from '../nvfont.js'

export class TextComponent implements IColorable {
    private position: Vec2 // Screen coordinates
    private bounds: Vec4   // Screen coordinates [left, top, width, height]
    private textColor: Color
    private backgroundColor: Color
    private foregroundColor: Color
    private text: string
    private font: NVFont
    private scale: number
    private maxWidth: number // Maximum width in pixels (screen coordinates)

    constructor(position: Vec2, text: string, font: NVFont, scale = 1.0, maxWidth = 0) {
        this.position = position
        this.text = text
        this.font = font
        this.scale = scale
        this.maxWidth = maxWidth

        this.textColor = [0, 0, 0, 1] // Default color
        this.backgroundColor = [0, 0, 0, 1]
        this.foregroundColor = [1, 1, 1, 1]

        // Calculate text width and height
        const textWidth = this.font.getTextWidth(this.text, this.scale)
        const textHeight = this.font.getTextHeight(this.text, this.scale)

        this.bounds = [position[0], position[1], textWidth, textHeight]
    }

    getBounds(): Vec4 {
        return this.bounds
    }
    setBounds(bounds: Vec4): void {
        this.bounds = bounds
    }
    getPosition(): Vec2 {
        return this.position
    }
    setPosition(position: Vec2): void {
        this.position = position
    }
    getTextColor(): Color {
        return this.textColor
    }
    setTextColor(color: Color): void {
        this.textColor = color
    }
    getBackgroundColor(): Color {
        return this.backgroundColor
    }
    setBackgroundColor(color: Color): void {
        this.backgroundColor = color
    }
    getForegroundColor(): Color {
        return this.foregroundColor
    }
    setForegroundColor(color: Color): void {
        this.foregroundColor = color
    }
    draw(renderer: NVRenderer): void {
        // Draw the text using screen coordinates
        renderer.drawText(
            this.font,
            this.position,
            this.text,
            this.scale,
            this.textColor,
            this.maxWidth
        )
    }

    // Event handlers
    onClick(event: MouseEvent): void {
        // Handle click event
    }
    onFocus(): void {
        // Handle focus event
    }
    onBlur(): void {
        // Handle blur (lost focus) event
    }
    onMouseEnter(event: MouseEvent): void {
        // Handle mouse enter event
    }
    onMouseLeave(event: MouseEvent): void {
        // Handle mouse leave event
    }
}
