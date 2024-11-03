import { NVRenderer } from "../nvrenderer.js";
import { Vec4, Color } from "../types.js";
import { BaseUIComponent } from "./baseuicomponent.js";

// Draw Circle Component
export class CircleComponent extends BaseUIComponent {
    private leftTopWidthHeight: Vec4;
    private circleColor: Color;
    private fillPercent: number;

    constructor(leftTopWidthHeight: Vec4, circleColor: Color = [1, 1, 1, 1], fillPercent = 1.0) {
        super();
        this.leftTopWidthHeight = leftTopWidthHeight;
        this.circleColor = circleColor;
        this.fillPercent = fillPercent;
    }

    draw(renderer: NVRenderer): void {
        renderer.drawCircle(this.leftTopWidthHeight, this.circleColor, this.fillPercent);
    }
}