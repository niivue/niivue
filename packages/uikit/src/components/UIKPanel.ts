import { UIKRenderer } from '../uikrenderer'
import { UIKFont } from '../assets/uikfont'
import { Vec4, Color, Vec2 } from '../types'

/**
 * Configuration interface for UIKPanel component
 */
export interface UIKPanelConfig {
  /** Bounding rectangle [x, y, width, height] */
  bounds: Vec4
  /** Panel title */
  title?: string
  /** Font for text rendering */
  font?: UIKFont
  /** Visual styling options */
  style?: UIKPanelStyle
  /** Whether panel is visible */
  visible?: boolean
  /** Whether panel can be collapsed */
  collapsible?: boolean
  /** Whether panel is currently collapsed */
  collapsed?: boolean
  /** Callback when panel is collapsed/expanded */
  onToggleCollapse?: (collapsed: boolean) => void
  /** Padding inside the panel [top, right, bottom, left] */
  padding?: [number, number, number, number]
  /** Layout direction for child components */
  layout?: 'vertical' | 'horizontal' | 'grid'
  /** Spacing between child components */
  spacing?: number
  /** Title bar height (configurable) */
  titleBarHeight?: number
  /** Animation speed for collapse/expand */
  animationSpeed?: number
}

/**
 * Visual styling options for UIKPanel
 */
export interface UIKPanelStyle {
  /** Background color */
  backgroundColor?: Color
  /** Border color */
  borderColor?: Color
  /** Title bar color */
  titleBarColor?: Color
  /** Text color for title */
  titleTextColor?: Color
  /** Border thickness */
  borderThickness?: number
  /** Corner radius for rounded appearance */
  cornerRadius?: number
  /** Shadow color and intensity */
  shadowColor?: Color
  /** Shadow offset [x, y] */
  shadowOffset?: [number, number]
  /** Background opacity */
  backgroundOpacity?: number
  /** Text scaling factor for title */
  titleTextScale?: number
  /** Title text padding from left edge */
  titleTextPadding?: number
  /** Title text vertical offset */
  titleTextVerticalOffset?: number
}

/**
 * Panel interaction states
 */
export enum UIKPanelState {
  NORMAL = 'normal',
  HOVER = 'hover',
  ACTIVE = 'active'
}

/**
 * Child component information for layout management
 */
export interface UIKPanelChild {
  /** Component bounds relative to panel */
  bounds: Vec4
  /** Component render function */
  render: () => void
  /** Component ID for management */
  id?: string
  /** Whether component is visible */
  visible?: boolean
}

/**
 * UIKPanel - Container component for organizing medical imaging controls
 * Provides layout management, styling, and grouping functionality
 */
export class UIKPanel {
  private renderer: UIKRenderer
  private config: UIKPanelConfig
  private state: UIKPanelState = UIKPanelState.NORMAL
  private children: UIKPanelChild[] = []
  private titleBarHeight: number
  private animationProgress: number = 1 // 1 = expanded, 0 = collapsed
  private targetProgress: number = 1
  private animationSpeed: number
  
  // Default styling
  private defaultStyle: UIKPanelStyle = {
    backgroundColor: [0.15, 0.15, 0.2, 0.9],
    borderColor: [0.3, 0.3, 0.4, 1.0],
    titleBarColor: [0.2, 0.2, 0.3, 1.0],
    titleTextColor: [1.0, 1.0, 1.0, 1.0],
    borderThickness: 1,
    cornerRadius: 6,
    shadowColor: [0.0, 0.0, 0.0, 0.3],
    shadowOffset: [2, 2],
    backgroundOpacity: 0.9,
    titleTextScale: 0.025,
    titleTextPadding: 10,
    titleTextVerticalOffset: -6
  }

