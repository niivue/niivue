import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Color } from '../types.js'
import { ContainerButtonComponentConfig } from '../interfaces.js'
import { BaseContainerComponent } from './basecontainercomponent.js'

export class ContainerButtonComponent extends BaseContainerComponent {
  private onClickHandler?: () => void
  private fillColor: Color
  private highlightColor: Color
  outlineColor: Color
  roundness: number

  constructor(config: ContainerButtonComponentConfig) {
    super(config)
    this.fillColor = config.fillColor ?? [0, 0, 0, 0.3]
    this.highlightColor = config.highlightColor ?? [0.0, 0.0, 0.5, 0.3]
    this.outlineColor = config.outlineColor ?? [1, 1, 1, 1]
    this.roundness = config.roundness ?? 0.0
    this.maxWidth = config.maxWidth ?? 0
    this.maxHeight = config.maxHeight ?? 0

    this.addMouseEffects()
  }

  handleMouseClick(mousePosition: Vec2): void {
    const [x, y, width, height] = this.getBounds()
    if (
      mousePosition[0] >= x &&
      mousePosition[0] <= x + width &&
      mousePosition[1] >= y &&
      mousePosition[1] <= y + height
    ) {
      this.applyEventEffects('pointerup')
      if (this.onClickHandler) {
        this.onClickHandler()
      }
    }
  }

  draw(renderer: UIKRenderer): void {
    if (!this.isVisible) {
      return
    }
    this.updateLayout()
    // Draw the button background
    // renderer.drawRect(this.getBounds(), this.fillColor)
    const bounds = this.getBounds()
    renderer.drawRoundedRect(
      bounds,
      this.fillColor,
      this.outlineColor,
      (Math.min(1.0, this.roundness) / 2) * Math.min(bounds[2], bounds[3])
    )

    // Draw the child components
    this.components.forEach((component) => {
      if (component.isVisible) {
        component.draw(renderer)
      }
    })
  }

  addMouseEffects(): void {
    // Adding click effects to create a bounce animation

    // Effect 1: Shrink the size of the button on click (bounce effect)
    this.addEventEffect(
      'pointerup',
      this,
      'scale',
      'animateValue',
      1.0, // start value (normal size)
      0.9, // target value (shrinked size)
      100, // duration in milliseconds
      true // isBounce - true to create a bounce effect
    )

    // Effect 2: Move the button down slightly to maintain the same center point (bounce effect)
    this.addEventEffect(
      'pointerup',
      this,
      'position',
      'animateValue',
      [this.getPosition()[0], this.getPosition()[1]], // start position
      [this.getPosition()[0], this.getPosition()[1] + 5], // target position (move down by 5 units)
      100, // duration in milliseconds
      true // isBounce - true to create a bounce effect
    )

    // Adding mouse enter effect to change fill color to highlight
    this.addEventEffect('pointerenter', this, 'fillColor', 'setValue', this.highlightColor)

    // Adding mouse leave effect to revert to original fill color
    this.addEventEffect('pointerleave', this, 'fillColor', 'setValue', this.fillColor)
  }

  // toJSON method to serialize the ContainerButtonComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(),
      className: 'ContainerButtonComponent',
      outlineColor: Array.from(this.outlineColor),
      fillColor: Array.from(this.fillColor),
      highlightColor: Array.from(this.highlightColor),
      roundness: this.roundness,
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
      isHorizontal: this.isHorizontal,
      padding: this.padding
    }
  }

  public static fromJSON(data: any, canvas: HTMLCanvasElement): ContainerButtonComponent {
    const config: ContainerButtonComponentConfig = {
      className: 'ContainerButtonComponent',
      position: data.position || [0, 0],
      canvas,
      outlineColor: data.outlineColor || [1, 1, 1, 1],
      fillColor: data.fillColor || [0, 0, 0, 0.3],
      highlightColor: data.highlightColor || [0.0, 0.0, 0.5, 0.3],
      roundness: data.roundness || 0.0,
      maxWidth: data.maxWidth || 0,
      maxHeight: data.maxHeight || 0,
      isHorizontal: data.isHorizontal ?? true,
      padding: data.padding ?? 50
    }

    return new ContainerButtonComponent(config)
  }
}
