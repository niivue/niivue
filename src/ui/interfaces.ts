import { UIKRenderer } from './uikRenderer.js'
import { AlignmentPoint, Color, HorizontalAlignment, Vec2, Vec3, Vec4, VerticalAlignment } from './types.js'

export interface IUIComponent {
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
