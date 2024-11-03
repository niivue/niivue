import { NVRenderer } from "../nvrenderer.js";
import { Vec2, Color } from "../types.js";
import { BaseUIComponent } from "./baseuicomponent.js";

export class ToggleComponent extends BaseUIComponent {
    private size: Vec2
    private isOn: boolean
    private onColor: Color
    private offColor: Color

    constructor(position: Vec2, size: Vec2, isOn: boolean, onColor: Color, offColor: Color) {
        super()
        this.position = position
        this.size = size
        this.isOn = isOn
        this.onColor = onColor
        this.offColor = offColor
    }

    draw(renderer: NVRenderer): void {
        renderer.drawToggle(this.position, this.size, this.isOn, this.onColor, this.offColor)
    }
}