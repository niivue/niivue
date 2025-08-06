import { vec3, vec4 } from 'gl-matrix'
import { NVLabel3D } from '@/nvlabel'
import { SLICE_TYPE } from '@/nvdocument'

export type NiftiHeader = {
  littleEndian: boolean
  dim_info: number
  dims: number[]
  pixDims: number[]
  intent_p1: number
  intent_p2: number
  intent_p3: number
  intent_code: number
  datatypeCode: number
  numBitsPerVoxel: number
  slice_start: number
  vox_offset: number
  scl_slope: number
  scl_inter: number
  slice_end: number
  slice_code: number
  xyzt_units: number
  cal_max: number
  cal_min: number
  slice_duration: number
  toffset: number
  description: string
  aux_file: string
  qform_code: number
  sform_code: number

  quatern_b: number
  quatern_c: number
  quatern_d: number
  qoffset_x: number
  qoffset_y: number
  qoffset_z: number
  affine: number[][]
  intent_name: string
  magic: string
}

// TODO: add volume type
// TODO: this seems to be simply NVImage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Volume = Record<string, any>

export type Point = {
  comments: Array<{
    text: string
    prefilled?: string
  }>
  coordinates: {
    x: number
    y: number
    z: number
  }
}

/**
 * Represents the vertices of a connectome
 * @ignore
 */
export type NVConnectomeNode = {
  // name of node
  name: string
  x: number
  y: number
  z: number
  // color value of node (actual color determined by colormap)
  colorValue: number
  // size value of node (actual size determined by node scale times this value in mms)
  sizeValue: number
  label?: NVLabel3D
}

/**
 * Represents edges between connectome nodes
 * @ignore
 */
export type NVConnectomeEdge = {
  // index of first node
  first: number
  // index of second node
  second: number
  // color value to determine color of edge based on color map
  colorValue: number
}

export type ConnectomeOptions = {
  name: string
  nodeColormap: string
  nodeColormapNegative: string
  nodeMinColor: number
  nodeMaxColor: number
  // scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
  nodeScale: number
  edgeColormap: string
  edgeColormapNegative: string
  edgeMin: number
  edgeMax: number
  edgeScale: number
  legendLineThickness?: number
  showLegend?: boolean
}

export type Connectome = ConnectomeOptions & {
  nodes: NVConnectomeNode[]
  edges: NVConnectomeEdge[]
}

export type LegacyNodes = {
  names: string[]
  prefilled: unknown[]
  X: number[]
  Y: number[]
  Z: number[]
  Color: number[]
  Size: number[]
}

export type LegacyConnectome = Partial<ConnectomeOptions> & {
  nodes: LegacyNodes
  edges: number[]
}

export type DragReleaseParams = {
  fracStart: vec3
  fracEnd: vec3
  voxStart: vec3
  voxEnd: vec3
  mmStart: vec4
  mmEnd: vec4
  mmLength: number
  tileIdx: number
  axCorSag: SLICE_TYPE
}

export type NiiVueLocationValue = {
  id: string
  mm: vec4
  name: string
  value: number
  vox: vec3
}

export type NiiVueLocation = {
  axCorSag: number
  frac: vec3
  mm: vec4
  string: string
  values: NiiVueLocationValue[]
  vox: vec3
  xy: [number, number]
}

export type SyncOpts = {
  '3d'?: boolean
  '2d'?: boolean
  zoomPan?: boolean
  cal_min?: boolean
  cal_max?: boolean
  gamma?: boolean
  useSliceOffset?: boolean
  sliceType?: boolean
  crosshair?: boolean
  clipPlane?: boolean
}
