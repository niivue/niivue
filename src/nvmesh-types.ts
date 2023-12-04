import { vec3 } from 'gl-matrix'
import { LUT } from './colortables.js'

export type ValuesArray = Array<{
  id: string
  vals: number[]
}>

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
  positions: number[]
  indices: number[]
  colors?: Float32Array
}

export type TRACT = {
  pts: number[]
  offsetPt0: number[]
  dps: ValuesArray
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
  pts: number[]
  offsetPt0: number[]
  dps: ValuesArray
  dpv: ValuesArray
}

export type TCK = {
  pts: number[]
  offsetPt0: number[]
}

export type VTK =
  | DefaultMeshType
  | {
      pts: number[]
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
      positions: number[] | null
      indices: number[] | null
      scalars: Float32Array
      colors: Float32Array | null
    }

export type GII = {
  scalars: Float32Array
  positions?: number[]
  indices?: number[]
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
  indices: number[]
  rgba255: number[]
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
