type AnyNumberArray =
  | number[]
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

export type NVMeshLayer = {
  url?: string
  name?: string
  opacity?: number
  colormap?: string
  colormapNegative?: string
  colormapInvert?: boolean
  useNegativeCmap?: boolean
  global_min?: number
  global_max?: number
  cal_min: number
  cal_max: number
  cal_minNeg: number
  cal_maxNeg: number
  isAdditiveBlend?: boolean
  frame4D: number
  nFrame4D: number
  values: AnyNumberArray
  outlineBorder?: number
  isTransparentBelowCalMin?: boolean
  alphaThreshold?: boolean
  base64?: string
  colorbarVisible?: boolean
}
