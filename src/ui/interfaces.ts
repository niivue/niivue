// interfaces.ts

import { NVRenderer } from './nvrenderer.js'
import { AlignmentPoint, Color, HorizontalAlignment, Vec2, Vec3, Vec4, VerticalAlignment } from './types.js'

// interfaces.ts
export interface IUIComponent {
  getBounds(): Vec4
  setBounds(bounds: Vec4): void
  getPosition(): Vec2
  setPosition(position: Vec2): void
  draw(renderer: NVRenderer): void
  align(bounds: Vec4): void

  isVisible: boolean
  zIndex: number
  tags: string[]
  getScale(): number
  setScale(value: number): void
  applyEventEffects(eventName: string, event: Event): void
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
  modelPoints: Vec3[] // Array to handle one or two points
  setScreenPoints(screenPoints: Vec2[]): void
}

export function isProjectable(component: any): component is IProjectable {
  return 'modelPoints' in component && typeof component.setScreenPoints === 'function'
}
