import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Vec3, ComponentSide } from '../types.js'
import { IUIComponent, IProjectable3D, ProjectedLineComponentConfig } from '../interfaces.js'
import { LineComponent } from './linecomponent.js'

export class ProjectedLineComponent extends LineComponent implements IProjectable3D {
  modelPoints: Vec3[] // Array for one or two model points
  private projectedPoint: Vec3 // Projected screen point
  private targetComponent: IUIComponent // Reference to the target component
  private side: ComponentSide // Side of the target component to attach the line

  constructor(config: ProjectedLineComponentConfig) {
    super(config) // Pass LineComponentConfig properties to the parent constructor

    this.modelPoints = config.modelPoints
    this.targetComponent = config.targetComponent
    this.targetComponent.addEventListener('resize', this.handleResize.bind(this))
    this.side = config.side
    this.projectedPoint = [0, 0, 0]
  }

  handleResize(): void {
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

    renderer.drawProjectedLine({
      startXYZ: [this.startEnd[0], this.startEnd[1], -1],
      endXYZ: this.projectedPoint,
      thickness: this.thickness,
      lineColor: this.lineColor,
      terminator: this.terminator,
      lineStyle: this.lineStyle,
      dashDotLength: this.dashDotLength
    })
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      className: 'ProjectedLineComponent',
      modelPoints: this.modelPoints,
      targetComponentId: this.targetComponent.id, // Assuming `id` exists on the target component
      side: this.side
    }
  }
}
