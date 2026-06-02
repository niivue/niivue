import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color } from '../types'

/**
 * Configuration interface for UIKSlider component
 */
export interface UIKSliderConfig {
  /** Bounding rectangle [x, y, width, height] */
  bounds: Vec4
  /** Current value (0.0 to 1.0) */
  value: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step size for discrete values */
  step?: number
  /** Label text to display */
  label?: string
  /** Font for text rendering */
  font?: UIKFont
  /** Callback when value changes */
  onValueChange?: (value: number) => void
  /** Callback when dragging starts */
  onDragStart?: () => void
  /** Callback when dragging ends */
  onDragEnd?: () => void
  /** Visual styling options */
  style?: UIKSliderStyle
  /** Whether slider is enabled */
  enabled?: boolean
  /** Whether to show value text */
  showValue?: boolean
  /** Number format for value display */
  valueFormat?: (value: number) => string
  /** Orientation: 'horizontal' or 'vertical' */
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Visual styling options for UIKSlider
 */
export interface UIKSliderStyle {
  /** Track background color */
  trackColor?: Color
  /** Track fill color (progress) */
  fillColor?: Color
  /** Thumb (handle) color */
  thumbColor?: Color
  /** Thumb border color */
  thumbBorderColor?: Color
  /** Text color for label and value */
  textColor?: Color
  /** Disabled state colors */
  disabledColor?: Color
  /** Hover state colors */
  hoverColor?: Color
  /** Track thickness */
  trackThickness?: number
  /** Thumb size */
  thumbSize?: number
}

/**
 * Slider interaction states
 */
export enum UIKSliderState {
  NORMAL = 'normal',
  HOVER = 'hover',
  DRAGGING = 'dragging',
  DISABLED = 'disabled'
}

/**
 * UIKSlider - Interactive slider component for parameter adjustment
 * Perfect for medical imaging controls like brightness, contrast, zoom
 */
export class UIKSlider {
  private renderer: UIKRenderer
  private config: UIKSliderConfig
  private state: UIKSliderState = UIKSliderState.NORMAL
  private isDragging: boolean = false
  
  // Default styling
  private defaultStyle: UIKSliderStyle = {
    trackColor: [0.3, 0.3, 0.3, 1.0],
    fillColor: [0.2, 0.6, 1.0, 1.0],
    thumbColor: [1.0, 1.0, 1.0, 1.0],
    thumbBorderColor: [0.2, 0.6, 1.0, 1.0],
    textColor: [1.0, 1.0, 1.0, 1.0],
    disabledColor: [0.5, 0.5, 0.5, 0.5],
    hoverColor: [0.3, 0.7, 1.0, 1.0],
    trackThickness: 6,
    thumbSize: 16
  }

  constructor(renderer: UIKRenderer, config: UIKSliderConfig) {
    this.renderer = renderer
    this.config = {
      min: 0,
      max: 1,
      step: 0.01,
      enabled: true,
      showValue: true,
      orientation: 'horizontal',
      valueFormat: (value: number) => value.toFixed(2),
      ...config
    }
    
    // Merge styles
    this.config.style = { ...this.defaultStyle, ...config.style }
    
    // Clamp initial value
    this.setValue(this.config.value)
  }

  /**
   * Set the slider value
   */
  public setValue(value: number): void {
    const min = this.config.min!
    const max = this.config.max!

    // Coerce NaN/Infinity (including a non-finite initial config.value from
    // construction) to the minimum rather than letting it reach config.value
    // and the change callback.
    if (!Number.isFinite(value)) {
      value = min
    }

    // Clamp value to range
    value = Math.max(min, Math.min(max, value))

    // Apply step if specified, then re-clamp: rounding can push the value back
    // outside [min, max] (e.g. min=0.05, max=0.95, step=0.5 → 1.0).
    if (this.config.step) {
      value = Math.round(value / this.config.step) * this.config.step
      value = Math.max(min, Math.min(max, value))
    }

    this.config.value = value
  }

  /**
   * Get the current slider value
   */
  public getValue(): number {
    return this.config.value
  }

  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.state = enabled ? UIKSliderState.NORMAL : UIKSliderState.DISABLED
  }

  /**
   * Update some or all of the slider's style colors at runtime. Useful for
   * themed UIs (e.g. flipping a page from a dark to a light palette) without
   * recreating the component or its WebGL context.
   */
  public setColors(partial: Partial<UIKSliderStyle>): void {
    this.config.style = { ...(this.config.style ?? {}), ...partial }
  }

