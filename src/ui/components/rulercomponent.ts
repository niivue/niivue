import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Vec3, Color } from '../types.js'
import { IProjectable2D, RulerComponentConfig } from '../interfaces.js'
import { UIKFont } from '../uikfont.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class RulerComponent extends BaseUIComponent implements IProjectable2D {
  modelPlanePoints: Vec2[] // Array to hold start and end points in model space
  private projectedStart: Vec2 // Projected screen start point
  private projectedEnd: Vec2 // Projected screen end point
  private units: string
  private font: UIKFont
  private textColor: Color
  private lineColor: Color
  private lineThickness: number
  private offset: number

  constructor(config: RulerComponentConfig) {
    super(config) // Pass BaseUIComponentConfig properties to the parent constructor

    this.modelPlanePoints = [config.startPoint, config.endPoint]
    this.units = config.units
    this.font = config.font
    this.textColor = config.textColor ?? [1, 0, 0, 1]
    this.lineColor = config.lineColor ?? [0, 0, 0, 1]
    this.lineThickness = config.lineThickness ?? 1
    this.offset = config.offset ?? 40
    this.scale = config.scale ?? 1.0
    this.projectedStart = [0, 0]
    this.projectedEnd = [0, 0]
  }

  // Set the projected screen points for the start and end of the ruler
  setScreenPoints(screenPoints: Vec3[]): void {
    if (screenPoints.length > 1) {
      this.projectedStart = [screenPoints[0][0], screenPoints[0][1]]
      this.projectedEnd = [screenPoints[1][0], screenPoints[1][1]]
    }
  }

  // Calculate the length based on the distance between projectedStart and projectedEnd
  private calculateLength(): number {
    const deltaX = this.modelPlanePoints[1][0] - this.modelPlanePoints[0][0]
    const deltaY = this.modelPlanePoints[1][1] - this.modelPlanePoints[0][1]
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }

  draw(renderer: UIKRenderer): void {
    // Calculate the dynamic length based on projected screen points
    const length = this.calculateLength()

    // Draw the ruler component on the screen using projected points
    renderer.drawRuler({
      pointA: this.projectedStart,
      pointB: this.projectedEnd,
      length,
      units: this.units,
      font: this.font,
      textColor: this.textColor,
      lineColor: this.lineColor,
      lineThickness: this.lineThickness,
      offset: this.offset,
      scale: this.scale // Pass scale from BaseUIComponent
    })
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      className: 'RulerComponent',
      modelPlanePoints: this.modelPlanePoints,
      units: this.units,
      fontId: this.font.id, // Reference the font by ID
      textColor: Array.from(this.textColor),
      lineColor: Array.from(this.lineColor),
      lineThickness: this.lineThickness,
      offset: this.offset
    }
  }

  public static fromJSON(data: any, fonts: { [key: string]: UIKFont }): RulerComponent {
    const font = fonts[data.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.fontId} not found`)
    }

    const config: RulerComponentConfig = {
      className: 'RulerComponent',
      startPoint: data.modelPlanePoints[0],
      endPoint: data.modelPlanePoints[1],
      units: data.units,
      font,
      textColor: data.textColor,
      lineColor: data.lineColor,
      lineThickness: data.lineThickness,
      offset: data.offset,
      scale: data.scale ?? 1.0,
      position: data.position, // Optional position from BaseUIComponentConfig
      isVisible: data.isVisible ?? true,
      zIndex: data.zIndex ?? 0
    }

    return new RulerComponent(config)
  }
}
