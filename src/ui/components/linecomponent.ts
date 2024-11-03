import { NVRenderer } from "../nvrenderer.js"
import { Vec4, Color, LineTerminator } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

export class LineComponent extends BaseUIComponent {
    protected startEnd: Vec4
    protected thickness: number
    protected lineColor: Color
    protected terminator: LineTerminator

    constructor(startEnd: Vec4, thickness = 1, lineColor: Color = [1, 0, 0, -1], terminator: LineTerminator = LineTerminator.NONE) {
        super()
        this.startEnd = startEnd
        this.thickness = thickness
        this.lineColor = lineColor
        this.terminator = terminator
    }

    draw(renderer: NVRenderer): void {
        renderer.drawLine(this.startEnd, this.thickness, this.lineColor, this.terminator)
    }
}