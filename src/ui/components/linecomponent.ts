import { UIKRenderer } from '../uikRenderer.js'
import { Vec4, Color, LineTerminator, LineStyle } from '../types.js'
import { BaseUIComponent } from './baseUiComponent.js'

export class LineComponent extends BaseUIComponent {
  protected startEnd: Vec4
  protected thickness: number
  protected lineColor: Color
  protected terminator: LineTerminator
  protected lineStyle: LineStyle // New property for line style
  protected dashDotLength: number // New property for dash/dot length

  constructor(
    startEnd: Vec4,
    thickness = 1,
    lineColor: Color = [1, 0, 0, -1],
    terminator: LineTerminator = LineTerminator.NONE,
    lineStyle: LineStyle = LineStyle.SOLID, // Default to solid line
    dashDotLength: number = 5 // Default dash/dot length
  ) {
    super()
    this.startEnd = startEnd
    this.thickness = thickness
    this.lineColor = lineColor
    this.terminator = terminator
    this.lineStyle = lineStyle
    this.dashDotLength = dashDotLength
    this.updateBounds() // Initial bounds calculation
  }

  // Calculate the bounding rectangle based on start and end points
  private updateBounds(): void {
    const [x1, y1, x2, y2] = this.startEnd
    const minX = Math.min(x1, x2)
    const minY = Math.min(y1, y2)
    const maxX = Math.max(x1, x2)
    const maxY = Math.max(y1, y2)

    // Set the bounds to encompass the line with an added buffer for thickness
    this.bounds = [
      minX - this.thickness / 2,
      minY - this.thickness / 2,
      maxX - minX + this.thickness,
      maxY - minY + this.thickness
    ]
  }

  // Override startEnd setter to recalculate bounds whenever startEnd changes
  setStartEnd(startEnd: Vec4): void {
    this.startEnd = startEnd
    this.updateBounds()
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawLine(
      this.startEnd,
      this.thickness,
      this.lineColor,
      this.terminator,
      this.lineStyle, // Pass line style to renderer
      this.dashDotLength // Pass dash/dot length to renderer
    )
  }

  // toJSON method to serialize the LineComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties from BaseUIComponent
      className: 'LineComponent', // Class name for identification
      startEnd: Array.from(this.startEnd), // Convert Vec4 to array
      thickness: this.thickness, // Serialize thickness
      lineColor: Array.from(this.lineColor), // Convert Color to array
      terminator: this.terminator, // Serialize the LineTerminator
      lineStyle: this.lineStyle, // Serialize the LineStyle
      dashDotLength: this.dashDotLength // Serialize dash/dot length
    }
  }

  public static fromJSON(data: any): LineComponent {
    const startEnd: Vec4 = data.startEnd || [0, 0, 0, 0]
    const thickness: number = data.thickness || 1
    const lineColor: Color = data.lineColor || [1, 0, 0, -1]
    const terminator: LineTerminator = data.terminator || LineTerminator.NONE
    const lineStyle: LineStyle = data.lineStyle || LineStyle.SOLID
    const dashDotLength: number = data.dashDotLength || 5

    return new LineComponent(startEnd, thickness, lineColor, terminator, lineStyle, dashDotLength)
  }
}
