import { vec3 } from 'gl-matrix'
import { LUT } from './colortables.js'

export type ValuesArray = Array<{
  id: string
  vals: number[]
}>

export type TypedNumberArray =
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

export type AnyNumberArray = number[] | TypedNumberArray

export type DefaultMeshType = {
  positions: Float32Array
  indices: Int32Array
  colors?: Float32Array
}

export type TRACT = {
  pts: number[]
  offsetPt0: number[]
  dps: ValuesArray
}

export type TT = {
  pts: number[]
  offsetPt0: number[]
}

export type TRX = {
  pts: number[]
  offsetPt0: number[]
  dpg: ValuesArray
  dps: ValuesArray
  dpv: ValuesArray
  header: unknown
}

export type TRK = {
  pts: Float32Array
  offsetPt0: Uint32Array
  dps: ValuesArray
  dpv: ValuesArray
}

export type TCK = {
  pts: Float32Array
  offsetPt0: Uint32Array
}

export type VTK =
  | DefaultMeshType
  | {
      pts: Float32Array
      offsetPt0: Uint32Array
    }

export type ANNOT =
  | Uint32Array
  | {
      scalars: Float32Array
      colormapLabel: LUT
    }

export type MZ3 =
  | Float32Array
  | {
      positions: Float32Array | null
      indices: Int32Array | null
      scalars: Float32Array
      colors: Float32Array | null
    }

export type GII = {
  scalars: Float32Array
  positions?: Float32Array
  indices?: Int32Array
  colormapLabel?: LUT
  anatomicalStructurePrimary: string
}

export type MGH =
  | AnyNumberArray
  | {
      scalars: AnyNumberArray
      colormapLabel: LUT
    }

export type X3D = {
  positions: number[] // TODO clean up number types
  indices: Int32Array
  rgba255: number[]
}

export type Layer = {
  // TODO: check that these types aren't used by some other data structure that could be unified
  colormapInvert: boolean
  alphaThreshold: boolean
  isTransparentBelowCalMin: boolean
  isAdditiveBlend: boolean
  colorbarVisible: boolean
  colormapLabel: LUT
  nFrame4D: number
  frame4D: number
  isOutlineBorder: boolean
  global_min: number
  global_max: number
  cal_min: number | null
  cal_max: number | null
  values: AnyNumberArray // TODO clean up type?
  cal_minNeg: number
  cal_maxNeg: number
  opacity: number
  colormap: string
  colormapNegative: string
  useNegativeCmap: boolean
}

export type XmlTag = {
  name: string
  startPos: number
  contentStartPos: number
  contentEndPos: number
  endPos: number
}

export type SmpMap = {
  mapType: number
  nLags: number
  mnLag: number
  mxLag: number
  ccOverlay: number
  clusterSize: number
  clusterCheck: number
  critThresh: number
  maxThresh: number
  includeValuesGreaterThreshMax: number
  df1: number
  df2: number
  posNegFlag: number
  cortexBonferroni: number
  posMinRGB: vec3
  posMaxRGB: vec3
  negMinRGB: vec3
  negMaxRGB: vec3
  enableSMPColor: number
  lut: string
  colorAlpha: number
  name: string
}