  constructor(renderer: UIKRenderer, config: UIKPanelConfig) {
    this.renderer = renderer
    this.config = {
      visible: true,
      collapsible: false,
      collapsed: false,
      padding: [10, 10, 10, 10],
      layout: 'vertical',
      spacing: 8,
      titleBarHeight: 30, // Default to 30
      animationSpeed: 0.2, // Default to 0.2
      ...config
    }
    
    // Merge styles
    this.config.style = { ...this.defaultStyle, ...config.style }
    
    // Initialize animation state
    this.targetProgress = this.config.collapsed ? 0 : 1
    this.animationProgress = this.targetProgress
    this.titleBarHeight = this.config.titleBarHeight!
    this.animationSpeed = this.config.animationSpeed!
  }

  /**
   * Add a child component to the panel
   */
  public addChild(child: UIKPanelChild): void {
    this.children.push(child)
    this.updateLayout()
  }

  /**
   * Remove a child component from the panel
   */
  public removeChild(id: string): void {
    this.children = this.children.filter(child => child.id !== id)
    this.updateLayout()
  }

  /**
   * Clear all child components
   */
  public clearChildren(): void {
    this.children = []
  }

  /**
   * Set panel visibility
   */
  public setVisible(visible: boolean): void {
    this.config.visible = visible
  }

  /**
   * Get panel visibility
   */
  public isVisible(): boolean {
    return this.config.visible!
  }

  /**
   * Set collapsed state
   */
  public setCollapsed(collapsed: boolean): void {
    if (this.config.collapsible && this.config.collapsed !== collapsed) {
      this.config.collapsed = collapsed
      this.targetProgress = collapsed ? 0 : 1
      
      if (this.config.onToggleCollapse) {
        this.config.onToggleCollapse(collapsed)
      }
    }
  }

  /**
   * Get collapsed state
   */
  public isCollapsed(): boolean {
    return this.config.collapsed!
  }

  /**
   * Handle mouse/touch events
   */
  public handleMouseEvent(event: MouseEvent): boolean {
    if (!this.config.visible) return false

    const [x, y, width, height] = this.config.bounds
    const mouseX = event.offsetX
    const mouseY = event.offsetY

    // Check if mouse is over panel
    const isOver = mouseX >= x && mouseX <= x + width && 
                   mouseY >= y && mouseY <= y + height

    // Check if mouse is over title bar (for collapsible panels)
    const titleBarBounds = this.getTitleBarBounds()
    const isOverTitleBar = this.config.collapsible && titleBarBounds &&
                          mouseX >= titleBarBounds[0] && mouseX <= titleBarBounds[0] + titleBarBounds[2] &&
                          mouseY >= titleBarBounds[1] && mouseY <= titleBarBounds[1] + titleBarBounds[3]

    switch (event.type) {
      case 'mousedown':
        if (isOverTitleBar) {
          this.state = UIKPanelState.ACTIVE
          return true
        }
        break

      case 'mousemove':
        if (isOverTitleBar) {
          this.state = UIKPanelState.HOVER
          return true
        } else if (isOver) {
          this.state = UIKPanelState.NORMAL
          return true
        }
        break

      case 'mouseup':
        if (isOverTitleBar && this.state === UIKPanelState.ACTIVE) {
          this.setCollapsed(!this.config.collapsed)
          this.state = UIKPanelState.HOVER
          return true
        }
        this.state = UIKPanelState.NORMAL
        break
    }

    return isOver
  }

  /**
   * Update animation
   */
  public update(): void {
    // Smooth animation for collapse/expand
    const diff = this.targetProgress - this.animationProgress
    if (Math.abs(diff) > 0.001) {
      this.animationProgress += diff * this.animationSpeed
    } else {
      this.animationProgress = this.targetProgress
    }
  }

  /**
   * Get title bar bounds if panel has a title
   */
  private getTitleBarBounds(): Vec4 | null {
    if (!this.config.title) return null
    
    const [x, y, width] = this.config.bounds
    return [x, y, width, this.titleBarHeight]
  }

