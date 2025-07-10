import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color, Vec2 } from '../types'

/**
 * Configuration interface for UIKSlider component
 */
export interface UIKSliderConfig {
  /** Bounding rectangle [x, y, width, height] */
  bounds: Vec4
  /** Current slider value */
  value: number
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Label text to display */
  label?: string
  /** Font for text rendering */
  font?: UIKFont
  /** Whether to show current value */
  showValue?: boolean
  /** Custom value formatter */
  valueFormat?: (value: number) => string
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
  /** Step size for value increments */
  step?: number
  /** Label offset from slider position (default: -75) */
  labelOffset?: number
  /** Value text offset from slider position (default: 8) */
  valueOffset?: number
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
  /** Text scale for labels and values */
  textScale?: number
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
  private dragOffset: number = 0
  
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
    thumbSize: 16,
    textScale: 0.025
  }

  constructor(renderer: UIKRenderer, config: UIKSliderConfig) {
    this.renderer = renderer
    this.config = {
      enabled: true,
      showValue: true,
      step: 0.01,
      labelOffset: -75,
      valueOffset: 8,
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
    
    // Clamp value to range
    value = Math.max(min, Math.min(max, value))
    
    // Apply step if specified
    if (this.config.step) {
      value = Math.round(value / this.config.step) * this.config.step
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
    }

    return false
  }

  /**
   * Start dragging operation
   */
  private startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true
    this.state = UIKSliderState.DRAGGING
    
    const [x, y, width, height] = this.config.bounds
    const isHorizontal = this.config.orientation === 'horizontal'
    
    if (isHorizontal) {
      this.dragOffset = mouseX - x
    } else {
      this.dragOffset = mouseY - y
    }
    
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
    
    if (isHorizontal) {
      const trackWidth = width - this.config.style!.thumbSize!
      const relativeX = mouseX - x - (this.config.style!.thumbSize! / 2)
      normalizedValue = Math.max(0, Math.min(1, relativeX / trackWidth))
    } else {
      const trackHeight = height - this.config.style!.thumbSize!
      const relativeY = mouseY - y - (this.config.style!.thumbSize! / 2)
      normalizedValue = 1 - Math.max(0, Math.min(1, relativeY / trackHeight))
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
      fillColor = style.hoverColor!
      thumbColor = style.hoverColor!
    }

    // Calculate value position
    const min = this.config.min!
    const max = this.config.max!
    const normalizedValue = (this.config.value - min) / (max - min)
    
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
    
    // Calculate positions
    const trackStart = x + thumbRadius
    const trackEnd = x + width - thumbRadius
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
        // Position label to the left of the slider track with better spacing
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + this.config.labelOffset!, y + height / 2 + 1], // Align with slider track center
          str: this.config.label,
          color: textColor,
          scale: style.textScale!
        })
      }
      
      if (this.config.showValue) {
        const valueText = this.config.valueFormat!(this.config.value)
        // Position value to the right of the slider track
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + width + this.config.valueOffset!, y + height / 2 + 1], // Align with slider track center
          str: valueText,
          color: textColor,
          scale: style.textScale!
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
    
    // Calculate positions
    const trackStart = y + thumbRadius
    const trackEnd = y + height - thumbRadius
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
          xy: [x + width + 10, y - 15],
          str: this.config.label,
          color: textColor,
          scale: style.textScale!,
          rotation: Math.PI / 2
        })
      }
      
      if (this.config.showValue) {
        const valueText = this.config.valueFormat!(this.config.value)
        this.renderer.drawRotatedText({
          font: this.config.font,
          xy: [x + width + 10, y + height + 15],
          str: valueText,
          color: textColor,
          scale: style.textScale!
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