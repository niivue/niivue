// interfaces.ts

import { UIKRenderer } from './uikrenderer.js'
import {
  AlignmentPoint,
  Color,
  ComponentSide,
  HorizontalAlignment,
  LineStyle,
  LineTerminator,
  Vec2,
  Vec3,
  Vec4,
  VerticalAlignment
} from './types.js'
import { UIKBitmap } from './uikbitmap.js'
import { UIKFont } from './uikfont.js'

// interfaces.ts
export interface IUIComponent {
  id: string
  getBounds(): Vec4
  setBounds(bounds: Vec4): void
  getPosition(): Vec2
  setPosition(position: Vec2): void
  draw(renderer: UIKRenderer): void
  align(bounds: Vec4): void

  isVisible: boolean
  zIndex: number
  tags: string[]
  getScale(): number
  setScale(value: number): void
  applyEventEffects(eventName: string, event: Event): void
  addEventListener(eventName: string, callback: (event: Event) => void): void
  removeEventListener(eventName: string, callback: (event: Event) => void): void
  toJSON(): object
  requestRedraw?: () => void

  alignmentPoint: AlignmentPoint
  verticalAlignment: VerticalAlignment
  horizontalAlignment: HorizontalAlignment
}

// Define the configuration object type
export interface BaseUIComponentConfig {
  alignmentPoint?: AlignmentPoint
  verticalAlignment?: VerticalAlignment
  horizontalAlignment?: HorizontalAlignment
  isVisible?: boolean
  zIndex?: number
  id?: string
  tags?: string[]
  className: string
  position?: Vec2
  bounds?: Vec4
  scale?: number
  margin?: number
  requestRedraw?: () => void
}

export interface BaseContainerComponentConfig extends BaseUIComponentConfig {
  canvas: HTMLCanvasElement
  isHorizontal?: boolean
  padding?: number
  maxWidth?: number
  maxHeight?: number
}

export interface BitmapComponentConfig extends BaseUIComponentConfig {
  bitmap: UIKBitmap
  scale?: number
}

export interface TextComponentConfig extends BaseUIComponentConfig {
  text: string
  font: UIKFont
  textColor?: Color
  scale?: number
  maxWidth?: number
}

export interface TextBoxComponentConfig extends TextComponentConfig {
  outlineColor?: Color
  fillColor?: Color
  innerMargin?: number
  roundness?: number
  fontOutlineColor?: Color
  fontOutlineThickness?: number
}

export interface ButtonComponentConfig extends TextBoxComponentConfig {
  highlightColor?: Color
  onClick?: (event: PointerEvent) => void
}

export interface CalendarComponentConfig extends BaseUIComponentConfig {
  font: UIKFont
  startX: number
  startY: number
  cellWidth: number
  cellHeight: number
  selectedDate: Date
  selectedColor: Color
  firstDayOfWeek?: number
}

export interface CaliperComponentConfig extends BaseUIComponentConfig {
  pointA: Vec2
  pointB: Vec2
  length: number
  units: string
  font: UIKFont
  textColor?: Color
  lineColor?: Color
  scale?: number
}

export interface CircleComponentConfig extends BaseUIComponentConfig {
  leftTopWidthHeight: Vec4
  circleColor?: Color
  fillPercent?: number
  z?: number
}

export interface ColorbarComponentConfig extends BaseUIComponentConfig {
  gl: WebGL2RenderingContext
  minMax?: [number, number]
  colormapName?: string
  bounds: Vec4
}

export interface ContainerButtonComponentConfig extends BaseContainerComponentConfig {
  outlineColor?: Color
  fillColor?: Color
  highlightColor?: Color
  roundness?: number
  maxWidth?: number
  maxHeight?: number
}

export interface LineGraphComponentConfig extends Omit<BaseUIComponentConfig, 'position'> {
  position: Vec2 // Override to make position required
  size: Vec2
  backgroundColor: Color
  lineColor: Color
  axisColor: Color
  textColor: Color
  data: number[]
  xLabel: string
  yLabel: string
  yRange: [number, number]
  lineThickness: number
  font: UIKFont
  textScale: number // Text scale
}

