import { NVFont } from "../nvfont.js"
import { NVRenderer } from "../nvrenderer.js"
import { Vec2, Color, Vec4 } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

// Draw Text Box Component
export class TextBoxComponent extends BaseUIComponent {
    protected font: NVFont
    protected text: string
    protected textColor: Color
    protected outlineColor: Color
    protected fillColor: Color
    protected margin: number
    protected roundness: number
    protected maxWidth: number
    protected fontOutlineColor = [0, 0, 0, 1]
    protected fontOutlineThickness = 1

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

        // Setting bounds for the button component to be found in the quad tree
        this.bounds = [position[0], position[1], this.font.getTextWidth(this.text, this.scale), this.font.getTextHeight(this.text, this.scale) + this.margin * 2]

    }

    // Override the setScale method to update bounds when scale changes
    setScale(newScale: number): void {
        this.scale = newScale;
        this.updateBounds();
    }

    getBounds(): Vec4 {
        this.updateBounds();
        return this.bounds;
    }

    // Update bounds based on current position, scale, and text dimensions
    updateBounds(): void {
        this.bounds = [
            this.position[0],
            this.position[1],
            this.font.getTextWidth(this.text, this.scale),
            this.font.getTextHeight(this.text, this.scale) + this.margin * 2
        ];
    }

    draw(renderer: NVRenderer): void {
        renderer.drawTextBox(this.font, this.position, this.text, this.textColor, this.outlineColor, this.fillColor, this.margin, this.roundness, this.scale, this.maxWidth, this.fontOutlineColor, this.fontOutlineThickness)
    }
}