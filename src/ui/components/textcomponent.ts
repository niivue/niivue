import { IColorable } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { Color, Vec2, Vec4 } from '../types.js'
import { NVFont } from '../nvfont.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class TextComponent extends BaseUIComponent implements IColorable {
    private textColor: Color
    private backgroundColor: Color = [0, 0, 0, 1]
    private foregroundColor: Color = [1, 1, 1, 1]
    private text: string
    private font: NVFont
    private maxWidth: number
    private width: number
    private height: number

    constructor(position: Vec2, text: string, font: NVFont, textColor: Color = [0, 0, 0, 1], scale = 1.0, maxWidth = 0) {
        super()
        this.position = position
        this.text = text
        this.font = font
        this.textColor = textColor
        this.scale = scale
        this.maxWidth = maxWidth

        this.width = this.font.getTextWidth(this.text, this.scale)
        this.height = this.font.getTextHeight(this.text, this.scale)

        this.bounds = [position[0], position[1], this.width, this.height]
    }

    draw(renderer: NVRenderer): void {
        renderer.drawText(
            this.font,
            this.position,
            this.text,
            this.scale,
            this.textColor,
            this.maxWidth
        )
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