  /**
   * Handle mouse/touch events
   */
  public handleMouseEvent(event: MouseEvent): boolean {
    if (!this.config.enabled) return false

    const [x, y, width, height] = this.config.bounds
    const mouseX = event.offsetX
    const mouseY = event.offsetY

    // Check if mouse is over slider
    const isOver = mouseX >= x && mouseX <= x + width && 
                   mouseY >= y && mouseY <= y + height

    switch (event.type) {
      case 'mousedown':
        if (isOver) {
          this.startDrag(mouseX, mouseY)
          return true
        }
        break

      case 'mousemove':
        if (this.isDragging) {
          this.updateDrag(mouseX, mouseY)
          return true
        } else if (isOver) {
          this.state = UIKSliderState.HOVER
          return true
        } else {
          this.state = UIKSliderState.NORMAL
        }
        break

      case 'mouseup':
        if (this.isDragging) {
          this.endDrag()
          return true
        }
        break

      // Cursor left the canvas: clear the hover highlight (no further
      // mousemove events arrive to do it). Leave an in-progress drag alone.
      case 'mouseleave':
      case 'mouseout':
        if (!this.isDragging) {
          this.state = UIKSliderState.NORMAL
        }
        break
    }

    return false
  }

  /**
   * Start dragging operation
   */
  private startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true
    this.state = UIKSliderState.DRAGGING

    this.updateValueFromPosition(mouseX, mouseY)
    
