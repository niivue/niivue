import { NVRenderer } from "../nvrenderer.js";
import { Vec4, Color, LineTerminator } from "../types.js";
import { LineComponent } from "./linecomponent.js";

export class ElbowLineComponent extends LineComponent {
    private horizontalFirst: boolean;

    constructor(startEnd: Vec4, thickness = 1, lineColor: Color = [1, 0, 0, -1], terminator: LineTerminator = LineTerminator.NONE, horizontalFirst = true) {
        super(startEnd, thickness, lineColor, terminator);
        this.horizontalFirst = horizontalFirst;
    }

    draw(renderer: NVRenderer): void {
        renderer.drawElbowLine(this.startEnd, this.thickness, this.lineColor, this.horizontalFirst, this.terminator);
    }
}
