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

    toJSON(): object {
        return {
            ...super.toJSON(), // Serialize base properties from BaseUIComponent
            className: 'TextComponent', // Class name for identification
            position: Array.from(this.position), // Convert Vec2 to array
            text: this.text, // Serialize the text string
            fontId: this.font.id, // Reference to the font by ID
            textColor: Array.from(this.textColor), // Convert Color to array
            backgroundColor: Array.from(this.backgroundColor), // Convert Color to array
            foregroundColor: Array.from(this.foregroundColor), // Convert Color to array
            scale: this.scale, // Serialize scale
            maxWidth: this.maxWidth, // Serialize maxWidth
            width: this.width, // Serialize width
            height: this.height // Serialize height
        }
    }

    public static fromJSON(data: any, fonts: { [key: string]: NVFont }): TextComponent {
        const font = fonts[data.fontId]
        if (!font) {
            throw new Error(`Font with ID ${data.fontId} not found`)
        }

        const position: Vec2 = data.position || [0, 0]
        const text: string = data.text || ''
        const textColor: Color = data.textColor || [0, 0, 0, 1]
        const backgroundColor: Color = data.backgroundColor || [0, 0, 0, 1]
        const foregroundColor: Color = data.foregroundColor || [1, 1, 1, 1]
        const scale: number = data.scale || 1.0
        const maxWidth: number = data.maxWidth || 0

        const component = new TextComponent(position, text, font, textColor, scale, maxWidth)
        component.backgroundColor = backgroundColor
        component.foregroundColor = foregroundColor
        component.width = data.width ?? component.font.getTextWidth(text, scale)
        component.height = data.height ?? component.font.getTextHeight(text, scale)
        component.bounds = [position[0], position[1], component.width, component.height]

        return component
    }


}
