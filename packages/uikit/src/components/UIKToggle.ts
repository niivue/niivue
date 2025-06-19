import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color, Vec2 } from '../types'

/**
 * Configuration interface for UIKToggle component
 */
export interface UIKToggleConfig {
  /** Bounding rectangle [x, y, width, height] */
  bounds: Vec4
  /** Current toggle state */
  checked: boolean
  /** Label text to display */
  label?: string
  /** Font for text rendering */
  font?: UIKFont
  /** Callback when toggle state changes */
  onToggle?: (checked: boolean) => void
  /** Visual styling options */
  style?: UIKToggleStyle
  /** Whether toggle is enabled */
  enabled?: boolean
  /** Toggle type: 'checkbox' or 'switch' */
  type?: 'checkbox' | 'switch'
  /** Label position: 'left' or 'right' */
  labelPosition?: 'left' | 'right'
}

/**
 * Visual styling options for UIKToggle
 */
export interface UIKToggleStyle {
  /** Background color when unchecked */
  uncheckedColor?: Color
  /** Background color when checked */
  checkedColor?: Color
  /** Border color */
  borderColor?: Color
  /** Checkmark/thumb color */
  thumbColor?: Color
  /** Text color for label */
  textColor?: Color
  /** Disabled state colors */
  disabledColor?: Color
  /** Hover state colors */
  hoverColor?: Color
  /** Border thickness */
  borderThickness?: number
  /** Corner radius for rounded appearance */
  cornerRadius?: number
}

/**
 * Toggle interaction states
 */
export enum UIKToggleState {
  NORMAL = 'normal',
  HOVER = 'hover',
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

/**
 * UIKToggle - Interactive toggle/checkbox component for boolean options
 * Perfect for medical imaging controls like show/hide overlays, enable/disable features
 */
export class UIKToggle {
  private renderer: UIKRenderer
  private config: UIKToggleConfig
  private state: UIKToggleState = UIKToggleState.NORMAL
  private animationProgress: number = 0
  private targetProgress: number = 0
  private animationSpeed: number = 0.15
  
  // Default styling
  private defaultStyle: UIKToggleStyle = {
    uncheckedColor: [0.4, 0.4, 0.4, 1.0],
    checkedColor: [0.2, 0.7, 1.0, 1.0],
    borderColor: [0.7, 0.7, 0.7, 1.0],
    thumbColor: [1.0, 1.0, 1.0, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    disabledColor: [0.5, 0.5, 0.5, 0.5],
    hoverColor: [0.3, 0.8, 1.0, 1.0],
    borderThickness: 1,
    cornerRadius: 3
  }

  constructor(renderer: UIKRenderer, config: UIKToggleConfig) {
    this.renderer = renderer
    this.config = {
      enabled: true,
      type: 'checkbox',
      labelPosition: 'right',
      ...config
    }
    
    // Merge styles
    this.config.style = { ...this.defaultStyle, ...config.style }
    
    // Initialize animation state
    this.targetProgress = this.config.checked ? 1 : 0
    this.animationProgress = this.targetProgress
  }

  /**
   * Set the toggle state
   */
  public setChecked(checked: boolean): void {
    if (this.config.checked !== checked) {
      this.config.checked = checked
      this.targetProgress = checked ? 1 : 0
    }
  }

  /**
   * Get the current toggle state
   */
  public isChecked(): boolean {
    return this.config.checked
  }

  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.state = enabled ? UIKToggleState.NORMAL : UIKToggleState.DISABLED
  }

  /**
   * Handle mouse/touch events
   */
  public handleMouseEvent(event: MouseEvent): boolean {
    if (!this.config.enabled) return false

    const toggleBounds = this.getToggleBounds()
    const [x, y, width, height] = toggleBounds
    const mouseX = event.offsetX
    const mouseY = event.offsetY

    // Check if mouse is over toggle
    const isOver = mouseX >= x && mouseX <= x + width && 
                   mouseY >= y && mouseY <= y + height

    switch (event.type) {
      case 'mousedown':
        if (isOver) {
          this.state = UIKToggleState.ACTIVE
          return true
        }
        break

      case 'mousemove':
        if (isOver) {
          this.state = this.state === UIKToggleState.ACTIVE ? 
                      UIKToggleState.ACTIVE : UIKToggleState.HOVER
          return true
        } else {
          this.state = UIKToggleState.NORMAL
        }
        break

      case 'mouseup':
        if (isOver && this.state === UIKToggleState.ACTIVE) {
          this.toggle()
          this.state = UIKToggleState.HOVER
          return true
        }
        this.state = UIKToggleState.NORMAL
        break
    }

    return false
  }

