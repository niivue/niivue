import { UIKFont } from '../uikfont.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color, Vec4 } from '../types.js'
import { TextComponent } from './textcomponent.js'

// Draw Text Box Component
export class TextBoxComponent extends TextComponent {
  protected outlineColor: Color
  protected fillColor: Color
  protected margin: number
  protected roundness: number
  protected fontOutlineColor: Color = [0, 0, 0, 1]
  protected fontOutlineThickness = 1

  constructor(
    font: UIKFont,
    position: Vec2,
    text: string,
    textColor: Color = [0, 0, 0, 1],
    outlineColor: Color = [1, 1, 1, 1],
    fillColor: Color = [0, 0, 0, 0.3],
    margin = 15,
    roundness = 0.0,
    scale = 1.0,
    maxWidth = 0,
    fontOutlineColor: Color = [0, 0, 0, 1],
    fontOutlineThickness = 1
  ) {
    super(position, text, font, textColor, scale, maxWidth)
    this.outlineColor = outlineColor
    this.fillColor = fillColor
    this.margin = margin
    this.roundness = roundness
    this.fontOutlineColor = fontOutlineColor
    this.fontOutlineThickness = fontOutlineThickness
    console.log('setting bounds ', this.bounds)
    // Setting bounds for the button component to be found in the quad tree
    this.bounds = [
      position[0],
      position[1],
      this.font.getTextWidth(this.text, this.scale),
      this.font.getTextHeight(this.text, this.scale) + this.margin * 2
    ]
    console.log('width', this.font.getTextWidth(this.text, this.scale))
    console.log('size for text', this.text)
    console.log('set bounds ', this.bounds)
  }

  // Override the setScale method to update bounds when scale changes
  setScale(newScale: number): void {
    this.scale = newScale
    this.updateBounds()
  }

  getBounds(): Vec4 {
    this.updateBounds()
    return this.bounds
  }

  // Update bounds based on current position, scale, and text dimensions
  updateBounds(): void {
    this.bounds = [
      this.position[0],
      this.position[1],
      this.font.getTextWidth(this.text, this.scale),
      this.font.getTextHeight(this.text, this.scale) + this.margin * 2
    ]
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawTextBox(
      this.font,
      this.position,
      this.text,
      this.textColor,
      this.outlineColor,
      this.fillColor,
      this.margin,
      this.roundness,
      this.scale,
      this.maxWidth,
      this.fontOutlineColor,
      this.fontOutlineThickness
    )
  }

  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties from BaseUIComponent
      className: 'TextBoxComponent', // Class name for identification
      fontId: this.font.id, // Reference to the font by ID
      text: this.text, // Serialize the text string
      position: Array.from(this.position), // Convert Vec2 to array
      textColor: Array.from(this.textColor), // Convert Color to array
      outlineColor: Array.from(this.outlineColor), // Convert Color to array
      fillColor: Array.from(this.fillColor), // Convert Color to array
      margin: this.margin, // Serialize margin
      roundness: this.roundness, // Serialize roundness
      scale: this.scale, // Serialize scale
      maxWidth: this.maxWidth, // Serialize maxWidth
      fontOutlineColor: Array.from(this.fontOutlineColor), // Convert Color to array
      fontOutlineThickness: this.fontOutlineThickness // Serialize font outline thickness
    }
  }

  public static fromJSON(data: any, fonts: { [key: string]: UIKFont }): TextBoxComponent {
    const font = fonts[data.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.fontId} not found`)
    }

    const position: Vec2 = data.position || [0, 0]
    const text: string = data.text || ''
    const textColor: Color = data.textColor || [0, 0, 0, 1]
    const outlineColor: Color = data.outlineColor || [1, 1, 1, 1]
    const fillColor: Color = data.fillColor || [0, 0, 0, 0.3]
    const margin: number = data.margin || 15
    const roundness: number = data.roundness || 0.0
    const scale: number = data.scale || 1.0
    const maxWidth: number = data.maxWidth || 0
    const fontOutlineColor: Color = data.fontOutlineColor || [0, 0, 0, 1]
    const fontOutlineThickness: number = data.fontOutlineThickness || 1

    const component = new TextBoxComponent(
      font,
      position,
      text,
      textColor,
      outlineColor,
      fillColor,
      margin,
      roundness,
      scale,
      maxWidth,
      fontOutlineColor,
      fontOutlineThickness
    )

    return component
  }
}
