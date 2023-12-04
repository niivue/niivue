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
