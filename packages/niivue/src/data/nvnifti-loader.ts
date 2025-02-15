import * as nifti from 'nifti-reader-js'
import { mat4, vec3 } from 'gl-matrix'
import { v4 as uuidv4 } from 'uuid'
import { LUT } from '../colortables.js'
import { TypedVoxelArray } from '../nvimage/index.js'
import { ImageType, isAffineOK } from '../nvimage/utils.js'
import { NVFileLoader, DataFileType } from './nvfile-loader.js'
import { NVVolumeLoader, NVDataType } from './nvvolume-loader.js'

export interface NiftiLoaderConfig {
  url?: string | Uint8Array | ArrayBuffer
  file?: File | File[]
  urlImgData?: string
  headers?: Record<string, string>
  name?: string
  colormap?: string
  opacity?: number
  cal_min?: number
  cal_max?: number
  trustCalMinMax?: boolean
  percentileFrac?: number
  ignoreZeroVoxels?: boolean
  useQFormNotSForm?: boolean
  colormapNegative?: string
  frame4D?: number
  isManifest?: boolean
  limitFrames4D?: number
  imageType?: DataFileType
  colorbarVisible?: boolean
  buffer?: ArrayBuffer
}

export class NVNiftiLoader extends NVVolumeLoader {
  name: string
  id: string
  url?: string
  headers?: Record<string, string>
  _colormap: string
  _opacity: number
  percentileFrac: number
  ignoreZeroVoxels: boolean
  trustCalMinMax: boolean
  colormapNegative: string
  colormapLabel: LUT | null = null
  colormapInvert?: boolean
  nFrame4D?: number
  frame4D: number
  nTotalFrame4D?: number
  cal_minNeg: number
  cal_maxNeg: number
  colorbarVisible = true
  modulationImage: number | null = null
  modulateAlpha = 0
  series: any = []
  nVox3D?: number
  oblique_angle?: number
  maxShearDeg?: number
  useQFormNotSForm: boolean
  colormapType?: number

  pixDims?: number[]
  matRAS?: mat4
  pixDimsRAS?: number[]
  obliqueRAS?: mat4
  dimsRAS?: number[]
  permRAS?: number[]
  img2RASstep?: number[]
  img2RASstart?: number[]
  toRAS?: mat4
  toRASvox?: mat4

  frac2mm?: mat4
  frac2mmOrtho?: mat4
  extentsMinOrtho?: number[]
  extentsMaxOrtho?: number[]
  mm2ortho?: mat4

  hdr: nifti.NIFTI1 | nifti.NIFTI2 | null = null
  imageType?: ImageType
  img?: TypedVoxelArray
  imaginary?: Float32Array
  v1?: Float32Array
  fileObject?: File | File[]
  dims?: number[]
  affine: number[][] = []

  onColormapChange: (img: NVNiftiLoader) => void = () => {}
  onOpacityChange: (img: NVNiftiLoader) => void = () => {}

  mm000?: vec3
  mm100?: vec3
  mm010?: vec3
  mm001?: vec3

  cal_min?: number
  cal_max?: number
  robust_min?: number
  robust_max?: number
  global_min?: number
  global_max?: number

  urlImgData?: string
  isManifest?: boolean
  limitFrames4D?: number

  constructor(buffer: ArrayBuffer, config: NiftiLoaderConfig) {
    const parsedHeader = nifti.readHeader(buffer)
    if (!parsedHeader) {
      throw new Error('Invalid NIfTI file')
    }

    const dimensions: [number, number, number] = [parsedHeader.dims[1], parsedHeader.dims[2], parsedHeader.dims[3]]

    const imageData = nifti.isCompressed(buffer)
      ? nifti.readImage(parsedHeader, nifti.decompress(buffer) as ArrayBuffer)
      : nifti.readImage(parsedHeader, buffer)

    // 🔹 Determine `NVDataType` from header
    const datatype = NVNiftiLoader.mapNiftiToNVDataType(parsedHeader.datatypeCode)
    super(imageData, dimensions, datatype)

    this.hdr = parsedHeader
    this.name = config.name || 'unknown'
    this.id = uuidv4()
    this.frame4D = config.frame4D || 0
    this.cal_minNeg = config.cal_min ?? NaN
    this.cal_maxNeg = config.cal_max ?? NaN
    this.trustCalMinMax = config.trustCalMinMax ?? true
    this.ignoreZeroVoxels = config.ignoreZeroVoxels ?? false
    this.percentileFrac = config.percentileFrac ?? 0.02
    this.useQFormNotSForm = config.useQFormNotSForm ?? false
    this._colormap = config.colormap ?? 'gray'
    this._opacity = config.opacity ?? 1.0
    this.colorbarVisible = config.colorbarVisible ?? true
    this.affine = this.computeAffine(parsedHeader)
    this.extractMetadata(parsedHeader)
  }