    if (this.config.onDragStart) {
      this.config.onDragStart()
    }
  }

  /**
   * Update drag operation
   */
  private updateDrag(mouseX: number, mouseY: number): void {
    this.updateValueFromPosition(mouseX, mouseY)
  }

  /**
   * End dragging operation
   */
  private endDrag(): void {
    this.isDragging = false
    this.state = UIKSliderState.NORMAL
    
    if (this.config.onDragEnd) {
      this.config.onDragEnd()
    }
  }

  /**
   * Update value based on mouse position
   */
  private updateValueFromPosition(mouseX: number, mouseY: number): void {
    const [x, y, width, height] = this.config.bounds
    const isHorizontal = this.config.orientation === 'horizontal'
    const min = this.config.min!
    const max = this.config.max!
    
    let normalizedValue: number
    // 2 * 1px = both endpoints inset by the thumb's outline overshoot, so
    // the hit math matches the rendered track positions exactly.
    const thumbExtent = this.config.style!.thumbSize! + 2

    if (isHorizontal) {
      const trackWidth = width - thumbExtent
      // Degenerate bounds (track <= 0) would divide by zero → NaN; treat a
      // collapsed track as "at minimum" rather than poisoning the value.
      const relativeX = mouseX - x - (thumbExtent / 2)
      normalizedValue = trackWidth > 0 ? Math.max(0, Math.min(1, relativeX / trackWidth)) : 0
    } else {
      const trackHeight = height - thumbExtent
      const relativeY = mouseY - y - (thumbExtent / 2)
      normalizedValue = trackHeight > 0 ? 1 - Math.max(0, Math.min(1, relativeY / trackHeight)) : 1
    }
    
    const newValue = min + normalizedValue * (max - min)
    const oldValue = this.config.value
    
    this.setValue(newValue)
    
    // Trigger callback if value changed
    if (this.config.value !== oldValue && this.config.onValueChange) {
      this.config.onValueChange(this.config.value)
    }
  }

  /**
   * Draw a circular thumb (perfect round design)
   */
  private drawCircularThumb(centerX: number, centerY: number, radius: number, 
                           thumbColor: Color, borderColor: Color): void {
    // Draw main circular thumb (perfect circle with equal width and height)
    const diameter = radius * 2
    this.renderer.drawCircle({
      leftTopWidthHeight: [centerX - radius, centerY - radius, diameter, diameter],
      circleColor: thumbColor,
      fillPercent: 1.0
    })
    
    // Draw border circle (slightly larger)
    const borderRadius = radius + 1
    const borderDiameter = borderRadius * 2
    this.renderer.drawCircle({
      leftTopWidthHeight: [centerX - borderRadius, centerY - borderRadius, borderDiameter, borderDiameter],
      circleColor: borderColor,
      fillPercent: 0.2 // Just the border
    })
  }

  /**
   * Render the slider component
   */
  public render(): void {
    const [x, y, width, height] = this.config.bounds
    const style = this.config.style!
    const isHorizontal = this.config.orientation === 'horizontal'
    
    // Calculate colors based on state
    let trackColor = style.trackColor!
    let fillColor = style.fillColor!
    let thumbColor = style.thumbColor!
    let textColor = style.textColor!
    
    if (this.state === UIKSliderState.DISABLED) {
      trackColor = style.disabledColor!
      fillColor = style.disabledColor!
      thumbColor = style.disabledColor!
      textColor = style.disabledColor!
    } else if (this.state === UIKSliderState.HOVER || this.state === UIKSliderState.DRAGGING) {
      // Only tint the fill on interaction. Keeping the thumb color steady
      // avoids the "thumb flashes white" z-order surprise: the thumb identity
      // shouldn't change just because the cursor is over it.
      fillColor = style.hoverColor!
    }

    // Calculate value position. Guard a degenerate range (max === min) which
    // would divide by zero and feed NaN into the thumb/fill geometry.
    const min = this.config.min!
    const max = this.config.max!
    const range = max - min
    const normalizedValue = range > 0 ? (this.config.value - min) / range : 0
    
    if (isHorizontal) {
      this.renderHorizontalSlider(x, y, width, height, normalizedValue, 
                                  trackColor, fillColor, thumbColor, textColor)
    } else {
      this.renderVerticalSlider(x, y, width, height, normalizedValue,
                               trackColor, fillColor, thumbColor, textColor)
    }
  }

  /**
   * Render horizontal slider with circular thumbs
   */
  private renderHorizontalSlider(x: number, y: number, width: number, height: number,
                                normalizedValue: number, trackColor: Color, fillColor: Color,
                                thumbColor: Color, textColor: Color): void {
    const style = this.config.style!
    const trackThickness = style.trackThickness!
    const thumbRadius = style.thumbSize! * 0.5
    // drawCircularThumb draws a border ring at (radius + 1), so the visible
    // thumb extends 1 pixel beyond the disc radius. Inset the track endpoints
    // by that overshoot so the outline isn't clipped at min/max value.
    const THUMB_BORDER_EXTRA = 1
    const thumbExtent = thumbRadius + THUMB_BORDER_EXTRA

    // Calculate positions
    const trackStart = x + thumbExtent
    const trackEnd = x + width - thumbExtent
    const trackWidth = trackEnd - trackStart
    const centerY = y + height / 2
    
    // Calculate thumb position based on value
    const thumbCenterX = trackStart + normalizedValue * trackWidth
    
    // Draw track background
    this.renderer.drawLine({
      startEnd: [trackStart, centerY, trackEnd, centerY],
      thickness: trackThickness,
      color: trackColor
    })
    
    // Draw filled portion
    if (normalizedValue > 0) {
      this.renderer.drawLine({
        startEnd: [trackStart, centerY, thumbCenterX, centerY],
        thickness: trackThickness,
        color: fillColor
      })
    }
    
    // Draw perfect circular thumb
    this.drawCircularThumb(thumbCenterX, centerY, thumbRadius, thumbColor, style.thumbBorderColor!)
    
    // Draw label and value
    if (this.config.font) {
      if (this.config.label) {
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x, y - 20],
          str: this.config.label,
          color: textColor,
          scale: 0.8
        })
      }
      
      if (this.config.showValue) {
        const valueText = this.config.valueFormat!(this.config.value)
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + width - 50, y - 20],
          str: valueText,
          color: textColor,
          scale: 0.8
        })
      }
    }
  }

  /**
   * Render vertical slider with circular thumbs
   */
  private renderVerticalSlider(x: number, y: number, width: number, height: number,
                              normalizedValue: number, trackColor: Color, fillColor: Color,
                              thumbColor: Color, textColor: Color): void {
    const style = this.config.style!
    const trackThickness = style.trackThickness!
    const thumbRadius = style.thumbSize! * 0.5
    const THUMB_BORDER_EXTRA = 1
    const thumbExtent = thumbRadius + THUMB_BORDER_EXTRA

    // Calculate positions
    const trackStart = y + thumbExtent
    const trackEnd = y + height - thumbExtent
    const trackHeight = trackEnd - trackStart
    const centerX = x + width / 2
    
    // Calculate thumb position based on value (inverted for vertical)
    const thumbCenterY = trackEnd - normalizedValue * trackHeight // Inverted
    
    // Draw track background
    this.renderer.drawLine({
      startEnd: [centerX, trackStart, centerX, trackEnd],
      thickness: trackThickness,
      color: trackColor
    })
    
    // Draw filled portion
    if (normalizedValue > 0) {
      this.renderer.drawLine({
        startEnd: [centerX, thumbCenterY, centerX, trackEnd],
        thickness: trackThickness,
        color: fillColor
      })
    }
    
    // Draw perfect circular thumb
    this.drawCircularThumb(centerX, thumbCenterY, thumbRadius, thumbColor, style.thumbBorderColor!)
    
    // Draw label and value
    if (this.config.font) {
      if (this.config.label) {
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + width + 10, y],
          str: this.config.label,
          color: textColor,
          scale: 0.8,
          rotation: Math.PI / 2
        })
      }
      
      if (this.config.showValue) {
        const valueText = this.config.valueFormat!(this.config.value)
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + width + 10, y + height - 20],
          str: valueText,
          color: textColor,
          scale: 0.8
        })
      }
    }
  }

  /**
   * Get the bounding rectangle for hit testing
   */
  public getBounds(): Vec4 {
    return this.config.bounds
  }

  /**
   * Update the slider bounds (for responsive layouts)
   */
  public setBounds(bounds: Vec4): void {
    this.config.bounds = bounds
  }
} 