// types.ts
import { vec2, vec3, vec4 } from 'gl-matrix'

// Define Color type for clarity
export type Color = [number, number, number, number] | Float32List

// Define Vec2, Vec3, and Vec4 types
export type Vec2 = vec2 | [number, number]
export type Vec3 = vec3 | [number, number, number]
export type Vec4 = vec4 | [number, number, number, number]


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

export enum OffsetDirection {
  Below,
  Above,
  LeftOf,
  RightOf,
  CenteredOn
}