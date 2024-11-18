import { UIKRenderer } from '../uikrenderer.js'
import { Vec4, Color } from '../types.js'
import { CircleComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class CircleComponent extends BaseUIComponent {
  private leftTopWidthHeight: Vec4
  private circleColor: Color
  private fillPercent: number

  constructor(config: CircleComponentConfig) {
    super(config)
    this.leftTopWidthHeight = config.leftTopWidthHeight
    this.circleColor = config.circleColor ?? [1, 1, 1, 1]
    this.fillPercent = config.fillPercent ?? 1.0
  }

  draw(renderer: UIKRenderer): void {
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
    const config: CircleComponentConfig = {
      className: 'CircleComponent',
      leftTopWidthHeight: data.leftTopWidthHeight || [0, 0, 0, 0],
      circleColor: data.circleColor || [1, 1, 1, 1],
      fillPercent: data.fillPercent || 1.0
    }

    return new CircleComponent(config)
  }
}