  /**
   * Get content area bounds (excluding title bar)
   */
  private getContentBounds(): Vec4 {
    const [x, y, width, height] = this.config.bounds
    const titleOffset = this.config.title ? this.titleBarHeight : 0
    const contentHeight = (height - titleOffset) * this.animationProgress
    
    return [x, y + titleOffset, width, contentHeight]
  }

  /**
   * Update layout of child components
   */
  private updateLayout(): void {
    if (this.children.length === 0) return

    const contentBounds = this.getContentBounds()
    const [contentX, contentY, contentWidth, contentHeight] = contentBounds
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = this.config.padding!
    
    const availableX = contentX + paddingLeft
    const availableY = contentY + paddingTop
    const availableWidth = contentWidth - paddingLeft - paddingRight
    const availableHeight = contentHeight - paddingTop - paddingBottom
    
    const spacing = this.config.spacing!
    const visibleChildren = this.children.filter(child => child.visible !== false)
    
    if (this.config.layout === 'vertical') {
      this.layoutVertical(availableX, availableY, availableWidth, availableHeight, spacing, visibleChildren)
    } else if (this.config.layout === 'horizontal') {
      this.layoutHorizontal(availableX, availableY, availableWidth, availableHeight, spacing, visibleChildren)
    } else if (this.config.layout === 'grid') {
      this.layoutGrid(availableX, availableY, availableWidth, availableHeight, spacing, visibleChildren)
    }
  }

  /**
   * Layout children vertically
   */
  private layoutVertical(x: number, y: number, width: number, height: number, 
                        spacing: number, children: UIKPanelChild[]): void {
    const childHeight = (height - (children.length - 1) * spacing) / children.length
    
    children.forEach((child, index) => {
      const childY = y + index * (childHeight + spacing)
      child.bounds = [x, childY, width, childHeight]
    })
  }

  /**
   * Layout children horizontally
   */
  private layoutHorizontal(x: number, y: number, width: number, height: number,
                          spacing: number, children: UIKPanelChild[]): void {
    const childWidth = (width - (children.length - 1) * spacing) / children.length
    
    children.forEach((child, index) => {
      const childX = x + index * (childWidth + spacing)
      child.bounds = [childX, y, childWidth, height]
    })
  }

  /**
   * Layout children in a grid
   */
  private layoutGrid(x: number, y: number, width: number, height: number,
                    spacing: number, children: UIKPanelChild[]): void {
    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(children.length))
    const rows = Math.ceil(children.length / cols)
    
    const childWidth = (width - (cols - 1) * spacing) / cols
    const childHeight = (height - (rows - 1) * spacing) / rows
    
