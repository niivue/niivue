import { UIKRenderer } from '../uikrenderer.js'
import { Vec4, Color, LineTerminator, LineStyle } from '../types.js'
import { LineComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class LineComponent extends BaseUIComponent {
  protected startEnd: Vec4
  protected thickness: number
  protected lineColor: Color
  protected terminator: LineTerminator
  protected lineStyle: LineStyle // New property for line style
  protected dashDotLength: number // New property for dash/dot length

  constructor(config: LineComponentConfig) {
    super(config)
    this.startEnd = config.startEnd
    this.thickness = config.thickness ?? 1
    this.lineColor = config.lineColor ?? [1, 0, 0, -1]
    this.terminator = config.terminator ?? LineTerminator.NONE
    this.lineStyle = config.lineStyle ?? LineStyle.SOLID
    this.dashDotLength = config.dashDotLength ?? 5
    this.updateBounds() // Initial bounds calculation
  }

  // Calculate the bounding rectangle based on start and end points
  private updateBounds(): void {
    // handle our child classes
    if (!this.startEnd) {
      return
    }

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
    renderer.drawLine({
      startEnd: this.startEnd,
      thickness: this.thickness,
      color: this.lineColor,
      terminator: this.terminator,
      style: this.lineStyle, // Use the updated field name for line style
      dashDotLength: this.dashDotLength // Pass dash/dot length for dashed/dotted styles
    })
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
    const config: LineComponentConfig = {
      className: 'LineComponent',
      position: data.position || [0, 0],
      startEnd: data.startEnd || [0, 0, 0, 0],
      thickness: data.thickness || 1,
      lineColor: data.lineColor || [1, 0, 0, -1],
      terminator: data.terminator || LineTerminator.NONE,
      lineStyle: data.lineStyle || LineStyle.SOLID,
      dashDotLength: data.dashDotLength || 5,
      isVisible: data.isVisible ?? true,
      zIndex: data.zIndex ?? 0
    }

    return new LineComponent(config)
  }
}
