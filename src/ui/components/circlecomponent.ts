import { NVRenderer } from '../nvrenderer.js'
import { Vec4, Color } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class CircleComponent extends BaseUIComponent {
  private leftTopWidthHeight: Vec4
  private circleColor: Color
  private fillPercent: number

  constructor(leftTopWidthHeight: Vec4, circleColor: Color = [1, 1, 1, 1], fillPercent = 1.0) {
    super()
    this.leftTopWidthHeight = leftTopWidthHeight
    this.circleColor = circleColor
    this.fillPercent = fillPercent
  }

  draw(renderer: NVRenderer): void {
    renderer.drawCircle(this.leftTopWidthHeight, this.circleColor, this.fillPercent)
  }

  // toJSON method to serialize the CircleComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties
      className: 'CircleComponent', // Class name for identification
      leftTopWidthHeight: Array.from(this.leftTopWidthHeight), // Convert Vec4 to array
      circleColor: Array.from(this.circleColor), // Convert Color to array
      fillPercent: this.fillPercent // Serialize the fill percentage
    }
  }

  public static fromJSON(data: any): CircleComponent {
    const leftTopWidthHeight: Vec4 = data.leftTopWidthHeight || [0, 0, 0, 0]
    const circleColor: Color = data.circleColor || [1, 1, 1, 1]
    const fillPercent: number = data.fillPercent || 1.0

    return new CircleComponent(leftTopWidthHeight, circleColor, fillPercent)
  }
}
