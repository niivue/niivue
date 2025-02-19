import * as nifti from 'nifti-reader-js'
import { mat4, vec3 } from 'gl-matrix'
import { v4 as uuidv4 } from 'uuid'
import { LUT } from '../colortables.js'
import { TypedVoxelArray } from '../nvimage/index.js'
import { ImageType, isAffineOK } from '../nvimage/utils.js'
import { NVData, DataFileType } from './nvdata.js'
import { NVVolumeData, NVDataType } from './nvvolume-data.js'
import { NVImage } from '../nvimage/index.js'

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

export class NVNiftiData extends NVVolumeData {
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

  onColormapChange: (img: NVNiftiData) => void = () => {}
  onOpacityChange: (img: NVNiftiData) => void = () => {}

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
    const datatype = NVNiftiData.mapNiftiToNVDataType(parsedHeader.datatypeCode)
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

  static async create(config: NiftiLoaderConfig): Promise<NVNiftiData> {
    const buffer = await NVData.fetchBinary(config.url! as string)
    return new NVNiftiData(buffer, config)
  }

  static async createFromFile(config: NiftiLoaderConfig): Promise<NVNiftiData> {
    const fileBuffer = await NVData.readFile(config.file! as File)
    return new NVNiftiData(fileBuffer, config)
  }

  /**
   * Ensures the input is formatted as a number[][] (4x4 matrix).
   * @param input - Can be Float32Array, number[][], or unknown[]
   * @returns A properly formatted number[][] matrix.
   */
  static ensureMatrixFormat(input: unknown): number[][] {
    if (input instanceof Float32Array) {
      // Convert Float32Array to number[][] (assuming 4x4 format)
      return [
        [input[0], input[1], input[2], input[3]],
        [input[4], input[5], input[6], input[7]],
        [input[8], input[9], input[10], input[11]],
        [input[12], input[13], input[14], input[15]]
      ]
    } else if (
      Array.isArray(input) &&
      input.length === 4 &&
      input.every((row) => Array.isArray(row) && row.length === 4)
    ) {
      // Already a number[][], ensure typing
      return input as number[][]
    } else {
      throw new Error('Invalid affine matrix format')
    }
  }

