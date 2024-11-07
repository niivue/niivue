import { NVRenderer } from "../nvrenderer.js"
import { Vec2, Color, Effect } from "../types.js"
import { BaseUIComponent } from "./baseuicomponent.js"

export class ToggleComponent extends BaseUIComponent {
    private size: Vec2
    public isOn: boolean
    private onColor: Color
    private offColor: Color
    public knobPosition: number

    constructor(position: Vec2, size: Vec2, isOn: boolean, onColor: Color, offColor: Color) {
        super()
        this.position = position
        this.size = size
        this.isOn = isOn
        this.onColor = onColor
        this.offColor = offColor
        this.knobPosition = isOn ? 1.0 : 0.0 // Default knob position based on the initial state

        // Initialize bounds based on position and size
        this.setBounds([this.position[0], this.position[1], this.size[0], this.size[1]])

        // Add click animation effect for knob position
        this.addEventEffect(
            'pointerup',
            this,
            'knobPosition',
            'animateValue',
            0,
            1,
            50,
            false, // isBounce
            true   // isToggle
        )

        // Add click toggle value effect for isOn state
        this.addEventEffect(
            'pointerup',
            this,
            'isOn',
            'toggleValue',
            true, // value1 (on)
            false // value2 (off)
        )
    }

    // Method to toggle the state and animate the knob position
    toggle(): void {
        this.applyEventEffects('click')
    }

    // Handle mouse click to toggle state if clicked inside component bounds
    handleMouseClick(mousePosition: Vec2): void {
        const posX = Array.isArray(this.position) ? this.position[0] : this.position[0]
        const posY = Array.isArray(this.position) ? this.position[1] : this.position[1]
        const sizeX = Array.isArray(this.size) ? this.size[0] : this.size[0]
        const sizeY = Array.isArray(this.size) ? this.size[1] : this.size[1]

        if (
            mousePosition[0] >= posX &&
            mousePosition[0] <= posX + sizeX &&
            mousePosition[1] >= posY &&
            mousePosition[1] <= posY + sizeY
        ) {
            this.toggle()
        }
    }

    // Draw the toggle component, with an optional hover effect
    draw(renderer: NVRenderer, isHovered: boolean = false): void {
        const posX = Array.isArray(this.position) ? this.position[0] : this.position[0]
        const posY = Array.isArray(this.position) ? this.position[1] : this.position[1]
        const sizeX = Array.isArray(this.size) ? this.size[0] : this.size[0]
        const sizeY = Array.isArray(this.size) ? this.size[1] : this.size[1]

        // Handle hover effect for drawing color
        let drawColor: Color = this.isOn ? this.onColor : this.offColor
        if (isHovered) {
            // Assuming drawColor is a Float32List, we need to create a new instance for adjusted brightness
            drawColor = [...drawColor] as Color
            drawColor[0] = Math.min(drawColor[0] * 1.2, 1)
            drawColor[1] = Math.min(drawColor[1] * 1.2, 1)
            drawColor[2] = Math.min(drawColor[2] * 1.2, 1)
        }

        // Draw the toggle with animation support using knobPosition
        renderer.drawToggle([posX, posY], [sizeX, sizeY], this.isOn, this.onColor, this.offColor, this.knobPosition)
    }

    setKnobPosition(position: number) {
        this.knobPosition = position
    }

    // Update the knob position to create animation (e.g., smooth transition)
    updateKnobPosition(deltaTime: number): void {
        const targetPosition = this.isOn ? 1.0 : 0.0
        const speed = 3.0 // Control the speed of the animation
        if (this.knobPosition !== targetPosition) {
            const direction = targetPosition > this.knobPosition ? 1 : -1
            this.knobPosition += direction * speed * deltaTime
            // Clamp between 0 and 1
            this.knobPosition = Math.max(0, Math.min(1, this.knobPosition))
        }
    }

    toJSON(): object {
        return {
            ...super.toJSON(), // Serialize base properties from BaseUIComponent
            className: 'ToggleComponent', // Class name for identification
            position: Array.from(this.position), // Convert Vec2 to array
            size: Array.from(this.size), // Convert Vec2 to array
            isOn: this.isOn, // Serialize the toggle state
            onColor: Array.from(this.onColor), // Convert Color to array
            offColor: Array.from(this.offColor), // Convert Color to array
            knobPosition: this.knobPosition // Serialize knob position
        }
    }

    public static fromJSON(data: any): ToggleComponent {
        const position: Vec2 = data.position || [0, 0]
        const size: Vec2 = data.size || [50, 25] // Default size if not provided
        const isOn: boolean = data.isOn || false
        const onColor: Color = data.onColor || [0, 1, 0, 1]
        const offColor: Color = data.offColor || [1, 0, 0, 1]
        const knobPosition: number = data.knobPosition ?? (isOn ? 1.0 : 0.0)

        const component = new ToggleComponent(position, size, isOn, onColor, offColor)
        component.knobPosition = knobPosition

        return component
    }

}