  /**
   * Toggle the state
   */
  private toggle(): void {
    const newState = !this.config.checked
    this.setChecked(newState)
    
    if (this.config.onToggle) {
      this.config.onToggle(newState)
    }
  }

  /**
   * Update animation
   */
  public update(): void {
    // Smooth animation towards target
    const diff = this.targetProgress - this.animationProgress
    if (Math.abs(diff) > 0.001) {
      this.animationProgress += diff * this.animationSpeed
    } else {
      this.animationProgress = this.targetProgress
    }
  }

  /**
   * Get the bounds of just the toggle element (not including label)
   */
  private getToggleBounds(): Vec4 {
    const [x, y, width, height] = this.config.bounds
    
    if (this.config.type === 'switch') {
      // Switch is wider - use more of the available space
      const toggleWidth = Math.min(width * 0.8, 48) // Increased from 0.4 to 0.8
      const toggleHeight = Math.min(height * 0.8, 20) // Increased height proportion
      return [x + (width - toggleWidth) / 2, y + (height - toggleHeight) / 2, toggleWidth, toggleHeight]
    } else {
      // Checkbox is square - make it larger and more prominent
      const size = Math.min(width * 0.6, height * 0.8, 18) // Increased from 0.3 to 0.6
      return [x + (width - size) / 2, y + (height - size) / 2, size, size]
    }
  }

  /**
   * Render the toggle component
   */
  public render(): void {
    // Update animation
    this.update()
    
    const [x, y, width, height] = this.config.bounds
    const style = this.config.style!
    
    // Calculate colors based on state
    let backgroundColor = this.config.checked ? style.checkedColor! : style.uncheckedColor!
    let borderColor = style.borderColor!
    let thumbColor = style.thumbColor!
    let textColor = style.textColor!
    
    if (this.state === UIKToggleState.DISABLED) {
      backgroundColor = style.disabledColor!
      borderColor = style.disabledColor!
      thumbColor = style.disabledColor!
      textColor = style.disabledColor!
    } else if (this.state === UIKToggleState.HOVER || this.state === UIKToggleState.ACTIVE) {
      if (this.config.checked) {
        backgroundColor = style.hoverColor!
      }
      borderColor = style.hoverColor!
    }

    // Interpolate colors based on animation progress
    if (this.animationProgress > 0 && this.animationProgress < 1) {
      backgroundColor = this.interpolateColor(style.uncheckedColor!, style.checkedColor!, this.animationProgress)
    }

    if (this.config.type === 'switch') {
      this.renderSwitch(backgroundColor, borderColor, thumbColor, textColor)
    } else {
      this.renderCheckbox(backgroundColor, borderColor, thumbColor, textColor)
    }
  }

  /**
   * Render switch-style toggle
   */
  private renderSwitch(backgroundColor: Color, borderColor: Color, 
                      thumbColor: Color, textColor: Color): void {
    const [x, y, width, height] = this.config.bounds
    const toggleBounds = this.getToggleBounds()
    const [toggleX, toggleY, toggleWidth, toggleHeight] = toggleBounds
    const style = this.config.style!
    
    // Draw switch background (rounded rectangle)
    const cornerRadius = toggleHeight / 2
    this.drawRoundedRect(toggleX, toggleY, toggleWidth, toggleHeight, 
                        cornerRadius, backgroundColor, borderColor)
    
    // Draw thumb (circle that slides)
    const thumbRadius = (toggleHeight - 4) / 2
    const thumbTravel = toggleWidth - toggleHeight
    const thumbX = toggleX + thumbRadius + 2 + (thumbTravel * this.animationProgress)
    const thumbY = toggleY + toggleHeight / 2
    
    this.renderer.drawCircle({
      leftTopWidthHeight: [thumbX - thumbRadius, thumbY - thumbRadius, 
                          thumbRadius * 2, thumbRadius * 2],
      circleColor: thumbColor
    })
    
    // Draw label
    this.renderLabel(textColor)
  }

