import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color, Vec2 } from '../types'
import { vec2, vec4 } from 'gl-matrix'

/**
 * Button states for visual feedback
 */
export enum UIKButtonState {
  NORMAL = 'normal',
  HOVER = 'hover',
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

/**
 * Button style configuration
 */
export interface UIKButtonStyle {
  backgroundColor: Color
  hoverColor?: Color
  activeColor?: Color
  borderColor: Color
  textColor: Color
  borderWidth: number
  borderRadius: number
  padding: [number, number] // [horizontal, vertical]
  shadowColor?: Color
  shadowOffset?: [number, number]
  /** Text scaling factor for button text */
  textScale?: number
  /** Character width multiplier for text width calculation */
  charWidthMultiplier?: number
  /** Text height for vertical centering */
  textHeight?: number
  /** Vertical text offset for fine-tuning text position */
  textVerticalOffset?: number
}

/**
 * Button configuration options
 */
export interface UIKButtonConfig {
  bounds: Vec4 // [x, y, width, height]
  text: string
  onClick?: (event: UIKButtonEvent) => void
  onHover?: (event: UIKButtonEvent) => void
  style?: Partial<UIKButtonStyle>
  disabled?: boolean
  font?: UIKFont
}

/**
 * Button event data
 */
export interface UIKButtonEvent {
  button: UIKButton
  mousePosition: Vec2
  timestamp: number
  type: 'click' | 'hover' | 'leave'
}

/**
 * Default button styles for different states
 */
const DEFAULT_STYLES: Record<UIKButtonState, UIKButtonStyle> = {
  [UIKButtonState.NORMAL]: {
    backgroundColor: [0.25, 0.25, 0.25, 1.0],
    borderColor: [0.5, 0.5, 0.5, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 1,
    borderRadius: 2,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 7,
    textHeight: 14,
    textVerticalOffset: 4
  },
  [UIKButtonState.HOVER]: {
    backgroundColor: [0.35, 0.35, 0.35, 1.0],
    borderColor: [0.7, 0.7, 0.7, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 1,
    borderRadius: 2,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 7,
    textHeight: 14,
    textVerticalOffset: 4
  },
  [UIKButtonState.ACTIVE]: {
    backgroundColor: [0.15, 0.15, 0.15, 1.0],
    borderColor: [0.8, 0.8, 0.8, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 2,
    borderRadius: 2,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 7,
    textHeight: 14,
    textVerticalOffset: 4
  },
  [UIKButtonState.DISABLED]: {
    backgroundColor: [0.1, 0.1, 0.1, 0.5],
    borderColor: [0.2, 0.2, 0.2, 0.5],
    textColor: [0.5, 0.5, 0.5, 0.5],
    borderWidth: 1,
    borderRadius: 2,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 7,
    textHeight: 14,
    textVerticalOffset: 4
  }
}

/**
 * Interactive button component for UIKit
 * Provides click handling, hover states, and customizable styling
 * Designed for medical imaging applications with WebGL rendering
 */
export class UIKButton {
  private renderer: UIKRenderer
  private config: UIKButtonConfig
  private state: UIKButtonState = UIKButtonState.NORMAL
  private isMouseDown: boolean = false
  private lastMousePosition: Vec2 = vec2.create()

  constructor(renderer: UIKRenderer, config: UIKButtonConfig) {
    this.renderer = renderer
    this.config = { ...config }
    
    // Set initial state based on disabled flag
    if (config.disabled) {
      this.state = UIKButtonState.DISABLED
    }
  }

  /**
   * Render the button with current state styling
   */
  public render(): void {
    const style = this.getCurrentStyle()
    const bounds = this.config.bounds
    const [x, y, width, height] = bounds
    
    // Draw shadow first (behind the button)
    this.drawButtonShadow(x, y, width, height)
    
    // Draw main button background with gradient
    this.drawButtonBackground(x, y, width, height, style)
    
    // Draw border with proper styling
    if (style.borderWidth > 0) {
      this.drawStylishBorder(bounds, style)
    }
    
    // Add modern button effects (highlights, depth)
    this.drawButtonEffects(bounds, style)

    // Draw text if provided
    if (this.config.text && this.config.font) {
      this.renderText(style)
    }
  }

  /**
   * Draw button shadow for depth
   */
  private drawButtonShadow(x: number, y: number, width: number, height: number): void {
    if (this.state === UIKButtonState.ACTIVE) return // No shadow when pressed
    
    const shadowOffset = this.getCurrentStyle().shadowOffset || [2, 3]
    const shadowColor = this.getCurrentStyle().shadowColor || [0, 0, 0, 0.3]
    
    // Draw multiple shadow layers for better depth
    for (let i = 0; i < 4; i++) {
      const offset = i + 1
      const alpha = shadowColor[3] * (1 - i * 0.2)
      this.renderer.drawLine({
        startEnd: [x + shadowOffset[0], y + height + offset, x + width + shadowOffset[0], y + height + offset],
        thickness: 1,
        color: [shadowColor[0], shadowColor[1], shadowColor[2], alpha]
      })
      
      // Side shadow
      this.renderer.drawLine({
        startEnd: [x + width + offset, y + shadowOffset[1], x + width + offset, y + height + shadowOffset[1]],
        thickness: 1,
        color: [shadowColor[0], shadowColor[1], shadowColor[2], alpha * 0.7]
      })
    }
  }

  /**
   * Draw button background with gradient effect
   */
  private drawButtonBackground(x: number, y: number, width: number, height: number, style: UIKButtonStyle): void {
    const isPressed = this.state === UIKButtonState.ACTIVE
    const baseColor = style.backgroundColor
    
    // Create gradient effect by drawing horizontal lines with varying colors
    for (let i = 0; i < height; i++) {
      const progress = i / height
      
      let gradientColor: Color
      if (isPressed) {
        // Inverted gradient when pressed
        gradientColor = [
          Math.max(baseColor[0] - progress * 0.1, 0),
          Math.max(baseColor[1] - progress * 0.1, 0),
          Math.max(baseColor[2] - progress * 0.1, 0),
          baseColor[3]
        ]
      } else {
        // Normal gradient (lighter at top, darker at bottom)
        gradientColor = [
          Math.min(baseColor[0] + (1 - progress) * 0.15, 1),
          Math.min(baseColor[1] + (1 - progress) * 0.15, 1),
          Math.min(baseColor[2] + (1 - progress) * 0.15, 1),
          baseColor[3]
        ]
      }
      
      this.renderer.drawLine({
        startEnd: [x, y + i, x + width, y + i],
        thickness: 1,
        color: gradientColor
      })
    }
  }

  /**
   * Draw stylish border with rounded corners effect
   */
  private drawStylishBorder(bounds: Vec4, style: UIKButtonStyle): void {
    const [x, y, width, height] = bounds
    const borderColor = style.borderColor
    const borderWidth = style.borderWidth
    
    // Draw main border lines
    for (let i = 0; i < borderWidth; i++) {
      // Top border
      this.renderer.drawLine({
        startEnd: [x + i, y + i, x + width - i, y + i],
        thickness: 1,
        color: borderColor
      })
      
      // Right border
      this.renderer.drawLine({
        startEnd: [x + width - i, y + i, x + width - i, y + height - i],
        thickness: 1,
        color: borderColor
      })
      
      // Bottom border
      this.renderer.drawLine({
        startEnd: [x + width - i, y + height - i, x + i, y + height - i],
        thickness: 1,
        color: borderColor
      })
      
      // Left border
      this.renderer.drawLine({
        startEnd: [x + i, y + height - i, x + i, y + i],
        thickness: 1,
        color: borderColor
      })
    }
    
    // Add corner rounding effect
    this.drawRoundedCorners(x, y, width, height, style.borderRadius, borderColor)
  }

  /**
   * Draw rounded corners for modern button appearance
   */
  private drawRoundedCorners(x: number, y: number, width: number, height: number, radius: number, color: Color): void {
    if (radius <= 0) return
    
    const cornerRadius = Math.min(radius, Math.min(width, height) / 4)
    
    // Enhanced corner rounding with smoother transitions
    for (let i = 0; i < cornerRadius; i++) {
      const alpha = 1 - (i / cornerRadius) * 0.5 // Smoother fade
      const cornerColor: Color = [color[0], color[1], color[2], color[3] * alpha]
      
      // Top-left corner - smoother curve
      this.renderer.drawLine({
        startEnd: [x + i, y + cornerRadius - i, x + i + 2, y + cornerRadius - i],
        thickness: 1,
        color: cornerColor
      })
      
      // Top-right corner
      this.renderer.drawLine({
        startEnd: [x + width - i - 2, y + cornerRadius - i, x + width - i, y + cornerRadius - i],
        thickness: 1,
        color: cornerColor
      })
      
      // Bottom-left corner
      this.renderer.drawLine({
        startEnd: [x + i, y + height - cornerRadius + i, x + i + 2, y + height - cornerRadius + i],
        thickness: 1,
        color: cornerColor
      })
      
      // Bottom-right corner
      this.renderer.drawLine({
        startEnd: [x + width - i - 2, y + height - cornerRadius + i, x + width - i, y + height - cornerRadius + i],
        thickness: 1,
        color: cornerColor
      })
    }
  }

  /**
   * Draw modern button effects (highlights, inner shadows)
   */
  private drawButtonEffects(bounds: Vec4, style: UIKButtonStyle): void {
    const [x, y, width, height] = bounds
    const isPressed = this.state === UIKButtonState.ACTIVE
    const isHovered = this.state === UIKButtonState.HOVER
    
    if (!isPressed) {
      // Top highlight for 3D effect
      const highlightColor: Color = [1, 1, 1, 0.3]
      this.renderer.drawLine({
        startEnd: [x + 2, y + 1, x + width - 2, y + 1],
        thickness: 1,
        color: highlightColor
      })
      
      // Inner highlight
      this.renderer.drawLine({
        startEnd: [x + 3, y + 2, x + width - 3, y + 2],
        thickness: 1,
        color: [highlightColor[0], highlightColor[1], highlightColor[2], highlightColor[3] * 0.5]
      })
    } else {
      // Inner shadow when pressed
      const shadowColor: Color = [0, 0, 0, 0.4]
      this.renderer.drawLine({
        startEnd: [x + 1, y + 1, x + width - 1, y + 1],
        thickness: 1,
        color: shadowColor
      })
      
      this.renderer.drawLine({
        startEnd: [x + 1, y + 1, x + 1, y + height - 1],
        thickness: 1,
        color: shadowColor
      })
    }
    
    // Hover glow effect
    if (isHovered && !isPressed) {
      const glowColor: Color = [
        Math.min(style.backgroundColor[0] + 0.2, 1),
        Math.min(style.backgroundColor[1] + 0.2, 1),
        Math.min(style.backgroundColor[2] + 0.2, 1),
        0.1
      ]
      
      // Outer glow
      for (let i = 1; i <= 2; i++) {
        this.drawBorder([x - i, y - i, width + 2*i, height + 2*i], glowColor, 1)
      }
    }
  }

  /**
   * Draw border using lines (helper method for effects)
   */
  private drawBorder(bounds: Vec4, borderColor: Color, borderWidth: number): void {
    const [x, y, width, height] = bounds
    
    // Top border
    this.renderer.drawLine({
      startEnd: [x, y, x + width, y],
      thickness: borderWidth,
      color: borderColor
    })
    
    // Right border
    this.renderer.drawLine({
      startEnd: [x + width, y, x + width, y + height],
      thickness: borderWidth,
      color: borderColor
    })
    
    // Bottom border
    this.renderer.drawLine({
      startEnd: [x + width, y + height, x, y + height],
      thickness: borderWidth,
      color: borderColor
    })
    
    // Left border
    this.renderer.drawLine({
      startEnd: [x, y + height, x, y],
      thickness: borderWidth,
      color: borderColor
    })
  }

  /**
   * Handle mouse events for interaction
   */
  public handleMouseEvent(event: MouseEvent): boolean {
    if (this.state === UIKButtonState.DISABLED) {
      return false
    }

    const mousePosition: Vec2 = [event.offsetX, event.offsetY]
    vec2.copy(this.lastMousePosition, mousePosition)
    const isInside = this.isPointInside(mousePosition)

    switch (event.type) {
      case 'mousedown':
        if (isInside) {
          this.isMouseDown = true
          this.setState(UIKButtonState.ACTIVE)
          return true // Event consumed
        }
        break

      case 'mouseup':
        if (this.isMouseDown && isInside) {
          this.isMouseDown = false
          this.setState(UIKButtonState.HOVER)
          this.triggerClick(mousePosition)
          return true
        }
        this.isMouseDown = false
        this.setState(isInside ? UIKButtonState.HOVER : UIKButtonState.NORMAL)
        break

      case 'mousemove':
        if (this.isMouseDown) {
          // Allow moving mouse outside while pressed
          if (!isInside) {
            this.setState(UIKButtonState.NORMAL)
          } else {
            this.setState(UIKButtonState.ACTIVE)
          }
        } else {
          const newState = isInside ? UIKButtonState.HOVER : UIKButtonState.NORMAL
          if (newState !== this.state) {
            this.setState(newState)
            if (newState === UIKButtonState.HOVER) {
              this.triggerHover(mousePosition)
            } else {
              this.triggerLeave(mousePosition)
            }
          }
        }
        return isInside

      case 'mouseleave':
        this.isMouseDown = false
        this.setState(UIKButtonState.NORMAL)
        this.triggerLeave(mousePosition)
        break
      
      case 'click':
        // The click logic is handled on mouseup to ensure responsive feel
        if (isInside) {
          return true
        }
        break
    }

    return isInside
  }

  /**
   * Check if a point is inside the button bounds
   */
  private isPointInside(point: Vec2): boolean {
    const [x, y, width, height] = this.config.bounds
    return (
      point[0] >= x &&
      point[0] <= x + width &&
      point[1] >= y &&
      point[1] <= y + height
    )
  }

  /**
   * Get the current style based on state and user overrides
   */
  private getCurrentStyle(): UIKButtonStyle {
    const baseStyle = DEFAULT_STYLES[this.state]
    const userStyle = this.config.style || {}
    
    // Determine the background color based on current state and user overrides
    let backgroundColor = userStyle.backgroundColor || baseStyle.backgroundColor
    
    if (this.state === UIKButtonState.HOVER && userStyle.hoverColor) {
      backgroundColor = userStyle.hoverColor
    } else if (this.state === UIKButtonState.ACTIVE && userStyle.activeColor) {
      backgroundColor = userStyle.activeColor
    }
    
    return {
      backgroundColor: backgroundColor,
      hoverColor: userStyle.hoverColor,
      activeColor: userStyle.activeColor,
      borderColor: userStyle.borderColor || baseStyle.borderColor,
      textColor: userStyle.textColor || baseStyle.textColor,
      borderWidth: userStyle.borderWidth ?? baseStyle.borderWidth,
      borderRadius: userStyle.borderRadius ?? baseStyle.borderRadius,
      padding: userStyle.padding || baseStyle.padding,
      shadowColor: userStyle.shadowColor,
      shadowOffset: userStyle.shadowOffset,
      textScale: userStyle.textScale ?? baseStyle.textScale,
      charWidthMultiplier: userStyle.charWidthMultiplier ?? baseStyle.charWidthMultiplier,
      textHeight: userStyle.textHeight ?? baseStyle.textHeight,
      textVerticalOffset: userStyle.textVerticalOffset ?? baseStyle.textVerticalOffset
    }
  }

  /**
   * Render button text centered within bounds
   */
  private renderText(style: UIKButtonStyle): void {
    if (!this.config.font) return

    const [x, y, width, height] = this.config.bounds
    const [padX, padY] = style.padding
    
    // More accurate text centering calculation
    const textWidth = this.config.text.length * (style.charWidthMultiplier ?? 7)
    const textHeight = style.textHeight ?? 14
    
    // Center text within button bounds with proper padding consideration
    const textX = x + (width - textWidth) / 2
    const textY = y + (height / 2) + (style.textVerticalOffset ?? 4)
    
    this.renderer.drawRotatedText({
      font: this.config.font,
      xy: vec2.fromValues(textX, textY),
      str: this.config.text,
      color: style.textColor,
      scale: style.textScale ?? 0.025,
      rotation: 0
    })
  }

  /**
   * Set button state and trigger visual updates
   */
  private setState(newState: UIKButtonState): void {
    if (this.state !== newState) {
      this.state = newState
      // Could trigger state change callbacks here if needed
    }
  }

  /**
   * Trigger click event
   */
  private triggerClick(mousePosition: Vec2): void {
    if (this.config.onClick) {
      const event: UIKButtonEvent = {
        button: this,
        mousePosition: vec2.clone(mousePosition),
        timestamp: Date.now(),
        type: 'click'
      }
      this.config.onClick(event)
    }
  }

  /**
   * Trigger hover event
   */
  private triggerHover(mousePosition: Vec2): void {
    if (this.config.onHover) {
      const event: UIKButtonEvent = {
        button: this,
        mousePosition: vec2.clone(mousePosition),
        timestamp: Date.now(),
        type: 'hover'
      }
      this.config.onHover(event)
    }
  }

  /**
   * Trigger leave event
   */
  private triggerLeave(mousePosition: Vec2): void {
    if (this.config.onHover) {
      const event: UIKButtonEvent = {
        button: this,
        mousePosition: vec2.clone(mousePosition),
        timestamp: Date.now(),
        type: 'leave'
      }
      this.config.onHover(event)
    }
  }

  // Public getters and setters
  public get bounds(): Vec4 { return vec4.clone(this.config.bounds) }
  public get text(): string { return this.config.text }
  public get disabled(): boolean { return this.state === UIKButtonState.DISABLED }
  public get currentState(): UIKButtonState { return this.state }

  public setText(text: string): void {
    this.config.text = text
  }

  public setDisabled(disabled: boolean): void {
    this.setState(disabled ? UIKButtonState.DISABLED : UIKButtonState.NORMAL)
  }

  public setBounds(bounds: Vec4): void {
    vec4.copy(this.config.bounds, bounds)
  }
} 