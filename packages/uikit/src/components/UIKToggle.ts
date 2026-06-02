import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color } from '../types'

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
  /** Checkmark/thumb color (used when unchecked, and as a base when checked
   *  if thumbCheckedColor is not provided). */
  thumbColor?: Color
  /** Optional thumb color when checked. If omitted, thumbColor is used in
   *  both states. Useful for monochrome themes where the puck needs to flip
   *  to stay visible against the on-state body fill. */
  thumbCheckedColor?: Color
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
  // Per-frame LINEAR step toward the target (not an exponential ease factor).
  // 0.5 finishes the puck slide in ~2 frames — a quick hint of motion rather
  // than the previous ~40-frame (~0.7s) exponential decay that read as laggy.
  private animationSpeed: number = 0.5
  
  // Default styling
  private defaultStyle: UIKToggleStyle = {
    uncheckedColor: [0.4, 0.4, 0.4, 1.0],
    checkedColor: [0.2, 0.7, 1.0, 1.0],
    borderColor: [0.7, 0.7, 0.7, 1.0],
    thumbColor: [1.0, 1.0, 1.0, 1.0],
    thumbCheckedColor: undefined,
    textColor: [1.0, 1.0, 1.0, 1.0],
    disabledColor: [0.5, 0.5, 0.5, 0.5],
    hoverColor: [0.3, 0.8, 1.0, 1.0],
    // Rim thickness in backing-buffer pixels. 3 gives a clearly visible
    // high-contrast capsule rim (consistent with the slider/colormap/button/
    // view-mode rims). The rounded-rect shader straddles the edge, so only
    // ~1.5px paints inward — the puck inset keeps clear of it.
    borderThickness: 3,
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
   * Update some or all of the toggle's style colors at runtime. Useful for
   * themed UIs (e.g. flipping a page from a dark to a light palette) without
   * recreating the component or its WebGL context.
   */
  public setColors(partial: Partial<UIKToggleStyle>): void {
    this.config.style = { ...(this.config.style ?? {}), ...partial }
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

      // The cursor left the canvas entirely: no more mousemove events will
      // arrive to clear the hover, so reset here. Without this the toggle
      // stays stuck in its hover appearance, and moving across several toggles
      // leaves each one looking hovered simultaneously.
      case 'mouseleave':
      case 'mouseout':
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
    // Linear step toward the target; snap once within one step so it settles
    // in a couple of frames instead of an exponential tail.
    const diff = this.targetProgress - this.animationProgress
    if (Math.abs(diff) <= this.animationSpeed) {
      this.animationProgress = this.targetProgress
    } else {
      this.animationProgress += Math.sign(diff) * this.animationSpeed
    }
  }

  /**
   * Get the bounds of just the toggle element (not including label).
   *
   * Sizes scale with `bounds` directly; the previous hard caps
   * (48 px / 20 px / 18 px) referred to canvas-backing pixels and, after
   * device-pixel-ratio scaling on a 2x display, the pill stayed at those
   * backing-pixel sizes while bounds doubled — so the visible widget
   * halved. Proportional sizing keeps the visible widget identical
   * whether the host page DPR-scales the canvas or not.
   */
  private getToggleBounds(): Vec4 {
    const [x, y, width, height] = this.config.bounds

    if (this.config.type === 'switch') {
      const toggleWidth = width * 0.9
      // Fill more of the canvas height so the capsule reads as tall as the
      // other controls (less dead vertical padding inside the toggle row).
      const toggleHeight = height * 0.82
      return [x + (width - toggleWidth) / 2, y + (height - toggleHeight) / 2, toggleWidth, toggleHeight]
    } else {
      const size = Math.min(width * 0.7, height * 0.9)
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
    const thumbOff = style.thumbColor!
    const thumbOn = style.thumbCheckedColor ?? style.thumbColor!
    let thumbColor = this.config.checked ? thumbOn : thumbOff
    let textColor = style.textColor!

    if (this.state === UIKToggleState.DISABLED) {
      // Preserve the on/off visual structure (capsule + puck) but render
      // every layer at the disabled alpha so the toggle reads as a ghosted
      // version of itself. Replacing every color with one flat disabledColor
      // (as the previous code did) collapsed the puck into the body and
      // hid the on/off position.
      const disabled = style.disabledColor!
      const disabledAlpha = disabled[3] ?? 0.4
      const fade = (c: Color): Color => [c[0], c[1], c[2], c[3] * disabledAlpha]
      // Wash out the capsule fill and label, but keep two layers at full
      // opacity so the disabled toggle stays readable with low-but-nonzero
      // contrast (rather than collapsing into a flat blob):
      //  - the capsule rim (borderColor) — preserves the shape / on a light
      //    background a faded rim washes out and the control disappears;
      //  - the puck (thumbColor) — a semi-transparent puck blends into the
      //    washed capsule and the on/off position becomes invisible, so it
      //    stays opaque and sits clearly on the faded capsule.
      backgroundColor = fade(backgroundColor)
      textColor = fade(textColor)
    } else if (this.state === UIKToggleState.HOVER || this.state === UIKToggleState.ACTIVE) {
      if (this.config.checked) {
        backgroundColor = style.hoverColor!
      }
      borderColor = style.hoverColor!
    }

    // Interpolate colors based on animation progress. Skip when disabled —
    // otherwise toggling enabled→disabled mid-animation would overwrite the
    // washed-out disabled colors with full-opacity active colors, so the
    // control would render as enabled until the animation settles.
    if (this.state !== UIKToggleState.DISABLED &&
        this.animationProgress > 0 && this.animationProgress < 1) {
      backgroundColor = this.interpolateColor(style.uncheckedColor!, style.checkedColor!, this.animationProgress)
      thumbColor = this.interpolateColor(thumbOff, thumbOn, this.animationProgress)
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
    
    // Draw thumb (circle that slides). Inset the puck from the capsule edge
    // so the high-contrast rim has clear space around it rather than the puck
    // crowding the outline (which previously left "very little space for the
    // outline around the circle" on small toggles).
    const PUCK_INSET = 4
    // Guard against a negative radius on very short bounds (toggleHeight < 8),
    // which would send negative width/height to drawCircle.
    const thumbRadius = Math.max(1, (toggleHeight - 2 * PUCK_INSET) / 2)
    const thumbTravel = toggleWidth - toggleHeight
    const thumbX = toggleX + thumbRadius + PUCK_INSET + (thumbTravel * this.animationProgress)
    const thumbY = toggleY + toggleHeight / 2
    
    this.renderer.drawCircle({
      leftTopWidthHeight: [thumbX - thumbRadius, thumbY - thumbRadius,
                          thumbRadius * 2, thumbRadius * 2],
      circleColor: thumbColor,
      fillPercent: 1.0
    })

    // High-contrast rim around the puck — matches the slider thumb and the
    // colormap indicator ring. Without it a puck that shares the page color
    // (e.g. a white puck on a light background) has almost no contrast against
    // a washed/light capsule; the rim makes the puck position read clearly in
    // every state and theme. borderColor stays full-contrast when disabled.
    //
    // fillPercent * ringRadius is the rim thickness in pixels, so a fixed
    // fraction would scale the rim with the puck — and the toggle puck is far
    // larger than the slider/colormap pucks, making its rim look too bold.
    // Derive fillPercent from a fixed ~2 px target instead so the rim matches
    // the slim rim on those smaller pucks regardless of puck size; cap at 0.2
    // so a small (low-DPR) puck is never bolder than the proportional rim.
    const RIM_PX = 2
    const ringRadius = thumbRadius + 1
    this.renderer.drawCircle({
      leftTopWidthHeight: [thumbX - ringRadius, thumbY - ringRadius,
                          ringRadius * 2, ringRadius * 2],
      circleColor: borderColor,
      fillPercent: Math.min(0.2, RIM_PX / ringRadius)
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
   * Draw an anti-aliased rounded rectangle via the SDF rounded-rect shader.
   * For switch-style toggles, the caller passes radius = height/2 to get a
   * pill shape. For checkboxes, a small fixed radius gives the rounded-square
   * look.
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number,
                         radius: number, fillColor: Color, borderColor: Color): void {
    const borderThickness = this.config.style!.borderThickness!
    this.renderer.drawRoundedRect({
      bounds: [x, y, width, height],
      fillColor,
      outlineColor: borderColor,
      cornerRadius: radius,
      thickness: borderThickness
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