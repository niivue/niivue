import { ButtonComponentConfig } from '../interfaces.js'
import { Vec2, Color } from '../types.js'
import { TextBoxComponent } from './textboxcomponent.js'

// Button Component extending TextBoxComponent
export class ButtonComponent extends TextBoxComponent {
  highlightColor: Color
  onClick?: (event: PointerEvent) => void

  constructor(config: ButtonComponentConfig) {
    super(config)
    this.highlightColor = config.highlightColor ?? [0.5, 0.5, 0.5, 1.0]
    this.onClick = config.onClick

    // Adding click effects to create a bounce animation

    // Effect 1: Shrink the size of the button on click (bounce effect)
    this.addEventEffect(
      'pointerup',
      this,
      'scale',
      'animateValue',
      this.scale, // start value (normal size)
      0.9 * this.scale, // target value (shrunk size)
      100, // duration in milliseconds
      true // isBounce - true to create a bounce effect
    )

    // Effect 2: Move the button down slightly to maintain the same center point (bounce effect)
    this.addEventEffect(
      'pointerup',
      this,
      'position',
      'animateValue',
      [this.position[0], this.position[1]], // start position
      [this.position[0], this.position[1] + 5], // target position (move down by 5 units)
      100, // duration in milliseconds
      true, // isBounce - true to create a bounce effect
      false,
      this.handleClick.bind(this)
    )

    // Effect 3: Change fillColor on mouse enter
    this.addEventEffect(
      'pointerenter',
      this,
      'fillColor',
      'setValue',
      [0.5, 0.5, 0.5, 1.0] // Change fill color to a light gray
    )

    // Effect 4: Revert fillColor on mouse leave
    this.addEventEffect(
      'pointerleave',
      this,
      'fillColor',
      'setValue',
      config.fillColor ?? [0, 0, 0, 0.3] // Revert to original fill color
    )
  }

  // Handle mouse click to trigger the effects
  handleMouseClick(mousePosition: Vec2): void {
    const posX = Array.isArray(this.position) ? this.position[0] : this.position[0]
    const posY = Array.isArray(this.position) ? this.position[1] : this.position[1]
    const sizeX = this.maxWidth > 0 ? this.maxWidth : this.font.getTextWidth(this.text) * this.scale
    const sizeY = this.font.getTextHeight(this.text) * this.scale + this.margin * 2

    // Check if the click is within bounds
    if (
      mousePosition[0] >= posX &&
      mousePosition[0] <= posX + sizeX &&
      mousePosition[1] >= posY &&
      mousePosition[1] <= posY + sizeY
    ) {
      this.applyEventEffects('pointerup')
    }
  }

  handleClick(event: PointerEvent): void {
    if (this.onClick) {
      this.onClick(event)
    }
  }

  // Draw the button component
  draw(renderer): void {
    // Call the parent draw method to render the button as a text box
    super.draw(renderer)
  }

  // toJSON method to serialize the ButtonComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties from TextBoxComponent
      className: 'ButtonComponent', // Class name for identification
      highlightColor: Array.from(this.highlightColor) // Serialize the highlight color
    }
  }
}