    children.forEach((child, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const childX = x + col * (childWidth + spacing)
      const childY = y + row * (childHeight + spacing)
      
      child.bounds = [childX, childY, childWidth, childHeight]
    })
  }

  /**
   * Render the panel and its children
   */
  public render(): void {
    if (!this.config.visible) return

    // Update animation
    this.update()
    
    const [x, y, width, height] = this.config.bounds
    const style = this.config.style!
    
    // Draw shadow first
    if (style.shadowColor && style.shadowOffset) {
      const [shadowX, shadowY] = style.shadowOffset
      this.drawPanelBackground(x + shadowX, y + shadowY, width, height, style.shadowColor, null)
    }
    
    // Draw main panel background
    this.drawPanelBackground(x, y, width, height, style.backgroundColor!, style.borderColor!)
    
    // Draw title bar if present
    if (this.config.title) {
      this.renderTitleBar()
    }
    
    // Update and render children if panel is not fully collapsed
    if (this.animationProgress > 0.01) {
      this.updateLayout()
      this.renderChildren()
    }
  }

  /**
   * Draw panel background with border
   */
  private drawPanelBackground(x: number, y: number, width: number, height: number,
                             backgroundColor: Color, borderColor: Color | null): void {
    const style = this.config.style!
    
    // Draw background
    this.renderer.drawLine({
      startEnd: [x, y + height/2, x + width, y + height/2],
      thickness: height,
      color: backgroundColor
    })
    
    // Draw border if specified
    if (borderColor) {
      const borderThickness = style.borderThickness!
      
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
  }

  /**
   * Render the title bar
   */
  private renderTitleBar(): void {
    if (!this.config.title || !this.config.font) return
    
    const titleBarBounds = this.getTitleBarBounds()!
    const [titleX, titleY, titleWidth, titleHeight] = titleBarBounds
    const style = this.config.style!
    
    // Draw title bar background
    let titleBarColor = style.titleBarColor!
    if (this.config.collapsible && this.state === UIKPanelState.HOVER) {
      // Lighten title bar on hover
      titleBarColor = [
        Math.min(1, titleBarColor[0] + 0.1),
        Math.min(1, titleBarColor[1] + 0.1),
        Math.min(1, titleBarColor[2] + 0.1),
        titleBarColor[3]
      ]
    }
    
    this.drawPanelBackground(titleX, titleY, titleWidth, titleHeight, titleBarColor, null)
    
    // Configure font outline for enhanced medical readability
    if (this.config.font) {
      this.config.font.setOutlineConfig({
        enabled: true,
        width: 0.28,                    // Slightly wider outline for panel titles
        color: [0.0, 0.0, 0.0, 0.9],   // Strong black outline for maximum readability
        style: 'solid',                 // Clean solid outline for professional appearance
        softness: 0.1,                  // Minimal softness for crisp edges
        offset: [0, 0]                  // No offset for clean look
      })
    }
    
    // Draw title text
    this.renderer.drawRotatedText({
      font: this.config.font,
      xy: [titleX + (style.titleTextPadding ?? 10), titleY + titleHeight / 2 + (style.titleTextVerticalOffset ?? -6)],
      str: this.config.title,
      color: style.titleTextColor!,
      scale: style.titleTextScale ?? 0.025
    })
    
    // Draw collapse indicator if collapsible
    if (this.config.collapsible) {
      const indicatorX = titleX + titleWidth - 20
      const indicatorY = titleY + titleHeight / 2
      const indicatorSize = 6
      
      if (this.config.collapsed) {
        // Draw right-pointing triangle (collapsed)
        this.renderer.drawTriangle({
          headPoint: [indicatorX + indicatorSize, indicatorY],
          baseMidPoint: [indicatorX, indicatorY],
          baseLength: indicatorSize,
          color: style.titleTextColor!
        })
      } else {
        // Draw down-pointing triangle (expanded)
        this.renderer.drawTriangle({
          headPoint: [indicatorX, indicatorY + indicatorSize/2],
          baseMidPoint: [indicatorX, indicatorY - indicatorSize/2],
          baseLength: indicatorSize,
          color: style.titleTextColor!
        })
      }
    }
  }

  /**
   * Render all child components
   */
  private renderChildren(): void {
    this.children.forEach(child => {
      if (child.visible !== false) {
        child.render()
      }
    })
  }

  /**
   * Get the bounding rectangle for hit testing
   */
  public getBounds(): Vec4 {
    return this.config.bounds
  }

  /**
   * Update the panel bounds (for responsive layouts)
   */
  public setBounds(bounds: Vec4): void {
    this.config.bounds = bounds
    this.updateLayout()
  }

  /**
   * Set the panel title
   */
  public setTitle(title: string): void {
    this.config.title = title
  }

  /**
   * Get content area bounds for external layout management
   */
  public getContentArea(): Vec4 {
    return this.getContentBounds()
  }

  /**
   * Get available space for child components
   */
  public getAvailableSpace(): Vec4 {
    const contentBounds = this.getContentBounds()
    const [contentX, contentY, contentWidth, contentHeight] = contentBounds
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = this.config.padding!
    
    return [
      contentX + paddingLeft,
      contentY + paddingTop,
      contentWidth - paddingLeft - paddingRight,
      contentHeight - paddingTop - paddingBottom
    ]
  }
} 