// types.ts

import { vec2, vec3, vec4 } from 'gl-matrix'
import { UIKFont } from './assets/uikfont'

// Define Color type for clarity
export type Color = [number, number, number, number] | Float32List

// Define Vec2, Vec3, and Vec4 types
export type Vec2 = vec2 | [number, number]
export type Vec3 = vec3 | [number, number, number]
export type Vec4 = vec4 | [number, number, number, number]

// LineTerminator enum
export enum LineTerminator {
  NONE = 0,
  ARROW = 1,
  CIRCLE = 2,
  RING = 3
}

export enum LineStyle {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted'
}

// Enums for alignment
export enum AlignmentFlag {
  NONE = 0,
  LEFT = 1 << 0,
  CENTER = 1 << 1,
  RIGHT = 1 << 2,
  TOP = 1 << 3,
  MIDDLE = 1 << 4,
  BOTTOM = 1 << 5
}

export enum AlignmentPoint {
  NONE = AlignmentFlag.NONE,
  TOPLEFT = AlignmentFlag.TOP | AlignmentFlag.LEFT,
  TOPCENTER = AlignmentFlag.TOP | AlignmentFlag.CENTER,
  TOPRIGHT = AlignmentFlag.TOP | AlignmentFlag.RIGHT,
  MIDDLELEFT = AlignmentFlag.MIDDLE | AlignmentFlag.LEFT,
  MIDDLECENTER = AlignmentFlag.MIDDLE | AlignmentFlag.CENTER,
  MIDDLERIGHT = AlignmentFlag.MIDDLE | AlignmentFlag.RIGHT,
  BOTTOMLEFT = AlignmentFlag.BOTTOM | AlignmentFlag.LEFT,
  BOTTOMCENTER = AlignmentFlag.BOTTOM | AlignmentFlag.CENTER,
  BOTTOMRIGHT = AlignmentFlag.BOTTOM | AlignmentFlag.RIGHT
}

export enum HorizontalAlignment {
  NONE = AlignmentFlag.NONE,
  LEFT = AlignmentFlag.LEFT,
  CENTER = AlignmentFlag.CENTER,
  RIGHT = AlignmentFlag.RIGHT
}

export enum VerticalAlignment {
  NONE = AlignmentFlag.NONE,
  TOP = AlignmentFlag.TOP,
  CENTER = AlignmentFlag.MIDDLE,
  BOTTOM = AlignmentFlag.BOTTOM
}

export enum ComponentSide {
  LEFT,
  RIGHT,
  TOP,
  BOTTOM
}

// Enum for specifying the plane
export enum Plane {
  XY = 'XY',
  XZ = 'XZ',
  YZ = 'YZ'
}

export type Effect =
  | {
      type: 'setValue'
      targetObject: any
      property: string
      value: any
      isToggle: boolean
      event?: PointerEvent
      onComplete?: (event?: Event) => void
    }
  | {
      type: 'toggleValue'
      targetObject: any
      property: string
      value1: any
      value2: any
      event?: PointerEvent
      onComplete?: (event?: Event) => void
    }
  | {
      type: 'animateValue'
      targetObject: any
      property: string
      from: number | number[]
      to: number | number[]
      duration: number
      isBounce: boolean
      isToggle: boolean
      event?: PointerEvent
      onComplete?: (event?: Event) => void
    }

export type Graph = {
  position: Vec2 // Position of the graph's top-left corner
  size: Vec2 // Width and height of the graph
  backgroundColor: Color // Background color of the graph area
  lineColor: Color // Color of the graph line
  axisColor: Color // Color of the graph axis lines
  data: number[] // Array of data points to plot
  xLabel: string // Label for the x-axis
  yLabel: string // Label for the y-axis
  yRange: [number, number] // Range for y-axis (min, max)
  lineThickness: number // Thickness of the graph line
  textColor: Color // Color for text labels
  font: UIKFont // Font for rendering text labels
  textScale: number // Text scale
}
