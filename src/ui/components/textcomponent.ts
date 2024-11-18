import { IColorable, TextComponentConfig } from '../interfaces.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Color, Vec4 } from '../types.js'
import { UIKFont } from '../uikfont.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class TextComponent extends BaseUIComponent implements IColorable {
  protected textColor: Color
  protected backgroundColor: Color = [0, 0, 0, 1]
  protected foregroundColor: Color = [1, 1, 1, 1]
  protected text: string
  protected font: UIKFont
  protected maxWidth: number
  protected width: number
  protected height: number

  constructor(config: TextComponentConfig) {
    super(config)
    this.text = config.text
    this.font = config.font
    this.textColor = config.textColor ?? [0, 0, 0, 1]
    this.scale = config.scale ?? 1.0
    this.maxWidth = config.maxWidth ?? 0

    const size = this.font.getWordWrappedSize(this.text, this.scale, this.maxWidth)
    this.width = size[0]
    this.height = size[1]
    this.bounds = [this.position[0], this.position[1], this.width, this.height]
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

  updateBounds(): void {
    const size = this.font.getWordWrappedSize(this.text, this.scale, this.maxWidth)
    this.width = size[0]
    this.height = size[1]
    this.setBounds([this.position[0], this.position[1], size[0], size[1]])
  }

  getBounds(): Vec4 {
    this.updateBounds()
    return this.bounds
  }

  draw(renderer: UIKRenderer): void {
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

  public static fromJSON(data: any, fonts: { [key: string]: UIKFont }): TextComponent {
    const font = fonts[data.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.fontId} not found`)
    }

    const config: TextComponentConfig = {
      className: 'TextComponent',
      position: data.position || [0, 0],
      text: data.text || '',
      font,
      textColor: data.textColor || [0, 0, 0, 1],
      scale: data.scale || 1.0,
      maxWidth: data.maxWidth || 0
    }

    const component = new TextComponent(config)
    component.backgroundColor = data.backgroundColor || [0, 0, 0, 1]
    component.foregroundColor = data.foregroundColor || [1, 1, 1, 1]
    component.width = data.width ?? component.font.getTextWidth(config.text, config.scale)
    component.height = data.height ?? component.font.getTextHeight(config.text, config.scale)
    component.bounds = [config.position[0], config.position[1], component.width, component.height]

    return component
  }
}
