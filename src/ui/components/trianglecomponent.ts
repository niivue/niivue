import { NVRenderer } from "../nvrenderer.js"
import { Vec2, Color } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

export class TriangleComponent extends BaseUIComponent {
    private headPoint: Vec2
    private baseMidPoint: Vec2
    private baseLength: number
    private color: Color

    constructor(headPoint: Vec2, baseMidPoint: Vec2, baseLength: number, color: Color) {
        super()
        this.headPoint = headPoint
        this.baseMidPoint = baseMidPoint
        this.baseLength = baseLength
        this.color = color
    }

    draw(renderer: NVRenderer): void {
        renderer.drawTriangle(this.headPoint, this.baseMidPoint, this.baseLength, this.color)
    }
}