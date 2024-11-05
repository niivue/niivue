import { NVFont } from "../nvfont.js"
import { NVRenderer } from "../nvrenderer.js"
import { Vec2, Color } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

// Draw Text Box Component
export class TextBoxComponent extends BaseUIComponent {
    private font: NVFont
    private text: string
    private textColor: Color
    private outlineColor: Color
    private fillColor: Color
    private margin: number
    private roundness: number
    private maxWidth: number
    private fontOutlineColor = [0, 0, 0, 1]
    private fontOutlineThickness = 1

    constructor(font: NVFont, position: Vec2, text: string, textColor: Color = [0, 0, 0, 1], outlineColor: Color = [1, 1, 1, 1], fillColor: Color = [0, 0, 0, 0.3], margin = 15, roundness = 0.0, scale = 1.0, maxWidth = 0, fontOutlineColor = [0, 0, 0, 1], fontOutlineThickness = 1) {
        super()
        this.font = font
        this.position = position
        this.text = text
        this.textColor = textColor
        this.outlineColor = outlineColor
        this.fillColor = fillColor
        this.margin = margin
        this.roundness = roundness
        this.scale = scale
        this.maxWidth = maxWidth
        this.fontOutlineColor = fontOutlineColor
        this.fontOutlineThickness = fontOutlineThickness
    }

    draw(renderer: NVRenderer): void {
        renderer.drawTextBox(this.font, this.position, this.text, this.textColor, this.outlineColor, this.fillColor, this.margin, this.roundness, this.scale, this.maxWidth, this.fontOutlineColor, this.fontOutlineThickness)
    }
}