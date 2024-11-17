import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class TriangleComponent extends BaseUIComponent {
  private headPoint: Vec2
  private baseMidPoint: Vec2
  private baseLength: number
  private color: Color

  constructor(headPoint: Vec2, baseMidPoint: Vec2, baseLength: number, color: Color) {
    super()
    this.headPoint = headPoint
    this.baseMidPoint = baseMidPoint
    this.baseLength = baseLength
    this.color = color
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawTriangle(this.headPoint, this.baseMidPoint, this.baseLength, this.color)
  }

  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties from BaseUIComponent
      className: 'TriangleComponent', // Class name for identification
      headPoint: Array.from(this.headPoint), // Convert Vec2 to array
      baseMidPoint: Array.from(this.baseMidPoint), // Convert Vec2 to array
      baseLength: this.baseLength, // Serialize base length
      color: Array.from(this.color) // Convert Color to array
    }
  }

  public static fromJSON(data: any): TriangleComponent {
    const headPoint: Vec2 = data.headPoint || [0, 0]
    const baseMidPoint: Vec2 = data.baseMidPoint || [0, 0]
    const baseLength: number = data.baseLength || 0
    const color: Color = data.color || [1, 1, 1, 1]

    return new TriangleComponent(headPoint, baseMidPoint, baseLength, color)
  }
}
