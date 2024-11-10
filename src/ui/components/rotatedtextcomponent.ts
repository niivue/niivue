import { IColorable } from '../interfaces.js'
import { NVFont } from '../nvfont.js'
import { NVRenderer } from '../nvrenderer.js'
import { Color, Vec2 } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

// Draw Rotated Text Component
export class RotatedTextComponent extends BaseUIComponent implements IColorable {
  private font: NVFont
  private text: string
  private color: Color
  private rotation: number

  constructor(font: NVFont, position: Vec2, text: string, scale = 1.0, color: Color = [1, 0, 0, 1], rotation = 0.0) {
    super()
    this.font = font
    this.position = position
    this.text = text
    this.scale = scale
    this.color = color
    this.rotation = rotation
  }

  getTextColor(): Color {
    return this.color
  }

  setTextColor(color: Color): void {
    this.color = color
  }

  getBackgroundColor(): Color {
    throw new Error('Method not implemented.')
  }

  setBackgroundColor(_color: Color): void {
    throw new Error('Method not implemented.')
  }

  getForegroundColor(): Color {
    throw new Error('Method not implemented.')
  }

  setForegroundColor(_color: Color): void {
    throw new Error('Method not implemented.')
  }

  draw(renderer: NVRenderer): void {
    renderer.drawRotatedText(this.font, this.position, this.text, this.scale, this.color, this.rotation)
  }

  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties from BaseUIComponent
      className: 'RotatedTextComponent', // Class name for identification
      fontId: this.font.id, // Reference to the font by ID
      text: this.text, // Serialize the text string
      position: Array.from(this.position), // Convert Vec2 to array
      scale: this.scale, // Serialize scale
      color: Array.from(this.color), // Convert Color to array
      rotation: this.rotation // Serialize rotation angle
    }
  }
}
