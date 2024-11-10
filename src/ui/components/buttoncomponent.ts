import { NVFont } from '../nvfont.js'
import { Vec2, Color } from '../types.js'
import { TextBoxComponent } from './textboxcomponent.js'

// Button Component extending TextBoxComponent
export class ButtonComponent extends TextBoxComponent {
  highlightColor: Color
  onClickHandler?: (event: MouseEvent) => void

  constructor(
    font: NVFont,
    position: Vec2,
    text: string,
    textColor: Color = [0, 0, 0, 1],
    outlineColor: Color = [1, 1, 1, 1],
    fillColor: Color = [0, 0, 0, 0.3],
    highlightColor: Color = [0.5, 0.5, 0.5, 1.0],
    margin = 15,
    roundness = 0.0,
    scale = 1.0,
    maxWidth = 0,
    fontOutlineColor = [0, 0, 0, 1],
    fontOutlineThickness = 1
  ) {
    // Call parent constructor to initialize base properties
    super(
      font,
      position,
      text,
      textColor,
      outlineColor,
      fillColor,
      margin,
      roundness,
      scale,
      maxWidth,
      fontOutlineColor,
      fontOutlineThickness
    )
    this.highlightColor = highlightColor
    // Adding click effects to create a bounce animation

    // Effect 1: Shrink the size of the button on click (bounce effect)
    this.addEventEffect(
      'pointerup',
      this,
      'scale',
      'animateValue',
      scale, // start value (normal size)
      0.9 * scale, // target value (shrinked size)
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
      true // isBounce - true to create a bounce effect
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
      fillColor // Revert to original fill color
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
