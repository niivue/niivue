import { UIKRenderer } from '../uikrenderer'
import { UIKFont, UIKFontOutlineConfig, UIKFontOutlineStyle } from '../assets/uikfont'
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
 * Button style configuration with enhanced outline support
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
  
  // Enhanced outline configuration (backward compatible with legacy properties)
  /** Comprehensive text outline configuration for enhanced readability */
  textOutline?: Partial<UIKFontOutlineConfig>
  /** @deprecated Use textOutline.color instead - Text outline color for better readability */
  textOutlineColor?: Color
  /** @deprecated Use textOutline.width instead - Text outline thickness */
  textOutlineThickness?: number
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
    borderWidth: 1, // FIXED: Consistent across all states
    borderRadius: 6,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 0.50,
    textHeight: 16,
    textVerticalOffset: 12, // FIXED: Consistent across all states
    textOutlineColor: [0.0, 0.0, 0.0, 1.0],
    textOutlineThickness: 3
  },
  [UIKButtonState.HOVER]: {
    backgroundColor: [0.2, 0.6, 1.0, 1.0],
    borderColor: [0.3, 0.7, 1.0, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 1, // FIXED: Consistent with other states
    borderRadius: 6,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 0.50,
    textHeight: 16,
    textVerticalOffset: 12, // FIXED: Consistent with other states
    textOutlineColor: [0.0, 0.0, 0.0, 1.0],
    textOutlineThickness: 3
  },
  [UIKButtonState.ACTIVE]: {
    backgroundColor: [0.15, 0.15, 0.15, 1.0],
    borderColor: [0.4, 0.8, 1.0, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 1, // FIXED: Changed from 2 to 1 for consistency
    borderRadius: 6,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 0.50,
    textHeight: 16,
    textVerticalOffset: 12, // FIXED: Consistent with other states
    textOutlineColor: [0.0, 0.0, 0.0, 1.0],
    textOutlineThickness: 3 // FIXED: Changed from 4 to 3 for consistency
  },
  [UIKButtonState.DISABLED]: {
    backgroundColor: [0.1, 0.1, 0.1, 0.5],
    borderColor: [0.2, 0.2, 0.2, 0.5],
    textColor: [0.5, 0.5, 0.5, 0.5],
    borderWidth: 1, // FIXED: Consistent with other states
    borderRadius: 6,
    padding: [12, 8],
    textScale: 0.025,
    charWidthMultiplier: 0.50, // FIXED: Changed from 0.6 to 0.50 for consistency
    textHeight: 16,
    textVerticalOffset: 12, // FIXED: Changed from 0 to 12 for consistency
    textOutlineColor: [0.0, 0.0, 0.0, 0.6],
    textOutlineThickness: 3 // FIXED: Changed from 2 to 3 for consistency
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
    
    // Create gradient colors for top and bottom
    let topColor: Color
    let bottomColor: Color
    
      if (isPressed) {
      // Inverted gradient when pressed (darker at top)
      topColor = [
        Math.max(baseColor[0] - 0.1, 0),
        Math.max(baseColor[1] - 0.1, 0),
        Math.max(baseColor[2] - 0.1, 0),
          baseColor[3]
        ]
      bottomColor = baseColor
      } else {
        // Normal gradient (lighter at top, darker at bottom)
      topColor = [
        Math.min(baseColor[0] + 0.15, 1),
        Math.min(baseColor[1] + 0.15, 1),
        Math.min(baseColor[2] + 0.15, 1),
        baseColor[3]
      ]
      bottomColor = [
        Math.max(baseColor[0] - 0.05, 0),
        Math.max(baseColor[1] - 0.05, 0),
        Math.max(baseColor[2] - 0.05, 0),
          baseColor[3]
        ]
      }
      
    // Use rounded rectangle with gradient
    this.renderer.drawRoundedRect({
      bounds: [x, y, width, height],
      fillColor: topColor,
      bottomColor: bottomColor,
      outlineColor: [0, 0, 0, 0], // Transparent outline for background
      cornerRadius: style.borderRadius,
      thickness: 0
    })
  }

  /**
   * Draw stylish border using rounded rectangles
   */
  private drawStylishBorder(bounds: Vec4, style: UIKButtonStyle): void {
    const [x, y, width, height] = bounds
    const borderColor = style.borderColor
    const borderWidth = style.borderWidth
    
    // Use rounded rectangle for border
    this.renderer.drawRoundedRect({
      bounds: [x, y, width, height],
      fillColor: [0, 0, 0, 0], // Transparent fill for border-only
      outlineColor: borderColor,
      cornerRadius: style.borderRadius,
      thickness: borderWidth
    })
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
      this.renderer.drawRoundedRect({
        bounds: [x + 1, y + 1, width - 2, 2],
        fillColor: highlightColor,
        outlineColor: [0, 0, 0, 0],
        cornerRadius: Math.max(1, style.borderRadius - 1),
        thickness: 0
      })
    } else {
      // Inner shadow when pressed
      const shadowColor: Color = [0, 0, 0, 0.4]
      this.renderer.drawRoundedRect({
        bounds: [x + 1, y + 1, width - 2, 2],
        fillColor: shadowColor,
        outlineColor: [0, 0, 0, 0],
        cornerRadius: Math.max(1, style.borderRadius - 1),
        thickness: 0
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
        this.renderer.drawRoundedRect({
          bounds: [x - i, y - i, width + 2*i, height + 2*i],
          fillColor: [0, 0, 0, 0],
          outlineColor: glowColor,
          cornerRadius: style.borderRadius + i,
          thickness: 1
        })
      }
    }
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
      textVerticalOffset: userStyle.textVerticalOffset ?? baseStyle.textVerticalOffset,
      textOutline: userStyle.textOutline,
      textOutlineColor: userStyle.textOutlineColor || baseStyle.textOutlineColor,
      textOutlineThickness: userStyle.textOutlineThickness ?? baseStyle.textOutlineThickness
    }
  }

  /**
   * Render button text centered within bounds
   */
  private renderText(style: UIKButtonStyle): void {
    if (!this.config.font) {
      console.warn('UIKButton: No font provided for text rendering')
      return
    }

    const [x, y, width, height] = this.config.bounds
    const [padX, padY] = style.padding
    
    // DEBUG: Enable visual debugging boundaries
    const debugMode = false // Set to true to enable visual debugging
    
    // FIXED: Calculate text dimensions using EXACT ViewModeSelector scaling
    let textWidth: number
    let textHeight: number
    
    if (this.config.font && this.config.font.isFontLoaded) {
      // CRITICAL FIX: Use EXACT same scaling as ViewModeSelector
      const fontSize = (style.textScale ?? 0.025) * 1000 // Convert scale to pixel size
      textWidth = this.config.font.getTextWidth(this.config.text, style.textScale ?? 0.025) * fontSize
      textHeight = this.config.font.getTextHeight(this.config.text, style.textScale ?? 0.025) * fontSize
    } else {
      // FIXED: Use EXACT same fallback as ViewModeSelector
      const charWidth = (style.charWidthMultiplier ?? 0.50) * (style.textScale ?? 0.025) * 800
      textWidth = this.config.text.length * charWidth
      textHeight = (style.textScale ?? 0.025) * 800
    }
    
    // FIXED: Use EXACT ViewModeSelector text centering logic
    const availableWidth = width - (padX * 2)
    const availableHeight = height - (padY * 2)
    
    // CRITICAL: Perfect button text centering with fine-tuning
    const textX = x + padX + (availableWidth - textWidth) / 2 + 17 // Move 17px to the right
    
    // CRITICAL: Perfect vertical centering with fine-tuning
    const textY = y + (height / 2) + (style.textVerticalOffset ?? 12) + 2 // Move 2px down
    
    // DEBUG: Visual debugging boundaries
    if (debugMode) {
      // Draw button boundary in red
      this.renderer.drawLine({
        startEnd: [x, y, x + width, y],
        thickness: 2,
        color: [1, 0, 0, 1] // Red
      })
      this.renderer.drawLine({
        startEnd: [x, y + height, x + width, y + height],
        thickness: 2,
        color: [1, 0, 0, 1] // Red
      })
      this.renderer.drawLine({
        startEnd: [x, y, x, y + height],
        thickness: 2,
        color: [1, 0, 0, 1] // Red
      })
      this.renderer.drawLine({
        startEnd: [x + width, y, x + width, y + height],
        thickness: 2,
        color: [1, 0, 0, 1] // Red
      })
      
      // Draw text boundary in green
      this.renderer.drawLine({
        startEnd: [textX, textY - textHeight/2, textX + textWidth, textY - textHeight/2],
        thickness: 1,
        color: [0, 1, 0, 1] // Green
      })
      this.renderer.drawLine({
        startEnd: [textX, textY + textHeight/2, textX + textWidth, textY + textHeight/2],
        thickness: 1,
        color: [0, 1, 0, 1] // Green
      })
      this.renderer.drawLine({
        startEnd: [textX, textY - textHeight/2, textX, textY + textHeight/2],
        thickness: 1,
        color: [0, 1, 0, 1] // Green
      })
      this.renderer.drawLine({
        startEnd: [textX + textWidth, textY - textHeight/2, textX + textWidth, textY + textHeight/2],
        thickness: 1,
        color: [0, 1, 0, 1] // Green
      })
      
      // Draw center reference point in blue
      const centerX = x + width / 2
      const centerY = y + height / 2
      this.renderer.drawCircle({
        leftTopWidthHeight: [centerX - 2, centerY - 2, 4, 4],
        circleColor: [0, 0, 1, 1] // Blue
      })
      
      // Draw padding boundaries in magenta
      const [padX, padY] = style.padding
      this.renderer.drawLine({
        startEnd: [x + padX, y + padY, x + width - padX, y + padY],
        thickness: 1,
        color: [1, 0, 1, 1] // Magenta - top padding
      })
      this.renderer.drawLine({
        startEnd: [x + padX, y + height - padY, x + width - padX, y + height - padY],
        thickness: 1,
        color: [1, 0, 1, 1] // Magenta - bottom padding
      })
      this.renderer.drawLine({
        startEnd: [x + padX, y + padY, x + padX, y + height - padY],
        thickness: 1,
        color: [1, 0, 1, 1] // Magenta - left padding
      })
      this.renderer.drawLine({
        startEnd: [x + width - padX, y + padY, x + width - padX, y + height - padY],
        thickness: 1,
        color: [1, 0, 1, 1] // Magenta - right padding
      })
      
      // Draw text baseline in yellow
      this.renderer.drawLine({
        startEnd: [textX, textY, textX + textWidth, textY],
        thickness: 1,
        color: [1, 1, 0, 1] // Yellow
      })
      
      // Draw button center lines in cyan
      this.renderer.drawLine({
        startEnd: [x, centerY, x + width, centerY],
        thickness: 1,
        color: [0, 1, 1, 1] // Cyan - horizontal center line
      })
      this.renderer.drawLine({
        startEnd: [centerX, y, centerX, y + height],
        thickness: 1,
        color: [0, 1, 1, 1] // Cyan - vertical center line
      })
      
      // Draw available space boundaries in orange
      const availableWidth = width - (padX * 2)
      const availableHeight = height - (padY * 2)
      this.renderer.drawLine({
        startEnd: [x + padX, y + padY, x + padX + availableWidth, y + padY],
        thickness: 1,
        color: [1, 0.5, 0, 1] // Orange
      })
      this.renderer.drawLine({
        startEnd: [x + padX, y + padY + availableHeight, x + padX + availableWidth, y + padY + availableHeight],
        thickness: 1,
        color: [1, 0.5, 0, 1] // Orange
      })
      
      // Draw text positioning info
      this.renderer.drawRotatedText({
        font: this.config.font,
        xy: [x + 5, y + height + 15],
        str: `TW:${textWidth.toFixed(1)} TH:${textHeight.toFixed(1)} TX:${textX.toFixed(1)} TY:${textY.toFixed(1)}`,
        scale: 0.015,
        color: [1, 1, 1, 1]
      })
    }
    
    // Configure font outline based on style configuration
    if (this.config.font) {
      // Use enhanced outline configuration if provided, otherwise fall back to legacy properties
      if (style.textOutline) {
        this.config.font.setOutlineConfig({
          enabled: true,
          width: style.textOutline.width ?? 0.25,
          color: style.textOutline.color ?? [0.0, 0.0, 0.0, 1.0],
          style: style.textOutline.style ?? 'solid',
          softness: style.textOutline.softness ?? 0.15,
          offset: style.textOutline.offset ?? [0, 0]
        })
      } else if (style.textOutlineColor || style.textOutlineThickness) {
        // Legacy outline configuration for backward compatibility
        this.config.font.setOutlineConfig({
          enabled: true,
          width: (style.textOutlineThickness ?? 3) * 0.05, // Convert legacy thickness to width
          color: style.textOutlineColor ?? [0.0, 0.0, 0.0, 1.0],
          style: 'solid',
          softness: 0.15,
          offset: [0, 0]
        })
      } else {
        // Use font's default outline configuration or disable if not specified
        this.config.font.setOutlineConfig({
          enabled: false,
          width: 0,
          color: [0, 0, 0, 1],
          style: 'solid',
          softness: 0.1,
          offset: [0, 0]
        })
      }
    }
    
    this.renderer.drawRotatedText({
      font: this.config.font,
      xy: vec2.fromValues(textX, textY), // FIXED: Use exact calculated position without additional offsets
      str: this.config.text,
      color: style.textColor,
      scale: style.textScale ?? 0.025,
      rotation: 0,
      // Legacy parameters are now handled by font outline configuration
      outlineColor: style.textOutlineColor ?? [0.0, 0.0, 0.0, 1.0],
      outlineThickness: style.textOutlineThickness ?? 3
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