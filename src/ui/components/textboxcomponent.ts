import { UIKFont } from '../uikfont.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Color, Vec4 } from '../types.js'
import { TextBoxComponentConfig } from '../interfaces.js'
import { TextComponent } from './textcomponent.js'

// Draw Text Box Component
export class TextBoxComponent extends TextComponent {
  protected outlineColor: Color
  protected fillColor: Color
  protected innerMargin: number
  protected roundness: number
  protected fontOutlineColor: Color = [0, 0, 0, 1]
  protected fontOutlineThickness = 1

  constructor(config: TextBoxComponentConfig) {
    super(config)
    this.outlineColor = config.outlineColor ?? [1, 1, 1, 1]
    this.fillColor = config.fillColor ?? [0, 0, 0, 0.3]
    this.innerMargin = config.innerMargin ?? 15
    this.roundness = config.roundness ?? 0.0
    this.fontOutlineColor = config.fontOutlineColor ?? [0, 0, 0, 1]
    this.fontOutlineThickness = config.fontOutlineThickness ?? 1

    this.updateBounds()
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
    const textHeight = this.font.getTextHeight(this.text, this.scale)
    const size = this.font.getWordWrappedSize(this.text, this.scale, this.maxWidth)
    const wordWrappedTextWidth = size[0]
    const wordWrappedTextHeight = size[1]

    this.bounds = [
      this.position[0],
      this.position[1],
      wordWrappedTextWidth + this.innerMargin * this.scale * 2 + textHeight, // DrawTextBox draws the text at x + margin * scale + textHeight / 2
      wordWrappedTextHeight + this.innerMargin * this.scale * 4
    ]
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawTextBox({
      font: this.font,
      xy: this.position,
      text: this.text,
      textColor: this.textColor,
      outlineColor: this.outlineColor,
      fillColor: this.fillColor,
      margin: this.innerMargin,
      roundness: this.roundness,
      scale: this.scale,
      maxWidth: this.maxWidth,
      fontOutlineColor: this.fontOutlineColor,
      fontOutlineThickness: this.fontOutlineThickness
    })
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
      innerMargin: this.innerMargin, // Serialize margin
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

    const config: TextBoxComponentConfig = {
      className: 'TextBoxComponent',
      position: data.position || [0, 0],
      text: data.text || '',
      font,
      textColor: data.textColor || [0, 0, 0, 1],
      outlineColor: data.outlineColor || [1, 1, 1, 1],
      fillColor: data.fillColor || [0, 0, 0, 0.3],
      innerMargin: data.innerMargin || 15,
      roundness: data.roundness || 0.0,
      scale: data.scale || 1.0,
      maxWidth: data.maxWidth || 0,
      fontOutlineColor: data.fontOutlineColor || [0, 0, 0, 1],
      fontOutlineThickness: data.fontOutlineThickness || 1
    }

    const component = new TextBoxComponent(config)
    component.updateBounds()
    return component
  }
}
