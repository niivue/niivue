import { UIKRenderer } from '../uikrenderer.js'
import { Vec4, Color } from '../types.js'
import { RoundedRectComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

// Draw Rounded Rectangle Component
export class RoundedRectComponent extends BaseUIComponent {
  private leftTopWidthHeight: Vec4
  private fillColor: Color
  private outlineColor: Color
  private cornerRadius: number
  private thickness: number

  constructor(config: RoundedRectComponentConfig) {
    super(config) // Pass BaseUIComponentConfig properties to the parent constructor

    this.leftTopWidthHeight = config.leftTopWidthHeight
    this.fillColor = config.fillColor
    this.outlineColor = config.outlineColor
    this.cornerRadius = config.cornerRadius ?? -1
    this.thickness = config.thickness ?? 10
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawRoundedRect(
      this.leftTopWidthHeight,
      this.fillColor,
      this.outlineColor,
      this.cornerRadius,
      this.thickness
    )
  }

  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties
      className: 'RoundedRectComponent', // Class name for identification
      leftTopWidthHeight: Array.from(this.leftTopWidthHeight), // Convert Vec4 to array
      fillColor: Array.from(this.fillColor), // Convert Color to array
      outlineColor: Array.from(this.outlineColor), // Convert Color to array
      cornerRadius: this.cornerRadius,
      thickness: this.thickness
    }
  }

  public static fromJSON(data: any): RoundedRectComponent {
    const config: RoundedRectComponentConfig = {
      className: 'RoundedRectComponent',
      leftTopWidthHeight: data.leftTopWidthHeight,
      fillColor: data.fillColor,
      outlineColor: data.outlineColor,
      cornerRadius: data.cornerRadius,
      thickness: data.thickness,
      position: data.position, // Optional position from BaseUIComponentConfig
      isVisible: data.isVisible ?? true,
      zIndex: data.zIndex ?? 0
    }

    return new RoundedRectComponent(config)
  }
}