  private computeAffine(hdr: nifti.NIFTI1 | nifti.NIFTI2): number[][] {
    const affineOK = hdr.affine && isAffineOK(hdr.affine)

    if (!affineOK || hdr.qform_code > hdr.sform_code) {
      const { quatern_b: b, quatern_c: c, quatern_d: d } = hdr
      const a = Math.sqrt(1.0 - (b * b + c * c + d * d))
      const qfac = hdr.pixDims[0] === 0 ? 1 : hdr.pixDims[0]

      const quatern_R = [
        [a * a + b * b - c * c - d * d, 2 * b * c - 2 * a * d, 2 * b * d + 2 * a * c],
        [2 * b * c + 2 * a * d, a * a + c * c - b * b - d * d, 2 * c * d - 2 * a * b],
        [2 * b * d - 2 * a * c, 2 * c * d + 2 * a * b, a * a + d * d - c * c - b * b]
      ]

      const affine = hdr.affine
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          affine[i][j] = quatern_R[i][j] * hdr.pixDims[j + 1]
          if (j === 2) {
            affine[i][j] *= qfac
          }
        }
      }

      affine[0][3] = hdr.qoffset_x
      affine[1][3] = hdr.qoffset_y
      affine[2][3] = hdr.qoffset_z
      return affine
    }

    return hdr.affine
  }

  private static mapNiftiToNVDataType(datatypeCode: number): NVDataType {
    switch (datatypeCode) {
      case nifti.NIFTI1.TYPE_UINT8:
        return NVDataType.UINT8
      case nifti.NIFTI1.TYPE_INT16:
        return NVDataType.INT16
      case nifti.NIFTI1.TYPE_FLOAT32:
        return NVDataType.FLOAT32
      case nifti.NIFTI1.TYPE_FLOAT64:
        return NVDataType.FLOAT64
      case nifti.NIFTI1.TYPE_UINT16:
        return NVDataType.UINT16
      case nifti.NIFTI1.TYPE_INT8:
        return NVDataType.INT8
      case nifti.NIFTI1.TYPE_INT32:
        return NVDataType.INT32
      case nifti.NIFTI1.TYPE_UINT32:
        return NVDataType.UINT32
      case nifti.NIFTI1.TYPE_RGB24:
        return NVDataType.RGB24
      case nifti.NIFTI1.TYPE_INT64:
        return NVDataType.FLOAT64 // Convert INT64 to FLOAT64 (since JS lacks native int64)
      default:
        console.warn(`Unsupported NIfTI datatype: ${datatypeCode}, defaulting to FLOAT32`)
        return NVDataType.FLOAT32
    }
  }

  private extractMetadata(hdr: nifti.NIFTI1 | nifti.NIFTI2): void {
    this.pixDims = hdr.pixDims.slice(1, 4)
    this.dims = hdr.dims.slice(1, 4)
    this.matRAS = mat4.create()
    this.pixDimsRAS = this.pixDims.slice()
    this.nFrame4D = hdr.dims[4] || 1
    this.nTotalFrame4D = this.nFrame4D
  }

  static async create(config: NiftiLoaderConfig): Promise<NVNiftiLoader> {
    const buffer = await NVFileLoader.fetchBinary(config.url! as string)
    return new NVNiftiLoader(buffer, config)
  }

  static async createFromFile(config: NiftiLoaderConfig): Promise<NVNiftiLoader> {
    const fileBuffer = await NVFileLoader.readFile(config.file! as File)
    return new NVNiftiLoader(fileBuffer, config)
  }
}
