import { UIKFont } from '../uikfont.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color, LineTerminator } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class CaliperComponent extends BaseUIComponent {
  private pointA: Vec2
  private pointB: Vec2
  private length: number
  private units: string
  private font: UIKFont
  private textColor: Color
  private lineColor: Color

  constructor(
    pointA: Vec2,
    pointB: Vec2,
    length: number,
    units: string,
    font: UIKFont,
    textColor: Color = [1, 0, 0, 1],
    lineColor: Color = [0, 0, 0, 1],
    scale: number = 1.0
  ) {
    super()
    this.pointA = pointA
    this.pointB = pointB
    this.length = length
    this.units = units
    this.font = font
    this.textColor = textColor
    this.lineColor = lineColor
    this.scale = scale
  }

  draw(renderer: UIKRenderer): void {
    // Calculate the angle between the points
    const deltaX = this.pointB[0] - this.pointA[0]
    const deltaY = this.pointB[1] - this.pointA[1]
    const actualLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    let angle = Math.atan2(deltaY, deltaX)

    // Calculate the midpoint
    const midPoint: Vec2 = [(this.pointA[0] + this.pointB[0]) / 2, (this.pointA[1] + this.pointB[1]) / 2]

    // Format the length text with units
    const text = `${this.length.toFixed(2)} ${this.units}`

    // Adjust the text position to ensure it's centered above the parallel line
    const textWidth = this.font.getTextWidth(text, this.scale)
    const textHeight = this.font.getTextHeight(text, this.scale)
    const halfTextWidth = textWidth / 2
    const halfTextHeight = textHeight / 2
    let textPosition: Vec2 = [
      midPoint[0] - halfTextWidth * Math.cos(angle) + (halfTextHeight + 10) * Math.sin(angle),
      midPoint[1] - halfTextWidth * Math.sin(angle) - (halfTextHeight + 10) * Math.cos(angle)
    ]

    // Ensure text is not upside down
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      angle += Math.PI
      textPosition = [
        midPoint[0] -
          (textWidth / 2) * Math.cos(angle) -
          (textHeight / 2 + 10) * Math.sin(angle) -
          10 * Math.sin(angle),
        midPoint[1] - (textWidth / 2) * Math.sin(angle) + (textHeight / 2 + 10) * Math.cos(angle) + 10 * Math.cos(angle)
      ]
    }

    // Draw the rotated text at the adjusted position
    renderer.drawRotatedText(this.font, textPosition, text, this.scale, this.textColor, angle)

    // Draw a parallel line of equal length to the original line
    const parallelPointA: Vec2 = [
      this.pointA[0] + (10 * deltaY) / actualLength,
      this.pointA[1] - (10 * deltaX) / actualLength
    ]
    const parallelPointB: Vec2 = [
      this.pointB[0] + (10 * deltaY) / actualLength,
      this.pointB[1] - (10 * deltaX) / actualLength
    ]
    renderer.drawLine([parallelPointA[0], parallelPointA[1], parallelPointB[0], parallelPointB[1]], 1, this.lineColor)

    // Draw lines terminating in arrows from the ends of the parallel line to points A and B
    renderer.drawLine(
      [parallelPointA[0], parallelPointA[1], this.pointA[0], this.pointA[1]],
      1,
      this.lineColor,
      LineTerminator.ARROW
    )
    renderer.drawLine(
      [parallelPointB[0], parallelPointB[1], this.pointB[0], this.pointB[1]],
      1,
      this.lineColor,
      LineTerminator.ARROW
    )
  }

  updatePointA(pointA: Vec2): void {
    this.pointA = pointA
  }

  updatePointB(pointB: Vec2): void {
    this.pointB = pointB
  }

  updateLength(length: number): void {
    this.length = length
  }

  updateUnits(units: string): void {
    this.units = units
  }

  updateScale(scale: number): void {
    this.scale = scale
  }

  // toJSON method to serialize the CaliperComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties
      className: 'CaliperComponent', // Class name for identification
      pointA: Array.from(this.pointA), // Convert Vec2 to array
      pointB: Array.from(this.pointB), // Convert Vec2 to array
      length: this.length,
      units: this.units,
      fontId: this.font.id, // Reference to the font by ID
      textColor: Array.from(this.textColor), // Convert Color to array
      lineColor: Array.from(this.lineColor), // Convert Color to array
      scale: this.scale
    }
  }

  public static fromJSON(data: any, gl: WebGL2RenderingContext, fonts: { [key: string]: UIKFont }): CaliperComponent {
    const font = fonts[data.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.fontId} not found`)
    }

    const pointA: Vec2 = data.pointA || [0, 0]
    const pointB: Vec2 = data.pointB || [0, 0]
    const length: number = data.length || 0
    const units: string = data.units || ''
    const textColor: Color = data.textColor || [1, 0, 0, 1]
    const lineColor: Color = data.lineColor || [0, 0, 0, 1]
    const scale: number = data.scale || 1.0

    return new CaliperComponent(pointA, pointB, length, units, font, textColor, lineColor, scale)
  }
}
