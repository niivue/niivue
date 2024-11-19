import { Rectangle, QuadTree } from './quadtree.js'
import {
  Vec2,
  Vec4,
  Color,
  LineStyle,
  LineTerminator,
  ComponentSide,
  AlignmentPoint,
  HorizontalAlignment,
  VerticalAlignment,
  Plane
} from './types.js'
import { UIKRenderer } from './uikrenderer.js'
import { UIKFont } from './uikfont.js'
import { UIKBitmap } from './uikbitmap.js'
import { BaseContainerComponent } from './components/basecontainercomponent.js'
import { AnimationManager } from './animationmanager.js'
import { BitmapComponent } from './components/bitmapcomponent.js'
// import { NVAsset } from './nvasset.js'
import { ButtonComponent } from './components/buttoncomponent.js'
import { CaliperComponent } from './components/calipercomponent.js'
import { CircleComponent } from './components/circlecomponent.js'
import { LineComponent } from './components/linecomponent.js'
import { TextBoxComponent } from './components/textboxcomponent.js'
import { ToggleComponent } from './components/togglecomponent.js'
import { TriangleComponent } from './components/trianglecomponent.js'
import { TextComponent } from './components/textcomponent.js'
import { IUIComponent } from './interfaces.js'
// import { BaseUIComponent } from './components/baseuicomponent.js'

export class UIKit {
  private gl: WebGL2RenderingContext
  private renderer: UIKRenderer
  private quadTree: QuadTree<IUIComponent>
  private _redrawRequested?: () => void

  // Style field
  public style: {
    textColor: Color
    foregroundColor: Color
    backgroundColor: Color
    textSize: number
  }

  private canvasWidth: number
  private canvasHeight: number
  private dpr: number
  private resizeListener: () => void
  private resizeObserver: ResizeObserver

  // Static enum for line terminators
  public static lineTerminator = LineTerminator
  public static lineStyle = LineStyle
  public static componentSide = ComponentSide
  public static alignmentPoint = AlignmentPoint
  public static horizontalAlignment = HorizontalAlignment
  public static verticalAlignment = VerticalAlignment
  public static plane = Plane

  private lastHoveredComponents: Set<IUIComponent> = new Set()

  public get redrawRequested(): (() => void) | undefined {
    return this._redrawRequested
  }