  /**
   * Render checkbox-style toggle
   */
  private renderCheckbox(backgroundColor: Color, borderColor: Color,
                        thumbColor: Color, textColor: Color): void {
    const toggleBounds = this.getToggleBounds()
    const [toggleX, toggleY, toggleWidth, toggleHeight] = toggleBounds
    const style = this.config.style!
    
    // Draw checkbox background
    this.drawRoundedRect(toggleX, toggleY, toggleWidth, toggleHeight,
                        style.cornerRadius!, backgroundColor, borderColor)
    
    // Draw checkmark if checked
    if (this.animationProgress > 0.1) {
      const checkAlpha = Math.min(1, (this.animationProgress - 0.1) / 0.9)
      const checkColor: Color = [thumbColor[0], thumbColor[1], thumbColor[2], checkAlpha]
      
      // Draw checkmark using lines - make it larger and more prominent
      const centerX = toggleX + toggleWidth / 2
      const centerY = toggleY + toggleHeight / 2
      const size = Math.min(toggleWidth, toggleHeight) * 0.4 // Increased from 0.3 to 0.4
      
      // Checkmark path - improved positioning
      this.renderer.drawLine({
        startEnd: [centerX - size * 0.8, centerY, centerX - size * 0.2, centerY + size * 0.6],
        thickness: 2.5, // Thicker lines for better visibility
        color: checkColor
      })
      
      this.renderer.drawLine({
        startEnd: [centerX - size * 0.2, centerY + size * 0.6, centerX + size * 0.8, centerY - size * 0.6],
        thickness: 2.5, // Thicker lines for better visibility
        color: checkColor
      })
    }
    
    // Draw label
    this.renderLabel(textColor)
  }

  /**
   * Render the label text
   */
  private renderLabel(textColor: Color): void {
    if (!this.config.label || !this.config.font) return
    
    const [x, y, width, height] = this.config.bounds
    const toggleBounds = this.getToggleBounds()
    const [toggleX, toggleY, toggleWidth, toggleHeight] = toggleBounds
    
    let labelX: number
    const labelY = y + height / 2 - 6 // Center vertically
    
    if (this.config.labelPosition === 'left') {
      labelX = x
    } else {
      labelX = toggleX + toggleWidth + 10
    }
    
    this.renderer.drawRotatedText({
      font: this.config.font,
      xy: [labelX, labelY],
      str: this.config.label,
      color: textColor,
      scale: 0.9
    })
  }

  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number,
                         radius: number, fillColor: Color, borderColor: Color): void {
    // For now, draw as regular rectangle with border
    // TODO: Implement proper rounded rectangle rendering
    
    // Draw filled rectangle
    this.renderer.drawLine({
      startEnd: [x, y + height/2, x + width, y + height/2],
      thickness: height,
      color: fillColor
    })
    
    // Draw border
    const borderThickness = this.config.style!.borderThickness!
    
    // Top border
    this.renderer.drawLine({
      startEnd: [x, y, x + width, y],
      thickness: borderThickness,
      color: borderColor
    })
    
    // Bottom border
    this.renderer.drawLine({
      startEnd: [x, y + height, x + width, y + height],
      thickness: borderThickness,
      color: borderColor
    })
    
    // Left border
    this.renderer.drawLine({
      startEnd: [x, y, x, y + height],
      thickness: borderThickness,
      color: borderColor
    })
    
    // Right border
    this.renderer.drawLine({
      startEnd: [x + width, y, x + width, y + height],
      thickness: borderThickness,
      color: borderColor
    })
  }

  /**
   * Interpolate between two colors
   */
  private interpolateColor(color1: Color, color2: Color, t: number): Color {
    return [
      color1[0] + (color2[0] - color1[0]) * t,
      color1[1] + (color2[1] - color1[1]) * t,
      color1[2] + (color2[2] - color1[2]) * t,
      color1[3] + (color2[3] - color1[3]) * t
    ]
  }

  /**
   * Get the bounding rectangle for hit testing
   */
  public getBounds(): Vec4 {
    return this.config.bounds
  }

  /**
   * Update the toggle bounds (for responsive layouts)
   */
  public setBounds(bounds: Vec4): void {
    this.config.bounds = bounds
  }

  /**
   * Set the label text
   */
  public setLabel(label: string): void {
    this.config.label = label
  }
} 