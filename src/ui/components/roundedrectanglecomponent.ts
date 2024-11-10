import { NVRenderer } from '../nvrenderer.js'
import { Vec4, Color } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

// Draw Rounded Rectangle Component
export class RoundedRectComponent extends BaseUIComponent {
  private leftTopWidthHeight: Vec4
  private fillColor: Color
  private outlineColor: Color
  private cornerRadius: number
  private thickness: number

  constructor(leftTopWidthHeight: Vec4, fillColor: Color, outlineColor: Color, cornerRadius = -1, thickness = 10) {
    super()
    this.leftTopWidthHeight = leftTopWidthHeight
    this.fillColor = fillColor
    this.outlineColor = outlineColor
    this.cornerRadius = cornerRadius
    this.thickness = thickness
  }

  draw(renderer: NVRenderer): void {
    renderer.drawRoundedRect(
      this.leftTopWidthHeight,
      this.fillColor,
      this.outlineColor,
      this.cornerRadius,
      this.thickness
    )
  }
}