export interface LineComponentConfig extends BaseUIComponentConfig {
  startEnd: Vec4 // Start and end points of the line
  thickness?: number // Line thickness (default to 1)
  lineColor?: Color // Line color (default to [1, 0, 0, -1])
  terminator?: LineTerminator // Line terminator (default to NONE)
  lineStyle?: LineStyle // Line style (default to SOLID)
  dashDotLength?: number // Dash/dot length for dashed or dotted lines (default to 5)
}
export interface ProjectedLineComponentConfig extends LineComponentConfig {
  modelPoints: Vec3[] // Array for one or two model points
  targetComponent: IUIComponent // Reference to the target component
  side: ComponentSide // Side of the target component to attach the line
}

export interface RotatedTextComponentConfig extends BaseUIComponentConfig {
  font: UIKFont // Font for rendering text
  text: string // The text to render
  scale?: number // Scale of the text (default to 1.0)
  color?: Color // Text color (default to [1, 0, 0, 1])
  rotation?: number // Rotation angle in radians (default to 0.0)
}

export interface RoundedRectComponentConfig extends BaseUIComponentConfig {
  leftTopWidthHeight: Vec4 // The bounds of the rectangle ([left, top, width, height])
  fillColor: Color // Fill color for the rectangle
  outlineColor: Color // Outline color for the rectangle
  cornerRadius?: number // Radius for rounded corners (default to -1)
  thickness?: number // Outline thickness (default to 10)
}

export interface RulerComponentConfig extends BaseUIComponentConfig {
  startPoint: Vec2 // Start point in model space
  endPoint: Vec2 // End point in model space
  units: string // Units of measurement (e.g., cm, mm)
  font: UIKFont // Font for rendering text
  textColor?: Color // Color for the text (default to [1, 0, 0, 1])
  lineColor?: Color // Color for the line (default to [0, 0, 0, 1])
  lineThickness?: number // Thickness of the line (default to 1)
  offset?: number // Offset for text position (default to 40)
  scale?: number // Scale of the ruler (default to 1.0)
  showTickmarkNumbers?: boolean // Show numbers above every fifth tickmark
}

export interface ToggleComponentConfig extends BaseUIComponentConfig {
  size: Vec2 // Size of the toggle ([width, height])
  isOn: boolean // Initial state of the toggle (on/off)
  onColor: Color // Color when the toggle is on
  offColor: Color // Color when the toggle is off
  knobPosition?: number // Initial knob position (default to 1.0 for on, 0.0 for off)
}

export interface TriangleComponentConfig extends BaseUIComponentConfig {
  headPoint: Vec2 // Point at the top of the triangle
  baseMidPoint: Vec2 // Midpoint of the base of the triangle
  baseLength: number // Length of the base
  color: Color // Color of the triangle
}

export interface IColorable extends IUIComponent {
  getTextColor(): Color
  setTextColor(color: Color): void
  getBackgroundColor(): Color
  setBackgroundColor(color: Color): void
  getForegroundColor(): Color
  setForegroundColor(color: Color): void
}

export interface IUIContainer extends IUIComponent {
  addChild(child: IUIComponent): void
  removeChild(child: IUIComponent): void
  getChildren(): IUIComponent[]
  alignItems(): void
}

export interface IProjectable {
  setScreenPoints(screenPoints: Vec3[]): void
}

export interface IProjectable3D extends IProjectable {
  modelPoints: Vec3[] // Array to handle one or two points
}

export interface IProjectable2D extends IProjectable {
  modelPlanePoints: Vec2[] // Array to handle one or two points
}

export function isProjectable(component: any): component is IProjectable {
  return typeof component.setScreenPoints === 'function'
}

export function isProjectable2D(component: any): component is IProjectable2D {
  return 'modelPlanePoints' in component && Array.isArray(component.modelPlanePoints)
}

export function isProjectable3D(component: any): component is IProjectable3D {
  return 'modelPoints' in component && Array.isArray(component.modelPoints)
}
