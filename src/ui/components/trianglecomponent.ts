import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color } from '../types.js'
import { TriangleComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class TriangleComponent extends BaseUIComponent {
  private headPoint: Vec2
  private baseMidPoint: Vec2
  private baseLength: number
  private color: Color

  constructor(config: TriangleComponentConfig) {
    super(config) // Pass BaseUIComponentConfig properties to the parent constructor

    this.headPoint = config.headPoint
    this.baseMidPoint = config.baseMidPoint
    this.baseLength = config.baseLength
    this.color = config.color
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawTriangle({
      headPoint: this.headPoint,
      baseMidPoint: this.baseMidPoint,
      baseLength: this.baseLength,
      color: this.color
    })
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      className: 'TriangleComponent',
      headPoint: Array.from(this.headPoint), // Convert Vec2 to array
      baseMidPoint: Array.from(this.baseMidPoint), // Convert Vec2 to array
      baseLength: this.baseLength,
      color: Array.from(this.color) // Convert Color to array
    }
  }

  public static fromJSON(data: any): TriangleComponent {
    const config: TriangleComponentConfig = {
      className: 'TriangleComponent',
      headPoint: data.headPoint || [0, 0],
      baseMidPoint: data.baseMidPoint || [0, 0],
      baseLength: data.baseLength || 0,
      color: data.color || [1, 1, 1, 1],
      position: data.position, // Optional position from BaseUIComponentConfig
      isVisible: data.isVisible ?? true,
      zIndex: data.zIndex ?? 0
    }

    return new TriangleComponent(config)
  }
}