  /**
   * Returns a 4x4 identity matrix as a number[][].
   */
  static identityMatrix(): number[][] {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]
  }

  /**
   * Converts an NVImage instance to NVNiftiData.
   * @param nvImage - The NVImage instance.
   * @returns A new NVNiftiData instance.
   */
  static fromNVImage(nvImage: any): NVNiftiData {
    if (!nvImage.img || !nvImage.hdr) {
      throw new Error('NVImage instance is missing required properties (img, hdr)')
    }

    // Extract image dimensions
    const dimensions: [number, number, number] = [
      nvImage.dimsRAS![1], // Width
      nvImage.dimsRAS![2], // Height
      nvImage.dimsRAS![3] // Depth
    ]

    // Extract and convert datatype
    const datatype = NVNiftiData.mapNiftiToNVDataType(nvImage.hdr.datatypeCode)

    // Extract affine transformation (ensure it's a valid 4x4 matrix)
    const affine = nvImage.matRAS ? NVNiftiData.ensureMatrixFormat(nvImage.matRAS) : NVNiftiData.identityMatrix()


    // Extract pixel dimensions
    const pixDims = nvImage.pixDimsRAS ? nvImage.pixDimsRAS.slice(0, 3) : [1, 1, 1]

    // Convert colormap, opacity, and other properties
    const config: NiftiLoaderConfig = {
      name: nvImage.name || 'Converted Image',
      colormap: nvImage._colormap || 'gray',
      opacity: nvImage._opacity || 1.0,
      cal_min: nvImage.cal_min,
      cal_max: nvImage.cal_max,
      trustCalMinMax: nvImage.trustCalMinMax || false,
      percentileFrac: nvImage.percentileFrac || 0.02,
      ignoreZeroVoxels: nvImage.ignoreZeroVoxels || false,
      useQFormNotSForm: nvImage.useQFormNotSForm || false,
      colormapNegative: nvImage.colormapNegative || '',
      frame4D: nvImage.frame4D || 0,
      colorbarVisible: nvImage.colorbarVisible || true,
      buffer: nvImage.img.buffer // Use raw buffer from NVImage
    }

    // Create new NVNiftiData instance
    const nvNiftiData = new NVNiftiData(nvImage.img.buffer, config)

    // Assign extracted metadata
    nvNiftiData.affine = affine
    nvNiftiData.pixDims = pixDims
    nvNiftiData.matRAS = mat4.clone(nvImage.matRAS)
    nvNiftiData.toRAS = mat4.clone(nvImage.toRAS)
    nvNiftiData.toRASvox = mat4.clone(nvImage.toRASvox)
    nvNiftiData.dimsRAS = dimensions
    nvNiftiData.permRAS = nvImage.permRAS ? nvImage.permRAS.slice() : [1, 2, 3]
    nvNiftiData.img2RASstep = nvImage.img2RASstep ? nvImage.img2RASstep.slice() : [1, 1, 1]
    nvNiftiData.img2RASstart = nvImage.img2RASstart ? nvImage.img2RASstart.slice() : [0, 0, 0]

    // Assign mm000, mm100, mm010, mm001 (corner voxel locations in mm)
    nvNiftiData.mm000 = vec3.clone(nvImage.mm000)
    nvNiftiData.mm100 = vec3.clone(nvImage.mm100)
    nvNiftiData.mm010 = vec3.clone(nvImage.mm010)
    nvNiftiData.mm001 = vec3.clone(nvImage.mm001)

    return nvNiftiData
  }

  /**
   * Converts NVNiftiData to NVImage.
   * @returns A new NVImage instance.
   */
  toNVImage(): NVImage {
    if (!this.hdr) {
      throw new Error('NVNiftiData has no header information')
    }

    // Ensure affine transformation is in the correct format
    const matRAS = NVNiftiData.convertToMat4(this.affine)

    // Extract voxel dimensions
    const pixDimsRAS = this.pixDims ? [...this.pixDims] : [1, 1, 1]

    // Ensure the voxel buffer is an ArrayBuffer
    const imgBuffer = this.volumeData.buffer as ArrayBuffer

    // Create NVImage instance
    const nvImage = new NVImage(
      imgBuffer,
      this.name || 'Converted Image',
      this._colormap || 'gray',
      this._opacity || 1.0,
      null, // pairedImgData (only relevant for separate header/image formats)
      this.cal_min ?? NaN,
      this.cal_max ?? NaN,
      this.trustCalMinMax,
      this.percentileFrac,
      this.ignoreZeroVoxels,
      this.useQFormNotSForm,
      this.colormapNegative || '',
      this.frame4D || 0,
      this.imageType || 0,
      this.cal_minNeg ?? NaN,
      this.cal_maxNeg ?? NaN,
      this.colorbarVisible,
      this.colormapLabel || null,
      this.colormapType ?? 0
    )

    // Assign affine transformation and voxel information
    nvImage.matRAS = matRAS
    nvImage.pixDimsRAS = pixDimsRAS
    nvImage.dimsRAS = this.dimsRAS ? [...this.dimsRAS] : [1, 1, 1, 1]
    nvImage.permRAS = this.permRAS ? [...this.permRAS] : [1, 2, 3]

    // Ensure mm000, mm100, mm010, mm001 are vec3 (Float32Array)
    nvImage.mm000 = NVNiftiData.convertToVec3(this.mm000)
    nvImage.mm100 = NVNiftiData.convertToVec3(this.mm100)
    nvImage.mm010 = NVNiftiData.convertToVec3(this.mm010)
    nvImage.mm001 = NVNiftiData.convertToVec3(this.mm001)

    return nvImage
  }

  /**
   * Converts a 4x4 number[][] into a mat4.
   * @param matrix - The input matrix (number[][] or mat4)
   * @returns A mat4-compatible Float32Array.
   */
  static convertToMat4(matrix: number[][] | mat4): mat4 {
    if (matrix instanceof Float32Array) {
      return matrix // Already a mat4
    }
    if (!Array.isArray(matrix) || matrix.length !== 4 || matrix.some(row => row.length !== 4)) {
      throw new Error('Invalid affine matrix format: Expected 4x4 number[][]')
    }

    return mat4.fromValues(
      matrix[0][0], matrix[0][1], matrix[0][2], matrix[0][3],
      matrix[1][0], matrix[1][1], matrix[1][2], matrix[1][3],
      matrix[2][0], matrix[2][1], matrix[2][2], matrix[2][3],
      matrix[3][0], matrix[3][1], matrix[3][2], matrix[3][3]
    )
  }

  /**
   * Ensures that an input value is a vec3 (Float32Array of length 3).
   * @param value - The input array (number[] | Float32Array | undefined)
   * @returns A vec3-compatible Float32Array.
   */
  static convertToVec3(value: number[] | Float32Array | undefined): vec3 {
    if (value instanceof Float32Array) {
      return value // Already a vec3
    }
    if (!value || value.length !== 3) {
      return vec3.fromValues(0, 0, 0) // Default value
    }
    return vec3.fromValues(value[0], value[1], value[2])
  }
  
}
