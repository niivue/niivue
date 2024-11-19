import { IColorable, RotatedTextComponentConfig } from '../interfaces.js'
import { UIKFont } from '../uikfont.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Color } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

// Draw Rotated Text Component
export class RotatedTextComponent extends BaseUIComponent implements IColorable {
  private font: UIKFont
  private text: string
  private color: Color
  private rotation: number

  constructor(config: RotatedTextComponentConfig) {
    super(config) // Pass BaseUIComponentConfig properties to the parent constructor

    this.font = config.font
    this.position = config.position ?? [0, 0] // Use BaseUIComponentConfig's optional position
    this.text = config.text
    this.scale = config.scale ?? 1.0
    this.color = config.color ?? [1, 0, 0, 1]
    this.rotation = config.rotation ?? 0.0
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

  draw(renderer: UIKRenderer): void {
    renderer.drawRotatedText({
      font: this.font,
      xy: this.position,
      str: this.text,
      scale: this.scale,
      color: this.color,
      rotation: this.rotation
    })
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

  public static fromJSON(data: any, fonts: { [key: string]: UIKFont }): RotatedTextComponent {
    const font = fonts[data.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.fontId} not found`)
    }

    const config: RotatedTextComponentConfig = {
      className: 'RotatedTextComponent',
      position: data.position,
      font,
      text: data.text,
      scale: data.scale,
      color: data.color,
      rotation: data.rotation
    }

    return new RotatedTextComponent(config)
  }
}
