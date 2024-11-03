import { NVFont } from "../nvfont.js"
import { NVRenderer } from "../nvrenderer.js"
import { Vec2, Color, LineTerminator } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

export class CaliperComponent extends BaseUIComponent {
    private pointA: Vec2
    private pointB: Vec2
    private text: string
    private font: NVFont
    private textColor: Color
    private lineColor: Color

    constructor(pointA: Vec2, pointB: Vec2, text: string, font: NVFont, textColor: Color = [1, 0, 0, 1], lineColor: Color = [0, 0, 0, 1]) {
        super()
        this.pointA = pointA
        this.pointB = pointB
        this.text = text
        this.font = font
        this.textColor = textColor
        this.lineColor = lineColor
    }

    draw(renderer: NVRenderer): void {
        // Calculate the angle between the points
        const deltaX = this.pointB[0] - this.pointA[0]
        const deltaY = this.pointB[1] - this.pointA[1]
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const angle = Math.acos(deltaX / length)

        // Calculate the midpoint
        const midPoint: Vec2 = [(this.pointA[0] + this.pointB[0]) / 2, (this.pointA[1] + this.pointB[1]) / 2]

        // Calculate rotation to keep text upright
        let textRotation = angle
        if (deltaY > 0) {
            textRotation += Math.PI
        }

        // Draw lines with arrows at the ends

        // Draw a parallel line above the original line for text placement
        const offset = 10
        const parallelPointA: Vec2 = [this.pointA[0] + offset * deltaY / length, this.pointA[1] - offset * deltaX / length]
        const parallelPointB: Vec2 = [this.pointB[0] + offset * deltaY / length, this.pointB[1] - offset * deltaX / length]
        renderer.drawLine([parallelPointA[0], parallelPointA[1], parallelPointB[0], parallelPointB[1]], 1, this.lineColor)

        // Draw the rotated text at the midpoint, centered
        const textWidth = this.font.getTextWidth(this.text, 1.0)
        const textHeight = this.font.getTextHeight(this.text, 1.0)
        const textPosition: Vec2 = [midPoint[0] - textWidth / 2, midPoint[1] - textHeight / 2]
        renderer.drawRotatedText(this.font, textPosition, this.text, 1.0, this.textColor, textRotation)

        // Draw perpendicular lines with arrows from the line to the text
        const perpOffset = 20
        const perpDirX = -deltaY / length
        const perpDirY = deltaX / length

        const arrowPointA1: Vec2 = [this.pointA[0] + perpDirX * perpOffset, this.pointA[1] + perpDirY * perpOffset]
        const arrowPointB1: Vec2 = [this.pointB[0] + perpDirX * perpOffset, this.pointB[1] + perpDirY * perpOffset]
        renderer.drawLine([this.pointA[0], this.pointA[1], arrowPointA1[0], arrowPointA1[1]], 1, this.lineColor, LineTerminator.ARROW)
        renderer.drawLine([this.pointB[0], this.pointB[1], arrowPointB1[0], arrowPointB1[1]], 1, this.lineColor, LineTerminator.ARROW)

        // Draw lines from the ends of the text to the caliper line
        const textStart: Vec2 = [midPoint[0] - textWidth / 2, midPoint[1]]
        const textEnd: Vec2 = [midPoint[0] + textWidth / 2, midPoint[1]]
        renderer.drawLine([textStart[0], textStart[1], parallelPointA[0], parallelPointA[1]], 1, this.lineColor)
        renderer.drawLine([textEnd[0], textEnd[1], parallelPointB[0], parallelPointB[1]], 1, this.lineColor)
    }

    updatePointA(pointA: Vec2): void {
        this.pointA = pointA
    }

    updatePointB(pointB: Vec2): void {
        this.pointB = pointB
    }
}