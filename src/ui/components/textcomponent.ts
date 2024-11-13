import { IColorable } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { Color, Vec2, Vec4 } from '../types.js'
import { NVFont } from '../nvfont.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class TextComponent extends BaseUIComponent implements IColorable {
  protected textColor: Color
  protected backgroundColor: Color = [0, 0, 0, 1]
  protected foregroundColor: Color = [1, 1, 1, 1]
  protected text: string
  protected font: NVFont
  protected maxWidth: number
  protected width: number
  protected height: number

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

  fitBounds(targetBounds: Vec4): void {
    // Check if maxWidth is set, and if so, adjust scale to fit within maxWidth first
    if (this.maxWidth > 0) {
      const textWidth = this.font.getTextWidth(this.text, 1) // Width at scale 1
      const maxWidthScale = this.maxWidth / textWidth

      // Adjust scale based on maxWidth
      this.setScale(Math.min(this.scale, maxWidthScale))
    }

    // Calculate the actual scaled width and height after applying maxWidth
    this.width = this.font.getTextWidth(this.text, this.scale)
    this.height = this.font.getTextHeight(this.text, this.scale)

    // Calculate scaling factors for the bounds
    const scaleX = targetBounds[2] / this.width
    const scaleY = targetBounds[3] / this.height

    // Use the smaller of the two scales to fit within the target bounds
    const newScale = Math.min(scaleX, scaleY, this.scale)

    // Update the component's scale
    this.setScale(newScale)

    // Recalculate width and height after scaling to fit target bounds
    this.width = this.font.getTextWidth(this.text, this.scale)
    this.height = this.font.getTextHeight(this.text, this.scale)

    // Calculate centered position within target bounds
    const offsetX = targetBounds[0] + (targetBounds[2] - this.width) / 2
    const offsetY = targetBounds[1] + (targetBounds[3] - this.height) / 2

    // Set new position and bounds
    this.setPosition([offsetX, offsetY])
    this.setBounds([offsetX, offsetY, this.width, this.height])
  }

  draw(renderer: NVRenderer): void {
    renderer.drawText(this.font, this.position, this.text, this.scale, this.textColor, this.maxWidth)
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
