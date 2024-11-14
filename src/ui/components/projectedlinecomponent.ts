import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Vec3, Color, LineTerminator, LineStyle, ComponentSide } from '../types.js'
import { IUIComponent, IProjectable } from '../interfaces.js'
import { LineComponent } from './linecomponent.js'

export class ProjectedLineComponent extends LineComponent implements IProjectable {
  modelPoints: Vec3[] // Array for one or two model points
  private projectedPoint: Vec3 // Projected screen point
  private targetComponent: IUIComponent // Reference to the target component
  private side: ComponentSide // Side of the target component to attach the line

  constructor(
    modelPoints: Vec3[],
    targetComponent: IUIComponent,
    side: ComponentSide,
    thickness = 1,
    lineColor: Color = [1, 0, 0, 1],
    terminator: LineTerminator = LineTerminator.NONE,
    lineStyle: LineStyle = LineStyle.SOLID,
    dashDotLength = 5
  ) {
    super([0, 0, 0, 0], thickness, lineColor, terminator, lineStyle, dashDotLength)
    this.modelPoints = modelPoints
    this.targetComponent = targetComponent
    this.targetComponent.addEventListener('resize', this.handleResize.bind(this))
    this.side = side
    this.projectedPoint = [0, 0, 0]
  }

  handleResize(): void {
    console.log('reize event fired')
    this.updateLinePosition()
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

    // Determine the midpoint based on the specified side
    switch (this.side) {
      case ComponentSide.LEFT:
        return [x, y + height / 2] // Left side midpoint
      case ComponentSide.RIGHT:
        return [x + width, y + height / 2] // Right side midpoint
      case ComponentSide.TOP:
        return [x + width / 2, y] // Top side midpoint
      case ComponentSide.BOTTOM:
        return [x + width / 2, y + height] // Bottom side midpoint
      default:
        return [x + width / 2, y + height / 2] // Center (fallback)
    }
  }

  draw(renderer: UIKRenderer): void {
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
