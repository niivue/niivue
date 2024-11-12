import { NVRenderer } from '../nvrenderer.js'
import { Vec2, Vec3, Color, LineTerminator, LineStyle } from '../types.js'
import { IUIComponent, IProjectable } from '../interfaces.js'
import { LineComponent } from './linecomponent.js'

export class ProjectedLineComponent extends LineComponent implements IProjectable {
  modelPoints: Vec3[] // Array for one or two model points
  private projectedPoint: Vec3 // Projected screen point
  private targetComponent: IUIComponent // Reference to the target component

  constructor(
    modelPoints: Vec3[],
    targetComponent: IUIComponent,
    thickness = 1,
    lineColor: Color = [1, 0, 0, 1],
    terminator: LineTerminator = LineTerminator.NONE,
    lineStyle: LineStyle = LineStyle.SOLID,
    dashDotLength = 5
  ) {
    super([0, 0, 0, 0], thickness, lineColor, terminator, lineStyle, dashDotLength)
    this.modelPoints = modelPoints
    this.targetComponent = targetComponent
    this.projectedPoint = [0, 0, 0]
  }

  // Set the projected screen points
  setScreenPoints(screenPoints: Vec3[]): void {
    if (screenPoints.length > 0) {
      this.projectedPoint = screenPoints[0]
      this.updateLinePosition()
    }
  }

  private updateLinePosition(): void {
    const midpoint = this.calculateMidpoint()
    this.startEnd = [midpoint[0], midpoint[1], this.projectedPoint[0], this.projectedPoint[1]]
  }

  private calculateMidpoint(): Vec2 {
    const [x, y, width, height] = this.targetComponent.getBounds()
    const [px, py] = [this.projectedPoint[0], this.projectedPoint[1]]

    // Determine the closest side (left, right, top, bottom) to the projected point
    const distances = [
      Math.abs(px - x), // Left
      Math.abs(px - (x + width)), // Right
      Math.abs(py - y), // Top
      Math.abs(py - (y + height)) // Bottom
    ]
    const closestSide = distances.indexOf(Math.min(...distances))

    // Calculate midpoint based on the closest side
    switch (closestSide) {
      case 0:
        return [x, y + height / 2] // Left side midpoint
      case 1:
        return [x + width, y + height / 2] // Right side midpoint
      case 2:
        return [x + width / 2, y] // Top side midpoint
      case 3:
        return [x + width / 2, y + height] // Bottom side midpoint
      default:
        return [x + width / 2, y + height / 2] // Center (fallback)
    }
  }

  draw(renderer: NVRenderer): void {
    // Ensure line position is up-to-date before drawing
    this.updateLinePosition()

    renderer.drawProjectedLine(
      [this.startEnd[0], this.startEnd[1], -1],
      this.projectedPoint,
      this.thickness,
      this.lineColor,
      this.terminator,
      this.lineStyle,
      this.dashDotLength
    )
  }
}
