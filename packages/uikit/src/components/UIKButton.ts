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
    padding: [12, 8]
  },
  [UIKButtonState.HOVER]: {
    backgroundColor: [0.35, 0.35, 0.35, 1.0],
    borderColor: [0.7, 0.7, 0.7, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 1,
    borderRadius: 2,
    padding: [12, 8]
  },
  [UIKButtonState.ACTIVE]: {
    backgroundColor: [0.15, 0.15, 0.15, 1.0],
    borderColor: [0.8, 0.8, 0.8, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    borderWidth: 2,
    borderRadius: 2,
    padding: [12, 8]
  },
  [UIKButtonState.DISABLED]: {
    backgroundColor: [0.1, 0.1, 0.1, 0.5],
    borderColor: [0.2, 0.2, 0.2, 0.5],
    textColor: [0.5, 0.5, 0.5, 0.5],
    borderWidth: 1,
    borderRadius: 2,
    padding: [12, 8]
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

    // Body: one anti-aliased rounded-rect call. Replaces the earlier
    // shadow + per-row gradient + multi-pass border + corner stubs +
    // highlight stripes pipeline, which was both visually noisy and
    // prone to overdraw bugs (text getting hidden under late effect
    // passes). The renderer's SDF rect already handles AA corners and
    // the optional border via thickness/outlineColor.
    //
    // Clamp the corner radius to half the smaller dimension so callers
    // can pass a huge value (or just `Infinity`) to opt into a pure
    // capsule shape without computing the exact radius themselves.
    const maxRadius = Math.min(bounds[2], bounds[3]) / 2
    const radius = Math.min(style.borderRadius ?? 2, maxRadius)
    const borderWidth = (style.borderWidth ?? 0) > 0 ? style.borderWidth : 0
    this.renderer.drawRoundedRect({
      bounds,
      fillColor: style.backgroundColor,
      outlineColor: borderWidth > 0 ? style.borderColor : style.backgroundColor,
      cornerRadius: radius,
      thickness: borderWidth
    })

    // Text last so it always sits on top, regardless of body color.
    if (this.config.text && this.config.font) {
      this.renderText(style)
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
      shadowOffset: userStyle.shadowOffset
    }
  }

  /**
   * Render button text centered within bounds.
   *
   * The MSDF font ships at a large native em size (~32 px). Scale 1.0
   * placed the baseline at the button's lower edge and pushed glyphs
   * off the top, leaving only descender stubs visible — the cause of
   * "buttons render but no text" bug reports. The scale below targets
   * roughly 40% of the button height so a typical 35-px button shows
   * comfortably-sized text well within bounds.
   */
  private renderText(style: UIKButtonStyle): void {
    if (!this.config.font) return

    const [x, y, width, height] = this.config.bounds

    // Target ~40% of the button height for the em size, but never below the
    // crisp-MSDF device-pixel floor (see MIN_TEXT_DEVICE_PX). The 0.45 cap
    // matches the view-mode and colormap selectors so all label text reads at
    // a consistent size and stays sharp on standard-resolution monitors.
    const scale = this.config.font.fitTextScale(height, 0.4, 0.45)
    const textWidth = this.config.font.getTextWidth(this.config.text, scale)
    const textHeight = this.config.font.getTextHeight(this.config.text, scale)

    // Center horizontally; bias baseline a quarter-textHeight below
    // vertical center so the visual x-height sits in the middle.
    const textX = x + (width - textWidth) / 2
    const textY = y + height / 2 + textHeight * 0.25

    this.renderer.drawRotatedText({
      font: this.config.font,
      xy: vec2.fromValues(textX, textY),
      str: this.config.text,
      color: style.textColor,
      scale,
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

  /**
   * Merge a partial style record into the button's user-supplied style.
   * Useful for themed UIs that want to update colors at runtime without
   * recreating the button or its WebGL context.
   */
  public setStyle(partial: Partial<UIKButtonStyle>): void {
    this.config.style = { ...(this.config.style ?? {}), ...partial } as UIKButtonStyle
  }
}