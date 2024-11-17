import { UIKRenderer } from '../uikRenderer.js'
import { Vec2, Color } from '../types.js'
import { UIKFont } from '../uikFont.js'
import { BaseContainerComponent } from './baseContainerComponent.js'
import { ButtonComponent } from './buttonComponent.js'
import { TriangleComponent } from './triangleComponent.js'
import { BaseUIComponent } from './baseUiComponent.js'

export class DrawerComponent extends BaseContainerComponent {
  private isOpen: boolean = false
  private button: ButtonComponent
  private triangle: TriangleComponent
  private drawerContent: BaseContainerComponent

  constructor(
    position: Vec2,
    canvas: HTMLCanvasElement,
    font: UIKFont,
    buttonText: string,
    textColor: Color = [0, 0, 0, 1],
    outlineColor: Color = [1, 1, 1, 1],
    fillColor: Color = [0, 0, 0, 0.3],
    highlightColor: Color = [0.5, 0.5, 0.5, 1.0],
    margin: number = 10,
    roundness: number = 0.0,
    scale: number = 1.0,
    maxWidth: number = 0
  ) {
    super(position, canvas, false, margin)

    // Initialize the button with a toggle action
    this.button = new ButtonComponent(
      font,
      position,
      buttonText,
      textColor,
      outlineColor,
      fillColor,
      highlightColor,
      margin,
      roundness,
      scale,
      maxWidth
    )
    this.button.onClick = this.toggleDrawer.bind(this)
    console.log('button', this.button)
    // Initialize the triangle component for the dropdown indicator
    const triangleBase = [position[0] + maxWidth - margin * 2, position[1]]
    this.triangle = new TriangleComponent(
      [triangleBase[0], triangleBase[1]], // Top point
      [triangleBase[0], triangleBase[1] + margin * 2], // Base midpoint
      margin, // Base length
      textColor
    )

    // Initialize drawer content container
    this.drawerContent = new BaseContainerComponent([position[0], position[1] + this.button.getBounds()[3]], canvas)
    this.drawerContent.isVisible = this.isOpen

    // Add button and triangle as components of the drawer
    this.addComponent(this.button)
    this.addComponent(this.triangle)
  }

  // Toggle drawer open/close state
  toggleDrawer(): void {
    this.isOpen = !this.isOpen
    this.drawerContent.isVisible = this.isOpen
    this.updateLayout()
  }

  // Add content to the drawer
  addContent(component: BaseUIComponent): void {
    this.drawerContent.addComponent(component)
    this.updateLayout()
  }

  // Update layout to include drawer content if open
  updateLayout(): void {
    super.updateLayout()
    if (this.isOpen) {
      let offset = this.button.getBounds()[3] + this.padding
      this.drawerContent.components.forEach((component) => {
        component.setPosition([this.position[0] + this.padding, this.position[1] + offset])
        offset += component.getBounds()[3] + this.padding
      })
      this.updateBounds()
    }
  }

  // Override draw to handle drawer's open/close state and content visibility
  draw(renderer: UIKRenderer): void {
    console.log('draw called')
    if (!this.isVisible) {
      return
    }

    super.draw(renderer) // Draw button and triangle
    if (this.isOpen) {
      this.drawerContent.draw(renderer) // Draw the content only if the drawer is open
    }
  }
}