  public set redrawRequested(callback: (() => void) | undefined) {
    const canvas = this.gl.canvas as HTMLCanvasElement
    if (callback) {
      canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this))
      canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this))
      window.removeEventListener('resize', this.resizeListener)
    } else {
      canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this))
      canvas.addEventListener('pointermove', this.handlePointerMove.bind(this))
      window.addEventListener('resize', this.resizeListener)
    }
    this._redrawRequested = callback
  }

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.renderer = new UIKRenderer(gl)
    this.dpr = window.devicePixelRatio || 1
    const canvas = this.gl.canvas as HTMLCanvasElement
    this.resizeObserver = new ResizeObserver(this.handleWindowResize.bind(this))
    this.resizeObserver.observe((this.gl.canvas as HTMLCanvasElement).parentElement!)
    const rect = canvas.parentElement.getBoundingClientRect()
    this.canvasWidth = rect.width
    this.canvasHeight = rect.height

    this.style = {
      textColor: [0, 0, 0, 1],
      foregroundColor: [1, 1, 1, 1],
      backgroundColor: [0, 0, 0, 1],
      textSize: 12
    }
    const bounds = new Rectangle(0, 0, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)
    this.quadTree = new QuadTree<IUIComponent>(bounds)

    const animationManager = AnimationManager.getInstance()
    animationManager.setRequestRedrawCallback(this.requestRedraw.bind(this))

    this.resizeListener = this.handleWindowResize.bind(this)
    window.addEventListener('resize', this.resizeListener)

    canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this))
    canvas.addEventListener('pointerup', this.handlePointerUp.bind(this))
    canvas.addEventListener('pointermove', this.handlePointerMove.bind(this))
  }

  // Method to add a component to the QuadTree
  public addComponent(component: IUIComponent): void {
    if (component instanceof BaseContainerComponent) {
      component.quadTree = this.quadTree
    }
    component.requestRedraw = this.requestRedraw.bind(this)
    this.quadTree.insert(component)
  }

  getComponents(
    boundsInScreenCoords?: Vec4,
    tags: string[] = [],
    useAnd: boolean = true,
    useNot: boolean = false
  ): IUIComponent[] {
    const candidates = boundsInScreenCoords
      ? this.quadTree.query(Rectangle.fromVec4(boundsInScreenCoords))
      : this.quadTree.getAllElements()

    return candidates.filter((component) => {
      // If tags array is empty, return only components without tags
      if (tags.length === 0) {
        return component.tags.length === 0
      }
      const hasTags = useAnd
        ? tags.every((tag) => component.tags.includes(tag))
        : tags.some((tag) => component.tags.includes(tag))

      return useNot ? !hasTags : hasTags
    })
  }

  public alignItems(leftTopWidthHeight?: Vec4, tags: string[] = []): void {
    // Set up bounds for filtering and positioning
    const bounds: Vec4 = leftTopWidthHeight || [0, 0, this.gl.canvas.width, this.gl.canvas.height]

    // Retrieve components that match the specified tags and are within bounds
    const components = this.getComponents(
      leftTopWidthHeight,
      tags,
      true // Match all specified tags
    )

    for (const component of components) {
      // Align component within bounds if specified
      component.align(bounds)
    }
  }

  public draw(leftTopWidthHeight?: Vec4, tags: string[] = []): void {
    this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight)

    // Set up bounds for filtering and positioning
    // Retrieve components that match the specified tags and are within bounds
    const components = this.getComponents(
      leftTopWidthHeight,
      tags,
      true // Match all specified tags
    )
    for (const component of components) {
      // Align component within bounds if specified
      // component.align(bounds)
      // Draw the component using NVRenderer
      if (component.isVisible) {
        component.draw(this.renderer)
      }
    }
  }

  // Method to request a redraw
  private requestRedraw(): void {
    if (this._redrawRequested) {
      this._redrawRequested()
    } else {
      // no host
      this.draw()
    }
  }

  public processPointerMove(x: number, y: number, event: PointerEvent): void {
    const point: Vec2 = [x * this.dpr, y * this.dpr]
    const components = new Set(this.quadTree.queryPoint(point).filter((component) => component.isVisible))
    for (const component of components) {
      if (!component.isVisible) {
        continue
      }
      if (!this.lastHoveredComponents.has(component)) {
        component.applyEventEffects('pointerenter', event)
      }
    }
    for (const component of this.lastHoveredComponents) {
      if (!components.has(component)) {
        component.applyEventEffects('pointerleave', event)
      }
    }
    this.lastHoveredComponents = components
  }

  public processPointerDown(_x: number, _y: number, _button: number): void {}

  public processPointerUp(x: number, y: number, event: PointerEvent): void {
    const point: Vec2 = [x * this.dpr, y * this.dpr]
    const components = this.quadTree.queryPoint(point)
    for (const component of components) {
      if (component.isVisible) {
        component.applyEventEffects('pointerup', event)
      }
    }
  }

  // Method to handle window resize events
  public handleWindowResize(): void {
    const canvas = this.gl.canvas as HTMLCanvasElement
    const width = canvas.clientWidth * this.dpr
    const height = canvas.clientHeight * this.dpr

    // Update canvasWidth and canvasHeight
    this.canvasWidth = width
    this.canvasHeight = height

    const bounds = new Rectangle(0, 0, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)
    this.quadTree.updateBoundary(bounds)
  }

  // Handler for pointer down events
  private handlePointerDown(event: PointerEvent): void {
    const pos = this.getCanvasRelativePosition(event)
    if (pos) {
      this.processPointerDown(pos.x, pos.y, event.button)
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    const pos = this.getCanvasRelativePosition(event)
    if (pos) {
      this.processPointerUp(pos.x, pos.y, event)
    }
  }

  // Handler for pointer move events
  private handlePointerMove(event: PointerEvent): void {
    const pos = this.getCanvasRelativePosition(event)
    if (pos) {
      this.processPointerMove(pos.x, pos.y, event)
    }
  }

  // Utility method to calculate position relative to the canvas
  private getCanvasRelativePosition(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.gl.canvas as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) * this.dpr
    const y = (event.clientY - rect.top) * this.dpr
    return { x, y }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeListener)
    const canvas = this.gl.canvas as HTMLCanvasElement
    canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this))
    canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this))
  }

  // Proxy methods for renderer's draw calls

  // Proxy methods for renderer's draw calls
  public drawText({
    font,
    position,
    text,
    scale = 1.0,
    color = [1, 1, 1, 1],
    maxWidth = 0
  }: {
    font: UIKFont
    position: Vec2
    text: string
    scale?: number
    color?: Color
    maxWidth?: number
  }): void {
    this.renderer.drawText({ font, position, text, scale, color, maxWidth })
  }

  public drawBitmap({ bitmap, position, scale }: { bitmap: UIKBitmap; position: Vec2; scale: number }): void {
    this.renderer.drawBitmap({ bitmap, position, scale })
  }

  public drawLine({
    startEnd,
    thickness = 1,
    color = [1, 0, 0, 1],
    terminator = LineTerminator.NONE,
    style = LineStyle.SOLID,
    dashDotLength = 5
  }: {
    startEnd: Vec4
    thickness?: number
    color?: Color
    terminator?: LineTerminator
    style?: LineStyle
    dashDotLength?: number
  }): void {
    this.renderer.drawLine({ startEnd, thickness, color, terminator, style, dashDotLength })
  }

  public drawRect({
    leftTopWidthHeight,
    fillColor = [1, 0, 0, 1]
  }: {
    leftTopWidthHeight: Vec4
    fillColor?: Color
  }): void {
    this.renderer.drawRect({ leftTopWidthHeight, fillColor })
  }

  public drawRoundedRect({
    bounds,
    fillColor,
    outlineColor,
    cornerRadius = 0,
    thickness = 10
  }: {
    bounds: Vec4
    fillColor: Color
    outlineColor: Color
    cornerRadius?: number
    thickness?: number
  }): void {
    this.renderer.drawRoundedRect({ bounds, fillColor, outlineColor, cornerRadius, thickness })
  }

  public drawCircle({
    leftTopWidthHeight,
    circleColor = [1, 1, 1, 1],
    fillPercent = 1.0,
    z = 0
  }: {
    leftTopWidthHeight: Vec4
    circleColor?: Color
    fillPercent?: number
    z?: number
  }): void {
    this.renderer.drawCircle({ leftTopWidthHeight, circleColor, fillPercent, z })
  }

  public drawToggle({
    position,
    size,
    isOn,
    onColor,
    offColor,
    knobPosition
  }: {
    position: Vec2
    size: Vec2
    isOn: boolean
    onColor: Color
    offColor: Color
    knobPosition?: number
  }): void {
    this.renderer.drawToggle({ position, size, isOn, onColor, offColor, knobPosition })
  }

  public drawTriangle({
    headPoint,
    baseMidPoint,
    baseLength,
    color,
    z = 0
  }: {
    headPoint: Vec2
    baseMidPoint: Vec2
    baseLength: number
    color: Color
    z?: number
  }): void {
    this.renderer.drawTriangle({ headPoint, baseMidPoint, baseLength, color, z })
  }

  /**
   * Draws rotated text using the renderer.
   *
   * @param font - The font used for rendering the text.
   * @param xy - The position of the text.
   * @param str - The string to render.
   * @param scale - The scale of the text. Defaults to 1.0.
   * @param color - The color of the text. Defaults to [1.0, 0.0, 0.0, 1.0].
   * @param rotation - The rotation of the text in radians. Defaults to 0.0.
   * @param outlineColor - The outline color of the text. Defaults to [0, 0, 0, 1.0].
   * @param outlineThickness - The thickness of the outline. Defaults to 2.
   */
  public drawRotatedText({
    font,
    xy,
    str,
    scale = 1.0,
    color = [1.0, 0.0, 0.0, 1.0],
    rotation = 0.0,
    outlineColor = [0, 0, 0, 1.0],
    outlineThickness = 2
  }: {
    font: UIKFont
    xy: Vec2
    str: string
    scale?: number
    color?: Color
    rotation?: number
    outlineColor?: Color
    outlineThickness?: number
  }): void {
    this.renderer.drawRotatedText({ font, xy, str, scale, color, rotation, outlineColor, outlineThickness })
  }

  /**
   * Proxy method to draw a ruler using the renderer.
   *
   * @param config - Configuration object for drawing the ruler.
   * @param config.pointA - The starting point of the ruler as a Vec2 ([x, y]).
   * @param config.pointB - The ending point of the ruler as a Vec2 ([x, y]).
   * @param config.length - The length of the ruler.
   * @param config.units - The units to display on the ruler.
   * @param config.font - The font to use for ruler labels.
   * @param config.textColor - The color of the ruler labels.
   * @param config.lineColor - The color of the ruler lines.
   * @param config.lineThickness - The thickness of the ruler lines.
   * @param config.offset - The offset distance of the ruler from the main line.
   * @param config.scale - The scale for the text and elements of the ruler.
   */
  public drawRuler(config: {
    pointA: Vec2
    pointB: Vec2
    length: number
    units: string
    font: UIKFont
    textColor?: Color
    lineColor?: Color
    lineThickness?: number
    offset?: number
    scale?: number
  }): void {
    this.renderer.drawRuler(config)
  }

  public async serializeComponents(): Promise<string> {
    const components = this.quadTree.getAllElements()
    const serializedComponents = []
    const assets = { fonts: {}, bitmaps: {} } // Separate nodes for fonts and bitmaps

    for (const component of components) {
      if ('getFont' in component && typeof component.getFont === 'function') {
        const font = component.getFont()
        if (font && font.getBase64Texture) {
          const base64Texture = await font.getBase64Texture()
          if (base64Texture) {
            assets.fonts[font.id] = {
              ...font.toJSON(),
              texture: base64Texture
            }
          }
        }
      }
      if ('getBitmap' in component && typeof component.getBitmap === 'function') {
        const bitmap = component.getBitmap()
        if (bitmap && bitmap.getBase64Texture) {
          const base64Texture = await bitmap.getBase64Texture()
          if (base64Texture) {
            assets.bitmaps[bitmap.id] = {
              ...bitmap.toJSON(),
              texture: base64Texture
            }
          }
        }
      }
      serializedComponents.push(await component.toJSON())
    }

    return JSON.stringify({ components: serializedComponents, assets }, null, 2)
  }

  public static async fromJSON(json: any, gl: WebGL2RenderingContext): Promise<UIKit> {
    const ui = new UIKit(gl)

    // Deserialize fonts
    const fonts: { [key: string]: UIKFont } = {}
    if (json.assets?.fonts) {
      await Promise.all(
        Object.entries(json.assets.fonts).map(async ([fontId, fontData]) => {
          try {
            const font = await UIKFont.fromJSON(gl, fontData)
            fonts[fontId] = font
          } catch (error) {
            console.error(`Failed to load font with ID ${fontId}:`, error)
          }
        })
      )
    }

    // Deserialize bitmaps
    const bitmaps: { [key: string]: UIKBitmap } = {}
    if (json.assets?.bitmaps) {
      await Promise.all(
        Object.entries(json.assets.bitmaps).map(async ([bitmapId, bitmapData]) => {
          try {
            const bitmap = await UIKBitmap.fromJSON(gl, bitmapData)
            bitmaps[bitmapId] = bitmap
          } catch (error) {
            console.error(`Failed to load bitmap with ID ${bitmapId}:`, error)
          }
        })
      )
    }

    // Deserialize components
    if (Array.isArray(json.components)) {
      json.components.forEach((componentData: any) => {
        try {
          let component
          switch (componentData.className) {
            case 'BitmapComponent':
              component = BitmapComponent.fromJSON(componentData, bitmaps)
              break
            case 'TextBoxComponent':
              component = TextBoxComponent.fromJSON(componentData, fonts)
              break
            case 'TextComponent':
              component = TextComponent.fromJSON(componentData, fonts)
              break
            case 'ButtonComponent':
              component = ButtonComponent.fromJSON(componentData, fonts)
              break
            case 'CircleComponent':
              component = CircleComponent.fromJSON(componentData)
              break
            case 'TriangleComponent':
              component = TriangleComponent.fromJSON(componentData)
              break
            case 'LineComponent':
              component = LineComponent.fromJSON(componentData)
              break
            case 'ToggleComponent':
              component = ToggleComponent.fromJSON(componentData)
              break
            case 'CaliperComponent':
              component = CaliperComponent.fromJSON(componentData, fonts)
              break
            default:
              console.warn(`Unknown component class: ${componentData.className}`)
          }
          if (component) {
            ui.addComponent(component)
          }
        } catch (error) {
          console.error(`Failed to deserialize component:`, error)
        }
      })
    } else {
      console.warn('No valid components array found in JSON data.')
    }

    return ui
  }
}
