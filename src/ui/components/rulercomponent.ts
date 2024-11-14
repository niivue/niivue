import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Vec3, Color } from '../types.js'
import { IProjectable2D } from '../interfaces.js'
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

  constructor(
    startPoint: Vec2,
    endPoint: Vec2,
    units: string,
    font: UIKFont,
    textColor: Color = [1, 0, 0, 1],
    lineColor: Color = [0, 0, 0, 1],
    lineThickness: number = 1,
    offset: number = 40,
    scale: number = 1.0
  ) {
    super() // Initialize BaseUIComponent
    // Initialize modelPoints with adjusted start and end points
    this.modelPlanePoints = [startPoint, endPoint]
    this.units = units
    this.font = font
    this.textColor = textColor
    this.lineColor = lineColor
    this.lineThickness = lineThickness
    this.offset = offset
    this.scale = scale // Use scale from BaseUIComponent
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
    renderer.drawRuler(
      this.projectedStart,
      this.projectedEnd,
      length,
      this.units,
      this.font,
      this.textColor,
      this.lineColor,
      this.lineThickness,
      this.offset,
      this.scale // Pass scale from BaseUIComponent
    )
  }

  // Additional methods to implement IUIComponent can be added here if needed
}
