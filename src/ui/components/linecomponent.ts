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

    // toJSON method to serialize the LineComponent instance
    toJSON(): object {
        return {
            ...super.toJSON(), // Serialize base properties from BaseUIComponent
            className: 'LineComponent', // Class name for identification
            startEnd: Array.from(this.startEnd), // Convert Vec4 to array
            thickness: this.thickness, // Serialize thickness
            lineColor: Array.from(this.lineColor), // Convert Color to array
            terminator: this.terminator // Serialize the LineTerminator
        }
    }

    public static fromJSON(data: any): LineComponent {
        const startEnd: Vec4 = data.startEnd || [0, 0, 0, 0]
        const thickness: number = data.thickness || 1
        const lineColor: Color = data.lineColor || [1, 0, 0, -1]
        const terminator: LineTerminator = data.terminator || LineTerminator.NONE

        return new LineComponent(startEnd, thickness, lineColor, terminator)
    }

}