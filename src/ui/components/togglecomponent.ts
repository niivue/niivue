import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color } from '../types.js'
import { ToggleComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class ToggleComponent extends BaseUIComponent {
  private size: Vec2
  public isOn: boolean
  private onColor: Color
  private offColor: Color
  public knobPosition: number

  constructor(config: ToggleComponentConfig) {
    super(config) // Pass BaseUIComponentConfig properties to the parent constructor

    this.position = config.position
    this.size = config.size
    this.isOn = config.isOn
    this.onColor = config.onColor
    this.offColor = config.offColor
    this.knobPosition = config.knobPosition ?? (this.isOn ? 1.0 : 0.0)

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
      true // isToggle
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
    this.applyEventEffects('pointerup')
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
  draw(renderer: UIKRenderer, isHovered: boolean = false): void {
    const posX = Array.isArray(this.position) ? this.position[0] : this.position[0]
    const posY = Array.isArray(this.position) ? this.position[1] : this.position[1]
    const sizeX = Array.isArray(this.size) ? this.size[0] : this.size[0]
    const sizeY = Array.isArray(this.size) ? this.size[1] : this.size[1]

    // Handle hover effect for drawing color
    let drawColor: Color = this.isOn ? this.onColor : this.offColor
    if (isHovered) {
      drawColor = [...drawColor] as Color
      drawColor[0] = Math.min(drawColor[0] * 1.2, 1)
      drawColor[1] = Math.min(drawColor[1] * 1.2, 1)
      drawColor[2] = Math.min(drawColor[2] * 1.2, 1)
    }

    // Draw the toggle with animation support using knobPosition
    renderer.drawToggle({
      position: [posX, posY],
      size: [sizeX, sizeY],
      isOn: this.isOn,
      onColor: this.onColor,
      offColor: this.offColor,
      knobPosition: this.knobPosition
    })
  }

  setKnobPosition(position: number): void {
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
      ...super.toJSON(),
      className: 'ToggleComponent',
      size: Array.from(this.size), // Convert Vec2 to array
      isOn: this.isOn,
      onColor: Array.from(this.onColor), // Convert Color to array
      offColor: Array.from(this.offColor), // Convert Color to array
      knobPosition: this.knobPosition
    }
  }

  public static fromJSON(data: any): ToggleComponent {
    const config: ToggleComponentConfig = {
      className: 'ToggleComponent',
      position: data.position || [0, 0],
      size: data.size || [50, 25], // Default size if not provided
      isOn: data.isOn ?? false,
      onColor: data.onColor || [0, 1, 0, 1], // Green
      offColor: data.offColor || [1, 0, 0, 1], // Red
      knobPosition: data.knobPosition ?? (data.isOn ? 1.0 : 0.0),
      isVisible: data.isVisible ?? true,
      zIndex: data.zIndex ?? 0
    }

    return new ToggleComponent(config)
  }
}
