import { vec3 } from 'gl-matrix'
import { LUT } from '@/colortables'

export type ValuesArray = Array<{
  id: string
  vals: Float32Array
  global_min?: number
  global_max?: number
  cal_min?: number
  cal_max?: number
}>

// export type AnyNumberArray = number[] | TypedNumberArray

export type AnyNumberArray =
  | number[]
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

export type DefaultMeshType = {
  positions: Float32Array
  indices: Uint32Array
  colors?: Float32Array
}

export type TRACT = {
  pts: Float32Array
  offsetPt0: Uint32Array
  dps: ValuesArray
}

export type TT = {
  pts: Float32Array
  offsetPt0: Uint32Array
}

export type TRX = {
  pts: Float32Array
  offsetPt0: Uint32Array
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
  | {
      positions: Float32Array | null
      indices: Uint32Array | null
      scalars: Float32Array
      colors: Float32Array | null
    }
  | {
      scalars: Float32Array
      colormapLabel: LUT
    }
  | {
      scalars: Float32Array
    }

export type GII = {
  scalars: Float32Array
  positions?: Float32Array
  indices?: Uint32Array
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
  positions: Float32Array
  indices: Uint32Array
  rgba255: Uint8Array
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
  outlineBorder: number
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
