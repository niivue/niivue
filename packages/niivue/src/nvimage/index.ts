import { NIFTI1, NIFTI2, NIFTIEXTENSION, readHeaderAsync } from 'nifti-reader-js'
import * as zarr from 'zarrita'
import { mat3, mat4, vec3, vec4 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { Gunzip } from 'fflate'
import { ColorMap, LUT, cmapper } from '@/colortables'
import { log } from '@/logger'
import {
  ImageFromBase64,
  ImageFromFileOptions,
  ImageFromUrlOptions,
  ImageMetadata,
  ImageType,
  NVIMAGE_TYPE,
  NiiDataType,
  NiiIntentCode,
  NVImageFromUrlOptions,
  hdrToArrayBuffer,
  isAffineOK,
  isPlatformLittleEndian,
  uncompressStream
} from '@/nvimage/utils'
import * as ImageWriter from '@/nvimage/ImageWriter'
import * as VolumeUtils from '@/nvimage/VolumeUtils'
import * as ImageReaders from '@/nvimage/ImageReaders'
import * as CoordinateTransform from '@/nvimage/CoordinateTransform'
import * as ImageOrientation from '@/nvimage/ImageOrientation'
import * as TensorProcessing from '@/nvimage/TensorProcessing'
import * as IntensityCalibration from '@/nvimage/IntensityCalibration'
import * as ColormapManager from '@/nvimage/ColormapManager'

export * from '@/nvimage/utils'
export type TypedVoxelArray = Float32Array | Uint8Array | Int16Array | Float64Array | Uint16Array

/**
 * a NVImage encapsulates some image data and provides methods to query and operate on images
 */
export class NVImage {
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
  // TODO see niivue/loadDocument
  colormapLabel: LUT | null
  colormapInvert?: boolean
  nFrame4D?: number
  frame4D: number // indexed from 0!
  nTotalFrame4D?: number
  cal_minNeg: number
  cal_maxNeg: number
  colorbarVisible = true
  modulationImage: number | null = null
  modulateAlpha = 0 // if !=0, mod transparency with expon power |Alpha|
  // TODO this is some Daikon internal thing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: any = [] // for concatenating dicom images
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

  hdr: NIFTI1 | NIFTI2 | null = null
  extensions?: NIFTIEXTENSION[]
  imageType?: ImageType
  img?: TypedVoxelArray
  imaginary?: Float32Array // only for complex data
  v1?: Float32Array // only for FIB files
  fileObject?: File | File[]
  dims?: number[]

  onColormapChange: (img: NVImage) => void = () => {}
  onOpacityChange: (img: NVImage) => void = () => {}

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

  // TODO referenced by niivue/loadVolumes
  urlImgData?: string
  isManifest?: boolean
  limitFrames4D?: number

  constructor(
    // can be an array of Typed arrays or just a typed array. If an array of Typed arrays then it is assumed you are loading DICOM (perhaps the only real use case?)
    dataBuffer: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null = null,
    name = '',
    colormap = 'gray',
    opacity = 1.0,
    pairedImgData: ArrayBuffer | null = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    // TODO this was marked as true by default in the docs!
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    cal_minNeg = NaN,
    cal_maxNeg = NaN,
    colorbarVisible = true,
    colormapLabel: LUT | null = null,
    colormapType = 0
  ) {
    this.init(
      dataBuffer,
      name,
      colormap,
      opacity,
      pairedImgData,
      cal_min,
      cal_max,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      useQFormNotSForm,
      colormapNegative,
      frame4D,
      imageType,
      cal_minNeg,
      cal_maxNeg,
      colorbarVisible,
      colormapLabel,
      colormapType
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(
    // can be an array of Typed arrays or just a typed array. If an array of Typed arrays then it is assumed you are loading DICOM (perhaps the only real use case?)
    dataBuffer: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null = null,
    name = '',
    colormap = '',
    opacity = 1.0,
    _pairedImgData: ArrayBuffer | null = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    cal_minNeg = NaN,
    cal_maxNeg = NaN,
    colorbarVisible = true,
    colormapLabel: LUT | null = null,
    colormapType = 0,
    imgRaw: ArrayBuffer | ArrayBufferLike | null = null
  ): void {
    const isNoColormap = colormap === ''
    if (isNoColormap) {
      colormap = 'gray'
    }
    this.name = name
    this.imageType = imageType
    this.id = uuidv4()
    this._colormap = colormap
    this._opacity = opacity > 1.0 ? 1.0 : opacity // make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
    this.percentileFrac = percentileFrac
    this.ignoreZeroVoxels = ignoreZeroVoxels
    this.trustCalMinMax = trustCalMinMax
    this.colormapNegative = colormapNegative
    this.colormapLabel = colormapLabel
    this.frame4D = frame4D // indexed from 0!
    this.cal_minNeg = cal_minNeg
    this.cal_maxNeg = cal_maxNeg
    this.colorbarVisible = colorbarVisible
    this.colormapType = colormapType // COLORMAP_TYPE MIN_TO_MAX
    // TODO this was missing
    this.useQFormNotSForm = useQFormNotSForm
    // Added to support zerosLike
    // TODO this line causes an absurd amount of handling undefined fields - it would probably be better to isolate this as a separate class.
    if (!dataBuffer) {
      return
    }
    if (isNoColormap && this.hdr && this.hdr.intent_code === 1002) {
      colormap = 'random'
      this._colormap = colormap
    }
    if (this.hdr && typeof this.hdr.magic === 'number') {
      this.hdr.magic = 'n+1'
    } // fix for issue 481, where magic is set to the number 1 rather than a string
    this.nFrame4D = 1
    if (this.hdr) {
      for (let i = 4; i < 7; i++) {
        if (this.hdr.dims[i] > 1) {
          this.nFrame4D *= this.hdr.dims[i]
        }
      }
    }
    this.frame4D = Math.min(this.frame4D, this.nFrame4D - 1)
    this.nTotalFrame4D = this.nFrame4D

    if (!this.hdr || !imgRaw) {
      return
    }

    this.nVox3D = this.hdr.dims[1] * this.hdr.dims[2] * this.hdr.dims[3]
    const bytesPerVol = this.nVox3D * (this.hdr.numBitsPerVoxel / 8)
    const nVol4D = imgRaw.byteLength / bytesPerVol
    if (nVol4D !== this.nFrame4D) {
      if (nVol4D > 0 && nVol4D * bytesPerVol === imgRaw.byteLength) {
        log.debug('Loading the first ' + nVol4D + ' of ' + this.nFrame4D + ' volumes')
      } else {
        log.warn('This header does not match voxel data', this.hdr, imgRaw.byteLength)
      }
      this.nFrame4D = nVol4D
    }

    // n.b. NIfTI standard says "NIFTI_INTENT_RGB_VECTOR" should be RGBA, but FSL only stores RGB
    if (
      (this.hdr.intent_code === NiiIntentCode.NIFTI_INTENT_VECTOR ||
        this.hdr.intent_code === NiiIntentCode.NIFTI_INTENT_RGB_VECTOR) &&
      this.nFrame4D === 3 &&
      this.hdr.datatypeCode === NiiDataType.DT_FLOAT32
    ) {
      // change data from float32 to rgba32
      imgRaw = this.float32V1asRGBA(new Float32Array(imgRaw)).buffer as ArrayBuffer
    } // NIFTI_INTENT_VECTOR: this is a RGB tensor
    if (this.hdr.pixDims[1] === 0.0 || this.hdr.pixDims[2] === 0.0 || this.hdr.pixDims[3] === 0.0) {
      log.error('pixDims not plausible', this.hdr)
    }
    if (isNaN(this.hdr.scl_slope) || this.hdr.scl_slope === 0.0) {
      this.hdr.scl_slope = 1.0
    } // https://github.com/nipreps/fmriprep/issues/2507
    if (isNaN(this.hdr.scl_inter)) {
      this.hdr.scl_inter = 0.0
    }
    let affineOK = isAffineOK(this.hdr.affine)
    if (useQFormNotSForm || !affineOK || this.hdr.qform_code > this.hdr.sform_code) {
      log.debug('spatial transform based on QForm')
      // https://github.com/rii-mango/NIFTI-Reader-JS/blob/6908287bf99eb3bc4795c1591d3e80129da1e2f6/src/nifti1.js#L238
      // Define a, b, c, d for coding convenience
      const b = this.hdr.quatern_b
      const c = this.hdr.quatern_c
      const d = this.hdr.quatern_d
      // quatern_a is a parameter in quaternion [a, b, c, d], which is required in affine calculation (METHOD 2)
      // mentioned in the nifti1.h file
      // It can be calculated by a = sqrt(1.0-(b*b+c*c+d*d))
      const a = Math.sqrt(1.0 - (Math.pow(b, 2) + Math.pow(c, 2) + Math.pow(d, 2)))
      const qfac = this.hdr.pixDims[0] === 0 ? 1 : this.hdr.pixDims[0]
      const quatern_R = [
        [a * a + b * b - c * c - d * d, 2 * b * c - 2 * a * d, 2 * b * d + 2 * a * c],
        [2 * b * c + 2 * a * d, a * a + c * c - b * b - d * d, 2 * c * d - 2 * a * b],
        [2 * b * d - 2 * a * c, 2 * c * d + 2 * a * b, a * a + d * d - c * c - b * b]
      ]
      const affine = this.hdr.affine
      for (let ctrOut = 0; ctrOut < 3; ctrOut += 1) {
        for (let ctrIn = 0; ctrIn < 3; ctrIn += 1) {
          affine[ctrOut][ctrIn] = quatern_R[ctrOut][ctrIn] * this.hdr.pixDims[ctrIn + 1]
          if (ctrIn === 2) {
            affine[ctrOut][ctrIn] *= qfac
          }
        }
      }
      // The last row of affine matrix is the offset vector
      affine[0][3] = this.hdr.qoffset_x
      affine[1][3] = this.hdr.qoffset_y
      affine[2][3] = this.hdr.qoffset_z
      this.hdr.affine = affine
    }
    affineOK = isAffineOK(this.hdr.affine)
    if (!affineOK) {
      log.debug('Defective NIfTI: spatial transform does not make sense')
      let x = this.hdr.pixDims[1]
      let y = this.hdr.pixDims[2]
      let z = this.hdr.pixDims[3]
      if (isNaN(x) || x === 0.0) {
        x = 1.0
      }
      if (isNaN(y) || y === 0.0) {
        y = 1.0
      }
      if (isNaN(z) || z === 0.0) {
        z = 1.0
      }
      this.hdr.pixDims[1] = x
      this.hdr.pixDims[2] = y
      this.hdr.pixDims[3] = z
      const affine = [
        [x, 0, 0, 0],
        [0, y, 0, 0],
        [0, 0, z, 0],
        [0, 0, 0, 1]
      ]
      this.hdr.affine = affine
    } // defective affine
    // swap data if foreign endian:
    if (
      this.hdr.datatypeCode !== NiiDataType.DT_RGB24 &&
      this.hdr.datatypeCode !== NiiDataType.DT_RGBA32 &&
      this.hdr.littleEndian !== isPlatformLittleEndian() &&
      this.hdr.numBitsPerVoxel > 8
    ) {
      if (this.hdr.numBitsPerVoxel === 16) {
        // inspired by https://github.com/rii-mango/Papaya
        const u16 = new Uint16Array(imgRaw)
        for (let i = 0; i < u16.length; i++) {
          const val = u16[i]
          u16[i] = ((((val & 0xff) << 8) | ((val >> 8) & 0xff)) << 16) >> 16 // since JS uses 32-bit  when bit shifting
        }
      } else if (this.hdr.numBitsPerVoxel === 32) {
        // inspired by https://github.com/rii-mango/Papaya
        const u32 = new Uint32Array(imgRaw)
        for (let i = 0; i < u32.length; i++) {
          const val = u32[i]
          u32[i] = ((val & 0xff) << 24) | ((val & 0xff00) << 8) | ((val >> 8) & 0xff00) | ((val >> 24) & 0xff)
        }
      } else if (this.hdr.numBitsPerVoxel === 64) {
        // inspired by MIT licensed code: https://github.com/rochars/endianness
        const numBytesPerVoxel = this.hdr.numBitsPerVoxel / 8
        const u8 = new Uint8Array(imgRaw)
        for (let index = 0; index < u8.length; index += numBytesPerVoxel) {
          let offset = numBytesPerVoxel - 1
          for (let x = 0; x < offset; x++) {
            const theByte = u8[index + x]
            u8[index + x] = u8[index + offset]
            u8[index + offset] = theByte
            offset--
          }
        }
      } // if 64-bits
    } // swap byte order
    switch (this.hdr.datatypeCode) {
      case NiiDataType.DT_UINT8:
        this.img = new Uint8Array(imgRaw)
        break
      case NiiDataType.DT_INT16:
        this.img = new Int16Array(imgRaw)
        break
      case NiiDataType.DT_FLOAT32:
        this.img = new Float32Array(imgRaw)
        break
      case NiiDataType.DT_FLOAT64:
        this.img = new Float64Array(imgRaw)
        break
      case NiiDataType.DT_RGB24:
        this.img = new Uint8Array(imgRaw)
        break
      case NiiDataType.DT_UINT16:
        this.img = new Uint16Array(imgRaw)
        break
      case NiiDataType.DT_RGBA32:
        this.img = new Uint8Array(imgRaw)
        break
      case NiiDataType.DT_INT8: {
        const i8 = new Int8Array(imgRaw)
        const vx8 = i8.length
        this.img = new Int16Array(vx8)
        for (let i = 0; i < vx8; i++) {
          this.img[i] = i8[i]
        }
        this.hdr.datatypeCode = NiiDataType.DT_INT16
        this.hdr.numBitsPerVoxel = 16
        break
      }
      case NiiDataType.DT_BINARY: {
        const nvox = this.hdr.dims[1] * this.hdr.dims[2] * Math.max(1, this.hdr.dims[3]) * Math.max(1, this.hdr.dims[4])
        const img1 = new Uint8Array(imgRaw)
        this.img = new Uint8Array(nvox)
        const lut = new Uint8Array(8)
        for (let i = 0; i < 8; i++) {
          lut[i] = Math.pow(2, i)
        }
        let i1 = -1
        for (let i = 0; i < nvox; i++) {
          const bit = i % 8
          if (bit === 0) {
            i1++
          }
          if ((img1[i1] & lut[bit]) !== 0) {
            this.img[i] = 1
          }
        }
        this.hdr.datatypeCode = NiiDataType.DT_UINT8
        this.hdr.numBitsPerVoxel = 8
        break
      }
      case NiiDataType.DT_UINT32: {
        const u32 = new Uint32Array(imgRaw)
        const vx32 = u32.length
        this.img = new Float64Array(vx32)
        for (let i = 0; i < vx32 - 1; i++) {
          this.img[i] = u32[i]
        }
        this.hdr.datatypeCode = NiiDataType.DT_FLOAT64
        break
      }
      case NiiDataType.DT_INT32: {
        const i32 = new Int32Array(imgRaw)
        const vxi32 = i32.length
        this.img = new Float64Array(vxi32)
        for (let i = 0; i < vxi32 - 1; i++) {
          this.img[i] = i32[i]
        }
        this.hdr.datatypeCode = NiiDataType.DT_FLOAT64
        break
      }
      case NiiDataType.DT_INT64: {
        const i64 = new BigInt64Array(imgRaw)
        const vx = i64.length
        this.img = new Float64Array(vx)
        for (let i = 0; i < vx - 1; i++) {
          this.img[i] = Number(i64[i])
        }
        this.hdr.datatypeCode = NiiDataType.DT_FLOAT64
        break
      }
      case NiiDataType.DT_COMPLEX64: {
        // saved as real/imaginary pairs: show real following fsleyes/MRIcroGL convention
        const f32 = new Float32Array(imgRaw)
        const nvx = Math.floor(f32.length / 2)
        this.imaginary = new Float32Array(nvx)
        this.img = new Float32Array(nvx)
        let r = 0
        for (let i = 0; i < nvx - 1; i++) {
          this.img[i] = f32[r]
          this.imaginary[i] = f32[r + 1]
          r += 2
        }
        this.hdr.datatypeCode = NiiDataType.DT_FLOAT32
        break
      }
      default:
        throw new Error('datatype ' + this.hdr.datatypeCode + ' not supported')
    }
    this.calculateRAS()
    if (!isNaN(cal_min)) {
      this.hdr.cal_min = cal_min
    }
    if (!isNaN(cal_max)) {
      this.hdr.cal_max = cal_max
    }
    this.calMinMax()
  }

  static async new(
    // can be an array of Typed arrays or just a typed array. If an array of Typed arrays then it is assumed you are loading DICOM (perhaps the only real use case?)
    dataBuffer: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null = null,
    name = '',
    colormap = '',
    opacity = 1.0,
    pairedImgData: ArrayBuffer | null = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    cal_minNeg = NaN,
    cal_maxNeg = NaN,
    colorbarVisible = true,
    colormapLabel: LUT | null = null,
    colormapType = 0,
    zarrData: null | unknown
  ): Promise<NVImage> {
    const newImg = new NVImage()
    const re = /(?:\.([^.]+))?$/
    let ext = re.exec(name)![1] || '' // TODO ! guaranteed?
    ext = ext.toUpperCase()
    if (ext === 'GZ') {
      ext = re.exec(name.slice(0, -3))![1] // img.trk.gz -> img.trk
      ext = ext.toUpperCase()
    }
    let imgRaw: ArrayBufferLike | Uint8Array | null = null
    if (imageType === NVIMAGE_TYPE.UNKNOWN) {
      imageType = NVIMAGE_TYPE.parse(ext)
    }
    if (dataBuffer instanceof ArrayBuffer && dataBuffer.byteLength >= 2 && imageType === NVIMAGE_TYPE.DCM) {
      // unknown extension defaults to DICOM, which starts `dcm`
      // since NIfTI1 is popular, lets make sure the filename has not been mangled
      const u8s = new Uint8Array(dataBuffer) // Create a view of the buffer
      const isNifti1 = (u8s[0] === 92 && u8s[1] === 1) || (u8s[1] === 92 && u8s[0] === 1)
      if (isNifti1) {
        imageType = NVIMAGE_TYPE.NII
      }
    }
    newImg.imageType = imageType
    switch (imageType) {
      case NVIMAGE_TYPE.DCM_FOLDER:
      case NVIMAGE_TYPE.DCM_MANIFEST:
      case NVIMAGE_TYPE.DCM:
        return
      case NVIMAGE_TYPE.FIB:
        ;[imgRaw, newImg.v1] = await ImageReaders.DsiStudio.readFIB(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.MIH:
      case NVIMAGE_TYPE.MIF:
        imgRaw = await ImageReaders.Mrtrix.readMIF(newImg, dataBuffer as ArrayBuffer, pairedImgData) // detached
        break
      case NVIMAGE_TYPE.NHDR:
      case NVIMAGE_TYPE.NRRD:
        imgRaw = await ImageReaders.Nrrd.readNrrd(newImg, dataBuffer as ArrayBuffer)
        if (imgRaw === null) {
          throw new Error(`Failed to parse NHDR/NRRD file ${name}`)
        }
        break
      case NVIMAGE_TYPE.MHD:
      case NVIMAGE_TYPE.MHA:
        imgRaw = await ImageReaders.Itk.readMHA(newImg, dataBuffer as ArrayBuffer, pairedImgData)
        break
      case NVIMAGE_TYPE.MGH:
      case NVIMAGE_TYPE.MGZ:
        imgRaw = await ImageReaders.Mgh.readMgh(newImg, dataBuffer as ArrayBuffer)
        if (imgRaw === null) {
          throw new Error(`Failed to parse MGH/MGZ file ${name}`)
        }
        break
      case NVIMAGE_TYPE.SRC:
        imgRaw = await ImageReaders.DsiStudio.readSRC(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.V:
        imgRaw = ImageReaders.Ecat.readECAT(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.V16:
        imgRaw = ImageReaders.BrainVoyager.readV16(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.VMR:
        imgRaw = ImageReaders.BrainVoyager.readVMR(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.HEAD:
        imgRaw = await ImageReaders.Afni.readHEAD(newImg, dataBuffer as ArrayBuffer, pairedImgData) // paired = .BRIK
        break
      case NVIMAGE_TYPE.BMP:
        imgRaw = await ImageReaders.Image.readBMP(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.NPY:
        imgRaw = await ImageReaders.Numpy.readNPY(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.NPZ:
        imgRaw = await ImageReaders.Numpy.readNPZ(newImg, dataBuffer as ArrayBuffer)
        break
      case NVIMAGE_TYPE.ZARR:
        imgRaw = await ImageReaders.Zarr.readZARR(newImg, dataBuffer as ArrayBuffer, zarrData)
        break
      case NVIMAGE_TYPE.NII:
        imgRaw = await ImageReaders.Nii.readNifti(newImg, dataBuffer as ArrayBuffer, pairedImgData)
        if (imgRaw === null) {
          throw new Error(`Failed to parse NIfTI file ${name}.`)
        }
        break
      default:
        throw new Error('Image type not supported')
    }
    newImg.init(
      dataBuffer,
      name,
      colormap,
      opacity,
      pairedImgData,
      cal_min,
      cal_max,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      useQFormNotSForm,
      colormapNegative,
      frame4D,
      imageType,
      cal_minNeg,
      cal_maxNeg,
      colorbarVisible,
      colormapLabel,
      colormapType,
      imgRaw
    )
    return newImg
  }

  // not included in public docs
  // detect difference between voxel grid and world space
  // https://github.com/afni/afni/blob/25e77d564f2c67ff480fa99a7b8e48ec2d9a89fc/src/thd_coords.c#L717
  computeObliqueAngle(mtx44: mat4): number {
    return ImageOrientation.computeObliqueAngle(mtx44)
  }

  float32V1asRGBA(inImg: Float32Array): Uint8Array {
    return TensorProcessing.float32V1asRGBA(this, inImg)
  }

  loadImgV1(isFlipX: boolean = false, isFlipY: boolean = false, isFlipZ: boolean = false): boolean {
    return TensorProcessing.loadImgV1(this, isFlipX, isFlipY, isFlipZ)
  }

  // not included in public docs
  // detect difference between voxel grid and world space
  calculateOblique(): void {
    ImageOrientation.calculateOblique(this)
  }


  // not included in public docs
  // read DICOM format image and treat it like a NIfTI
  // -----------------
  // readDICOM(buf: ArrayBuffer | ArrayBuffer[]): ArrayBuffer {
  //   this.series = new daikon.Series()
  //   // parse DICOM file
  //   if (Array.isArray(buf)) {
  //     for (let i = 0; i < buf.length; i++) {
  //       const dataview = new DataView(buf[i])
  //       const image = daikon.Series.parseImage(dataview)
  //       if (image === null) {
  //         log.error(daikon.Series.parserError)
  //       } else if (image.hasPixelData()) {
  //         // if it's part of the same series, add it
  //         if (this.series.images.length === 0 || image.getSeriesId() === this.series.images[0].getSeriesId()) {
  //           this.series.addImage(image)
  //         }
  //       } // if hasPixelData
  //     } // for i
  //   } else {
  //     // not a dicom folder drop
  //     const image = daikon.Series.parseImage(new DataView(buf))
  //     if (image === null) {
  //       log.error(daikon.Series.parserError)
  //     } else if (image.hasPixelData()) {
  //       // if it's part of the same series, add it
  //       if (this.series.images.length === 0 || image.getSeriesId() === this.series.images[0].getSeriesId()) {
  //         this.series.addImage(image)
  //       }
  //     }
  //   }
  //   // order the image files, determines number of frames, etc.
  //   this.series.buildSeries()
  //   // output some header info
  //   this.hdr = new nifti.NIFTI1()
  //   const hdr = this.hdr
  //   hdr.scl_inter = 0
  //   hdr.scl_slope = 1
  //   if (this.series.images[0].getDataScaleIntercept()) {
  //     hdr.scl_inter = this.series.images[0].getDataScaleIntercept()
  //   }
  //   if (this.series.images[0].getDataScaleSlope()) {
  //     hdr.scl_slope = this.series.images[0].getDataScaleSlope()
  //   }
  //   hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
  //   hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
  //   hdr.dims[1] = this.series.images[0].getCols()
  //   hdr.dims[2] = this.series.images[0].getRows()
  //   hdr.dims[3] = this.series.images[0].getNumberOfFrames()
  //   if (this.series.images.length > 1) {
  //     if (hdr.dims[3] > 1) {
  //       log.debug('To Do: multiple slices per file and multiple files (XA30 DWI)')
  //     }
  //     hdr.dims[3] = this.series.images.length
  //   }
  //   const rc = this.series.images[0].getPixelSpacing() // TODO: order?
  //   hdr.pixDims[1] = rc[0]
  //   hdr.pixDims[2] = rc[1]
  //   if (this.series.images.length > 1) {
  //     // Multiple slices. The depth of a pixel is the physical distance between offsets. This is not the same as slice
  //     // spacing for tilted slices (skew).
  //     const p0 = vec3.fromValues(...(this.series.images[0].getImagePosition() as [number, number, number]))
  //     const p1 = vec3.fromValues(...(this.series.images[1].getImagePosition() as [number, number, number]))
  //     const n = vec3.fromValues(0, 0, 0)
  //     vec3.subtract(n, p0, p1)
  //     hdr.pixDims[3] = vec3.length(n)
  //   } else {
  //     // Single slice. Use the slice thickness as pixel depth.
  //     hdr.pixDims[3] = this.series.images[0].getSliceThickness()
  //   }
  //   hdr.pixDims[4] = this.series.images[0].getTR() / 1000.0 // msec -> sec
  //   const dt = this.series.images[0].getDataType() // 2=int,3=uint,4=float,
  //   const bpv = this.series.images[0].getBitsAllocated()
  //   hdr.numBitsPerVoxel = bpv
  //   this.hdr.littleEndian = this.series.images[0].littleEndian
  //   if (bpv === 8 && dt === 2) {
  //     hdr.datatypeCode = NiiDataType.DT_INT8
  //   } else if (bpv === 8 && dt === 3) {
  //     hdr.datatypeCode = NiiDataType.DT_UINT8
  //   } else if (bpv === 16 && dt === 2) {
  //     hdr.datatypeCode = NiiDataType.DT_INT16
  //   } else if (bpv === 16 && dt === 3) {
  //     hdr.datatypeCode = NiiDataType.DT_UINT16
  //   } else if (bpv === 32 && dt === 2) {
  //     hdr.datatypeCode = NiiDataType.DT_INT32
  //   } else if (bpv === 32 && dt === 3) {
  //     hdr.datatypeCode = NiiDataType.DT_UINT32
  //   } else if (bpv === 32 && dt === 4) {
  //     hdr.datatypeCode = NiiDataType.DT_FLOAT32
  //   } else if (bpv === 64 && dt === 4) {
  //     hdr.datatypeCode = NiiDataType.DT_FLOAT64
  //   } else if (bpv === 1) {
  //     hdr.datatypeCode = NiiDataType.DT_BINARY
  //   } else {
  //     log.warn('Unsupported DICOM format: ' + dt + ' ' + bpv)
  //   }
  //   const voxelDimensions = hdr.pixDims.slice(1, 4)
  //   const m = getBestTransform(
  //     this.series.images[0].getImageDirections(),
  //     voxelDimensions,
  //     this.series.images[0].getImagePosition()
  //   )
  //   if (m) {
  //     hdr.sform_code = 1
  //     hdr.affine = [
  //       [m[0][0], m[0][1], m[0][2], m[0][3]],
  //       [m[1][0], m[1][1], m[1][2], m[1][3]],
  //       [m[2][0], m[2][1], m[2][2], m[2][3]],
  //       [0, 0, 0, 1]
  //     ]
  //   }
  //   let data
  //   let length = this.series.validatePixelDataLength(this.series.images[0])
  //   const buffer = new Uint8Array(new ArrayBuffer(length * this.series.images.length))
  //   // implementation copied from:
  //   // https://github.com/rii-mango/Daikon/blob/bbe08bad9758dfbdf31ca22fb79048c7bad85706/src/series.js#L496
  //   for (let i = 0; i < this.series.images.length; i++) {
  //     if (this.series.isMosaic) {
  //       data = this.series.getMosaicData(this.series.images[i], this.series.images[i].getPixelDataBytes())
  //     } else {
  //       data = this.series.images[i].getPixelDataBytes()
  //     }
  //     length = this.series.validatePixelDataLength(this.series.images[i])
  //     this.series.images[i].clearPixelData()
  //     buffer.set(new Uint8Array(data, 0, length), length * i)
  //   } // for images.length
  //   return buffer.buffer
  // } // readDICOM()
  // -----------------------

  // not included in public docs
  // read ECAT7 format image
  // https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info
  readECAT(buffer: ArrayBuffer): ArrayBuffer {
    return ImageReaders.Ecat.readECAT(this, buffer)
  }

  readV16(buffer: ArrayBuffer): ArrayBuffer {
    return ImageReaders.BrainVoyager.readV16(this, buffer)
  }

  async readNPY(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return ImageReaders.Numpy.readNPY(this, buffer)
  }

  async readNPZ(buffer: ArrayBuffer): Promise<ArrayBuffer | undefined> {
    return ImageReaders.Numpy.readNPZ(this, buffer)
  }

  async imageDataFromArrayBuffer(buffer: ArrayBuffer): Promise<ImageData> {
    return ImageReaders.Image.imageDataFromArrayBuffer(buffer)
  }

  async readBMP(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return ImageReaders.Image.readBMP(this, buffer)
  }

  async readZARR(buffer: ArrayBuffer, zarrData: unknown): Promise<ArrayBufferLike> {
    return ImageReaders.Zarr.readZARR(this, buffer, zarrData)
  }

  // not included in public docs
  // read brainvoyager format VMR image
  // https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/343-developer-guide-2-6-the-format-of-vmr-files
  readVMR(buffer: ArrayBuffer): ArrayBuffer {
    return ImageReaders.BrainVoyager.readVMR(this, buffer)
  }

  // not included in public docs
  // read DSI-Studio FIB format image
  // https://dsi-studio.labsolver.org/doc/cli_data.html
  async readFIB(buffer: ArrayBuffer): Promise<[ArrayBuffer, Float32Array]> {
    return ImageReaders.DsiStudio.readFIB(this, buffer)
  }

  // not included in public docs
  // read DSI-Studio SRC format image
  // https://dsi-studio.labsolver.org/doc/cli_data.html
  async readSRC(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return ImageReaders.DsiStudio.readSRC(this, buffer)
  }

  // not included in public docs
  // read AFNI head/brik format image
  async readHEAD(dataBuffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer> {
    return ImageReaders.Afni.readHEAD(this, dataBuffer, pairedImgData)
  }

  // not included in public docs
  // read ITK MHA format image
  // https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29
  async readMHA(buffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer> {
    return ImageReaders.Itk.readMHA(this, buffer, pairedImgData)
  }

  // not included in public docs
  // read mrtrix MIF format image
  // https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats
  async readMIF(buffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer> {
    return ImageReaders.Mrtrix.readMIF(this, buffer, pairedImgData)
  }

  // not included in public docs
  // Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  calculateRAS(): void {
    ImageOrientation.calculateRAS(this)
  }

  // Reorient raw header data to RAS
  // assume single volume, use nVolumes to specify, set nVolumes = 0 for same as input

  async hdr2RAS(nVolumes: number = 1): Promise<NIFTI1 | NIFTI2> {
    return ImageOrientation.hdr2RAS(this, nVolumes)
  }

  // Reorient raw image data to RAS
  // note that GPU-based orient shader is much faster
  // returns single 3D volume even for 4D input. Use nVolume to select volume (0 indexed)
  img2RAS(nVolume: number = 0): TypedVoxelArray {
    return ImageOrientation.img2RAS(this, nVolume)
  }

  // not included in public docs
  // convert voxel location (row, column slice, indexed from 0) to world space
  vox2mm(XYZ: number[], mtx: mat4): vec3 {
    return CoordinateTransform.vox2mm(this, XYZ, mtx)
  } // vox2mm()

  // not included in public docs
  // convert world space to voxel location (row, column slice, indexed from 0)
  mm2vox(mm: number[], frac = false): Float32Array | vec3 {
    return CoordinateTransform.mm2vox(this, mm, frac)
  } // mm2vox()

  // not included in public docs
  // returns boolean: are two arrays identical?
  // TODO this won't work for complex objects. Maybe use array-equal from NPM
  arrayEquals(a: unknown[], b: unknown[]): boolean {
    return CoordinateTransform.arrayEquals(a, b)
  }

  // not included in public docs
  // base function for niivue.setColormap()
  // colormaps are continuously interpolated between 256 values (0..256)
  setColormap(cm: string): void {
    ColormapManager.setColormap(this, cm)
  }

  // not included in public docs
  // base function for niivue.setColormap()
  // label colormaps are discretely sampled from an arbitrary number of colors
  setColormapLabel(cm: ColorMap): void {
    ColormapManager.setColormapLabel(this, cm)
  }

  async setColormapLabelFromUrl(url: string): Promise<void> {
    return ColormapManager.setColormapLabelFromUrl(this, url)
  }

  get colormap(): string {
    return ColormapManager.getColormap(this)
  }

  get colorMap(): string {
    return ColormapManager.getColormap(this)
  }

  // TODO duplicate fields, see niivue/loadDocument
  set colormap(cm: string) {
    ColormapManager.setColormap(this, cm)
  }

  set colorMap(cm: string) {
    ColormapManager.setColormap(this, cm)
  }

  get opacity(): number {
    return ColormapManager.getOpacity(this)
  }

  set opacity(opacity) {
    ColormapManager.setOpacity(this, opacity)
  }

  /**
   * set contrast/brightness to robust range (2%..98%)
   * @param vol - volume for estimate (use -1 to use estimate on all loaded volumes; use INFINITY for current volume)
   * @param isBorder - if true (default) only center of volume used for estimate
   * @returns volume brightness and returns array [pct2, pct98, mnScale, mxScale]
   * @see {@link https://niivue.com/demos/features/timeseries2.html | live demo usage}
   */
  calMinMax(vol: number = Number.POSITIVE_INFINITY, isBorder: boolean = true): number[] {
    return IntensityCalibration.calMinMax(this, vol, isBorder)
  }

  // not included in public docs
  // convert voxel intensity from stored value to scaled intensity
  intensityRaw2Scaled(raw: number): number {
    return IntensityCalibration.intensityRaw2Scaled(this, raw)
  }

  // convert voxel intensity from scaled intensity to stored value
  intensityScaled2Raw(scaled: number): number {
    return IntensityCalibration.intensityScaled2Raw(this, scaled)
  }

  /**
   * Converts NVImage to NIfTI compliant byte array, potentially compressed.
   * Delegates to ImageWriter.saveToUint8Array.
   */
  async saveToUint8Array(fnm: string, drawing8: Uint8Array | null = null): Promise<Uint8Array> {
    // Delegate to the writer module, passing the instance 'this'
    return ImageWriter.saveToUint8Array(this, fnm, drawing8)
  }

  /**
   * save image as NIfTI volume and trigger download.
   * Delegates to ImageWriter.saveToDisk.
   */
  async saveToDisk(fnm: string = '', drawing8: Uint8Array | null = null): Promise<Uint8Array> {
    // Delegate to the writer module, passing the instance 'this'
    return ImageWriter.saveToDisk(this, fnm, drawing8)
  }

  static async fetchDicomData(
    url: string,
    headers: Record<string, string> = {}
  ): Promise<Array<{ name: string; data: ArrayBuffer }>> {
    if (url === '') {
      throw Error('url must not be empty')
    }

    // https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
    const absoluteUrlRE = /^(?:[a-z+]+:)?\/\//i

    let manifestUrl = absoluteUrlRE.test(url) ? url : new URL(url, window.location.href)
    const extensionRE = /(?:.([^.]+))?$/
    const extension = extensionRE.exec((manifestUrl as URL).pathname)
    if (!extension) {
      manifestUrl = new URL('niivue-manifest.txt', url)
    }

    let response = await fetch(manifestUrl, { headers })
    if (!response.ok) {
      throw Error(response.statusText)
    }
    const text = await response.text()
    const lines = text.split('\n')

    const baseUrlRE = /(.*\/).*/
    const folderUrl = baseUrlRE.exec(manifestUrl as string)![0]
    const dataBuffer = []
    for (const line of lines) {
      const fileUrl = new URL(line, folderUrl)
      response = await fetch(fileUrl, { headers })
      if (!response.ok) {
        throw Error(response.statusText)
      }
      const contents = await response.arrayBuffer()
      dataBuffer.push({ name: line, data: contents })
    }
    return dataBuffer
  }

  static async readFirstDecompressedBytes(stream: ReadableStream<Uint8Array>, minBytes: number): Promise<Uint8Array> {
    const reader: ReadableStreamDefaultReader<Uint8Array> = stream.getReader()
    const gunzip = new Gunzip()

    const decompressedChunks: Uint8Array[] = []
    let totalDecompressed = 0
    let doneReading = false

    let resolveFn: (value: Uint8Array) => void
    let rejectFn: (reason?: any) => void

    const promise = new Promise<Uint8Array>((resolve, reject): undefined => {
      resolveFn = resolve
      rejectFn = reject
      return undefined
    })

    function finalize(): void {
      // Combine chunks into a single Uint8Array
      const result = new Uint8Array(totalDecompressed)
      let offset = 0
      for (const chunk of decompressedChunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      resolveFn(result)
    }

    gunzip.ondata = (chunk: Uint8Array): void => {
      decompressedChunks.push(chunk)
      totalDecompressed += chunk.length
      if (totalDecompressed >= minBytes) {
        doneReading = true
        reader.cancel().catch(() => {})
        finalize()
      }
    }
    ;(async (): Promise<void> => {
      try {
        while (!doneReading) {
          const { done, value } = await reader.read()
          if (done) {
            doneReading = true
            gunzip.push(new Uint8Array(), true) // Signal end-of-stream
            return
          }
          gunzip.push(value, false) // Push data into fflate
        }
      } catch (err) {
        rejectFn(err)
      }
    })().catch(() => {})

    return promise
  }

  static extractFilenameFromUrl(url: string): string | null {
    const params = new URL(url).searchParams
    const contentDisposition = params.get('response-content-disposition')
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/)
      if (match) {
        return decodeURIComponent(match[1])
      }
    }
    // Fallback: extract from pathname if possible
    return url.split('/').pop().split('?')[0]
  }

  static async loadInitialVolumesGz(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    if (isNaN(limitFrames4D)) {
      return null
    }
    const response = await fetch(url, { headers, cache: 'force-cache' })
    let hdrBytes = 352
    let hdrU8s = await this.readFirstDecompressedBytes(response.body, hdrBytes)
    const hdrView = new DataView(hdrU8s.buffer, hdrU8s.byteOffset, hdrU8s.byteLength)
    const u16 = hdrView.getUint16(0, true)
    const isNIfTI1 = u16 === 348
    const isNIfTI1be = u16 === 23553
    if (!isNIfTI1 && !isNIfTI1be) {
      return null
    }
    // start of edge cases: huge header extensions with small gz block size
    if (hdrU8s.length > 111) {
      hdrBytes = hdrView.getFloat32(108, isNIfTI1)
    }
    if (hdrBytes > hdrU8s.length) {
      hdrU8s = await this.readFirstDecompressedBytes(response.body, hdrBytes)
    }
    // end of edge case
    const isNifti1 = (hdrU8s[0] === 92 && hdrU8s[1] === 1) || (hdrU8s[1] === 92 && hdrU8s[0] === 1)
    if (!isNifti1) {
      return null
    }
    const hdr = await readHeaderAsync(hdrU8s.buffer as ArrayBuffer)
    if (!hdr) {
      throw new Error('Could not read NIfTI header')
    }
    // Calculate required data size
    const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
    const nVox3D = [1, 2, 3].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const nFrame4D = [4, 5, 6].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
    const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
    if (volsToLoad === nFrame4D) {
      // read entire file: compression streams is faster than fflate
      return null
    }
    const responseImg = await fetch(url, { headers, cache: 'force-cache' })
    const dataBytes = await this.readFirstDecompressedBytes(responseImg.body, bytesToLoad)
    return dataBytes.buffer.slice(0, bytesToLoad) as ArrayBuffer
  }

  static async loadInitialVolumes(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    if (isNaN(limitFrames4D)) {
      return null
    }
    const response = await fetch(url, { headers, cache: 'force-cache' })
    const reader = response.body.getReader()
    const { value, done } = await reader.read()
    let hdrU8s = value
    if (done || !hdrU8s || hdrU8s.length < 2) {
      throw new Error('Not enough data to determine compression')
    }
    const hdrView = new DataView(hdrU8s.buffer, hdrU8s.byteOffset, hdrU8s.byteLength)
    const u16 = hdrView.getUint16(0, true)
    const isGz = u16 === 35615
    if (isGz) {
      await reader.cancel() // Stop streaming and release the lock
      return this.loadInitialVolumesGz(url, headers, limitFrames4D)
    }
    const isNIfTI1 = u16 === 348
    const isNIfTI1be = u16 === 23553
    if (!isNIfTI1 && !isNIfTI1be) {
      await reader.cancel()
      return null
    }
    // start of edge cases: huge header extensions with degraded packet size
    let hdrBytes = 352
    if (hdrU8s.length > 111) {
      hdrBytes = hdrView.getFloat32(108, isNIfTI1)
    }
    while (hdrU8s.length < hdrBytes) {
      const { value, done } = await reader.read()
      if (done || !value) {
        break
      }
      function concatU8s(arr1: Uint8Array, arr2: Uint8Array): Uint8Array {
        const result = new Uint8Array(arr1.length + arr2.length)
        result.set(arr1, 0)
        result.set(arr2, arr1.length)
        return result
      }
      hdrU8s = concatU8s(hdrU8s, value)
    }
    // end of edge cases
    const hdr = await readHeaderAsync(hdrU8s.buffer as ArrayBuffer)
    if (!hdr) {
      throw new Error('Could not read NIfTI header')
    }
    // Calculate required data size
    const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
    const nVox3D = [1, 2, 3].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const nFrame4D = [4, 5, 6].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
    const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
    const imgU8s = new Uint8Array(bytesToLoad)
    // Ensure we don't copy more than needed from hdrU8s
    const hdrCopyLength = Math.min(hdrU8s.length, bytesToLoad)
    imgU8s.set(hdrU8s.subarray(0, hdrCopyLength), 0)
    let bytesRead = hdrCopyLength
    while (bytesRead < bytesToLoad) {
      const { value, done } = await reader.read()
      if (done || !value) {
        await reader.cancel()
        return null
      }
      // Ensure we only copy up to bytesToLoad
      const remaining = Math.min(value.length, bytesToLoad - bytesRead)
      imgU8s.set(value.subarray(0, remaining), bytesRead)
      bytesRead += remaining
    }
    await reader.cancel()
    return imgU8s.buffer
  }

  /**
   * factory function to load and return a new NVImage instance from a given URL
   */
  static async loadFromUrl({
    url = '',
    urlImgData = '',
    headers = {},
    name = '',
    colormap = '',
    opacity = 1.0,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    isManifest = false,
    limitFrames4D = NaN,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    colorbarVisible = true,
    buffer = new ArrayBuffer(0)
  }: Partial<Omit<ImageFromUrlOptions, 'url'>> & { url?: string | Uint8Array | ArrayBuffer } = {}): Promise<NVImage> {
    if (url === '') {
      throw Error('url must not be empty')
    }
    let nvimage = null
    let dataBuffer = null
    let zarrData: null | unknown = null

    // Handle input buffer types
    if (url instanceof Uint8Array) {
      url = url.slice().buffer as ArrayBuffer
    }
    if (buffer.byteLength > 0) {
      url = buffer
    }
    if (url instanceof ArrayBuffer) {
      dataBuffer = url
      if (name !== '') {
        url = name
      } else {
        const bytes = new Uint8Array(dataBuffer)
        url = bytes[0] === 31 && bytes[1] === 139 ? 'array.nii.gz' : 'array.nii'
      }
    }
    function getPrimaryExtension(filename: string): string {
      // .nii.gz -> .nii
      const match = filename.match(/\.([^.]+)(?:\.gz|\.bz2|\.xz)?$/)
      return match ? match[1] : ''
    }
    // Resolve paired image URL if necessary
    let ext = ''
    if (name === '') {
      ext = getPrimaryExtension(url)
    } else {
      ext = getPrimaryExtension(name)
    }
    if (imageType === NVIMAGE_TYPE.UNKNOWN) {
      imageType = NVIMAGE_TYPE.parse(ext)
    }
    if (imageType === NVIMAGE_TYPE.UNKNOWN && typeof url === 'string') {
      // perhaps we are not identifying an extension because the url is a redirect
      const response = await fetch(url, {})
      if (response.redirected) {
        const rname = this.extractFilenameFromUrl(response.url)
        if (rname && rname.length > 0) {
          if (name === '') {
            name = rname
            ext = getPrimaryExtension(name)
            imageType = NVIMAGE_TYPE.parse(ext)
          }
        }
      }
    }
    // try url and name attributes to test for .zarr
    if (imageType === NVIMAGE_TYPE.ZARR) {
      // get the z, x, y slice indices from the query string
      const urlParams = new URL(url).searchParams
      const zIndex = urlParams.get('z')
      const yIndex = urlParams.get('y')
      const xIndex = urlParams.get('x')
      const zRange = zIndex ? zarr.slice(parseInt(zIndex), parseInt(zIndex) + 1) : null
      const yRange = yIndex ? zarr.slice(parseInt(yIndex), parseInt(yIndex) + 1) : null
      const xRange = xIndex ? zarr.slice(parseInt(xIndex), parseInt(xIndex) + 1) : null
      // remove the query string from the original URL
      const zarrUrl = url.split('?')[0]
      // if multiscale, must provide the full path to the zarr array data
      const store = new zarr.FetchStore(zarrUrl)
      const root = zarr.root(store)
      let arr
      try {
        // TODO: probably remove this, since it's not needed
        arr = await zarr.open(root.resolve(url), { kind: 'array' })
      } catch (e) {
        arr = await zarr.open(root, { kind: 'array' })
      }
      let view
      if (arr.shape.length === 4) {
        const cRange = null
        // make sure we are not exceeding the array shape. If so, set to max
        const zDim = arr.shape[2]
        const yDim = arr.shape[1]
        const xDim = arr.shape[0]
        if (zRange && zRange[0] >= zDim) {
          zRange[0] = zDim - 1
        }
        if (yRange && yRange[0] >= yDim) {
          yRange[0] = yDim - 1
        }
        if (xRange && xRange[0] >= xDim) {
          xRange[0] = xDim - 1
        }
        view = await zarr.get(arr, [xRange, yRange, zRange, cRange])
      } else {
        view = await zarr.get(arr, [xRange, yRange, zRange])
      }
      dataBuffer = view.data
      const [height, width, zDim, cDim] = view.shape
      zarrData = {
        data: dataBuffer,
        width,
        height,
        depth: zDim,
        channels: cDim
      }
    }
    // DICOM assigned for unknown extensions: therefore test signature to see if mystery file is NIfTI
    const isTestNIfTI = imageType === NVIMAGE_TYPE.DCM || NVIMAGE_TYPE.NII
    if (!dataBuffer && isTestNIfTI) {
      dataBuffer = await this.loadInitialVolumes(url, headers, limitFrames4D)
    }
    // Handle non-limited cases
    if (!dataBuffer) {
      if (isManifest) {
        dataBuffer = await NVImage.fetchDicomData(url, headers)
        imageType = NVIMAGE_TYPE.DCM_MANIFEST
      } else {
        const response = await fetch(url, { headers })
        if (!response.ok) {
          throw Error(response.statusText)
        }
        if (!response.body) {
          throw new Error('No readable stream available')
        }
        const stream = await uncompressStream(response.body)
        const chunks: Uint8Array[] = []
        const reader = stream.getReader()

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          chunks.push(value)
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        dataBuffer = new ArrayBuffer(totalLength)
        const dataView = new Uint8Array(dataBuffer)
        let offset = 0
        for (const chunk of chunks) {
          dataView.set(chunk, offset)
          offset += chunk.length
        }
      }
    }
    // read paired header image files
    if (ext.toUpperCase() === 'HEAD') {
      if (urlImgData === '') {
        urlImgData = url.substring(0, url.lastIndexOf('HEAD')) + 'BRIK'
      }
    }

    if (ext.toUpperCase() === 'HDR') {
      if (urlImgData === '') {
        urlImgData = url.substring(0, url.lastIndexOf('HDR')) + 'IMG'
      }
    }

    // Handle paired image data if necessary
    let pairedImgData = null
    if (urlImgData) {
      try {
        let response = await fetch(urlImgData, { headers })
        if (response.status === 404 && (urlImgData.includes('BRIK') || urlImgData.includes('IMG'))) {
          response = await fetch(`${urlImgData}.gz`, { headers })
        }
        if (response.ok && response.body) {
          const stream = await uncompressStream(response.body)
          const chunks: Uint8Array[] = []
          const reader = stream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            chunks.push(value)
          }

          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
          pairedImgData = new ArrayBuffer(totalLength)
          const dataView = new Uint8Array(pairedImgData)
          let offset = 0
          for (const chunk of chunks) {
            dataView.set(chunk, offset)
            offset += chunk.length
          }
        }
      } catch (error) {
        console.error('Error loading paired image data:', error)
      }
    }

    if (!dataBuffer) {
      throw new Error('Unable to load buffer properly from volume')
    }

    // Get filename from URL if not provided
    if (!name) {
      let urlParts: string[]
      try {
        // if a full url like https://domain/path/file.nii.gz?query=filter
        // parse the url and get the pathname component without the query
        urlParts = new URL(url).pathname.split('/')
      } catch (e) {
        // if a relative url then parse the path (assuming no query)
        urlParts = url.split('/')
      }
      name = urlParts.slice(-1)[0] // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz
      if (name.indexOf('?') > -1) {
        name = name.slice(0, name.indexOf('?')) // remove query string if any
      }
    }
    nvimage = await this.new(
      dataBuffer,
      name,
      colormap,
      opacity,
      pairedImgData,
      cal_min,
      cal_max,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      useQFormNotSForm,
      colormapNegative,
      frame4D,
      imageType,
      NaN,
      NaN,
      true,
      null,
      0,
      zarrData
    )
    nvimage.url = url
    nvimage.colorbarVisible = colorbarVisible
    return nvimage
  }

  // not included in public docs
  // loading Nifti files
  static async readFileAsync(file: File, bytesToLoad = NaN): Promise<ArrayBuffer> {
    let stream = file.stream()

    if (!isNaN(bytesToLoad)) {
      let bytesRead = 0
      const limiter = new TransformStream({
        transform(chunk: Uint8Array, controller: TransformStreamDefaultController): void {
          if (bytesRead >= bytesToLoad) {
            controller.terminate()
            return
          }
          const remainingBytes = bytesToLoad - bytesRead
          if (chunk.length > remainingBytes) {
            controller.enqueue(chunk.slice(0, remainingBytes))
            controller.terminate()
          } else {
            controller.enqueue(chunk)
          }
          bytesRead += chunk.length
        }
      })
      stream = stream.pipeThrough(limiter)
    }

    const uncompressedStream = await uncompressStream(stream)

    const chunks: Uint8Array[] = []
    const reader = uncompressedStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new ArrayBuffer(totalLength)
    const resultView = new Uint8Array(result)

    let offset = 0
    for (const chunk of chunks) {
      resultView.set(chunk, offset)
      offset += chunk.length
    }

    return result
  }

  /**
   * factory function to load and return a new NVImage instance from a file in the browser
   */
  static async loadFromFile({
    file, // file can be an array of file objects or a single file object
    name = '',
    colormap = '',
    opacity = 1.0,
    urlImgData = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    limitFrames4D = NaN,
    imageType = NVIMAGE_TYPE.UNKNOWN
  }: ImageFromFileOptions): Promise<NVImage> {
    let nvimage: NVImage | null = null
    let dataBuffer: ArrayBuffer | ArrayBuffer[] = []
    try {
      if (Array.isArray(file)) {
        dataBuffer = await Promise.all(file.map((f) => this.readFileAsync(f)))
      } else {
        if (!isNaN(limitFrames4D)) {
          const headerBuffer = await this.readFileAsync(file, 512)
          const headerView = new Uint8Array(headerBuffer)

          const isNifti1 =
            (headerView[0] === 92 && headerView[1] === 1) || (headerView[1] === 92 && headerView[0] === 1)

          if (!isNifti1) {
            dataBuffer = await this.readFileAsync(file)
          } else {
            const hdr = await readHeaderAsync(headerBuffer)
            if (!hdr) {
              throw new Error('could not read nifti header')
            }

            const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
            const nVox3D = [1, 2, 3].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
            const nFrame4D = [4, 5, 6].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)

            const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
            const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
            dataBuffer = await this.readFileAsync(file, bytesToLoad)
          }
        } else {
          dataBuffer = await this.readFileAsync(file)
        }
        name = file.name
      }
      let pairedImgData = null
      if (urlImgData) {
        // @ts-expect-error check data type?
        pairedImgData = await this.readFileAsync(urlImgData)
      }
      nvimage = await this.new(
        dataBuffer,
        name,
        colormap,
        opacity,
        pairedImgData,
        cal_min,
        cal_max,
        trustCalMinMax,
        percentileFrac,
        ignoreZeroVoxels,
        useQFormNotSForm,
        colormapNegative,
        frame4D,
        imageType,
        NaN,
        NaN,
        true,
        null,
        0,
        null
      )
      // add a reference to the file object as a new property of the NVImage instance
      // is this too hacky?
      nvimage.fileObject = file
    } catch (err) {
      log.error(err)
      throw new Error('could not build NVImage')
    }
    if (nvimage === null) {
      throw new Error('could not build NVImage')
    }
    return nvimage
  }

  /**
   * Creates a Uint8Array representing a NIFTI file (header + optional image data).
   * Delegates to ImageWriter.createNiftiArray.
   */
  static createNiftiArray(
    dims: number[] = [256, 256, 256],
    pixDims: number[] = [1, 1, 1],
    affine: number[] = [1, 0, 0, -128, 0, 1, 0, -128, 0, 0, 1, -128, 0, 0, 0, 1],
    datatypeCode = NiiDataType.DT_UINT8,
    img: TypedVoxelArray | Uint8Array = new Uint8Array()
  ): Uint8Array {
    return ImageWriter.createNiftiArray(dims, pixDims, affine, datatypeCode, img)
  }

  /**
   * Creates a NIFTI1 header object with basic properties.
   * Delegates to ImageWriter.createNiftiHeader.
   */
  static createNiftiHeader(
    dims: number[] = [256, 256, 256],
    pixDims: number[] = [1, 1, 1],
    affine: number[] = [1, 0, 0, -128, 0, 1, 0, -128, 0, 0, 1, -128, 0, 0, 0, 1],
    datatypeCode = NiiDataType.DT_UINT8
  ): NIFTI1 {
    return ImageWriter.createNiftiHeader(dims, pixDims, affine, datatypeCode)
  }

  /**
   * read a 3D slab of voxels from a volume
   * @see {@link https://niivue.com/demos/features/slab_selection.html | live demo usage}
   */

  /**
   * read a 3D slab of voxels from a volume, specified in RAS coordinates.
   * Delegates to VolumeUtils.getVolumeData.
   */
  getVolumeData(
    voxStart: number[] = [-1, 0, 0],
    voxEnd: number[] = [0, 0, 0],
    dataType = 'same'
  ): [TypedVoxelArray, number[]] {
    return VolumeUtils.getVolumeData(this, voxStart, voxEnd, dataType)
  }

  /**
   * write a 3D slab of voxels from a volume
   * @see {@link https://niivue.com/demos/features/slab_selection.html | live demo usage}
   */

  /**
   * write a 3D slab of voxels from a volume, specified in RAS coordinates.
   * Delegates to VolumeUtils.setVolumeData.
   * Input slabData is assumed to be in the correct raw data type for the target image.
   */
  setVolumeData(
    voxStart: number[] = [-1, 0, 0],
    voxEnd: number[] = [0, 0, 0],
    img: TypedVoxelArray = new Uint8Array()
  ): void {
    VolumeUtils.setVolumeData(this, voxStart, voxEnd, img)
  }

  /**
   * factory function to load and return a new NVImage instance from a base64 encoded string
   * @example
   * myImage = NVImage.loadFromBase64('SomeBase64String')
   */
  static async loadFromBase64({
    base64,
    name = '',
    colormap = '',
    opacity = 1.0,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    cal_minNeg = NaN,
    cal_maxNeg = NaN,
    colorbarVisible = true,
    colormapLabel = null
  }: ImageFromBase64): Promise<NVImage> {
    // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
    function base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary_string = window.atob(base64)
      const len = binary_string.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }
      return bytes.buffer
    }
    let nvimage = null
    try {
      const dataBuffer = base64ToArrayBuffer(base64)
      const pairedImgData = null
      nvimage = await this.new(
        dataBuffer,
        name,
        colormap,
        opacity,
        pairedImgData,
        cal_min,
        cal_max,
        trustCalMinMax,
        percentileFrac,
        ignoreZeroVoxels,
        useQFormNotSForm,
        colormapNegative,
        frame4D,
        imageType,
        cal_minNeg,
        cal_maxNeg,
        colorbarVisible,
        colormapLabel,
        0,
        null
      )
    } catch (err) {
      log.debug(err)
    }

    if (nvimage === null) {
      throw new Error('could not load NVImage')
    }

    return nvimage
  }

  /**
   * make a clone of a NVImage instance and return a new NVImage
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   * clonedImage = myImage.clone()
   */
  clone(): NVImage {
    const clonedImage = new NVImage()
    // important! the clone should have a new ID to avoid conflicts
    // when referencing images by ID. A user could add the cloned
    // image as a viewable volume in any order.
    clonedImage.id = uuidv4()
    clonedImage.hdr = Object.assign({}, this.hdr)
    clonedImage.img = this.img!.slice()
    clonedImage.calculateRAS()
    clonedImage.calMinMax()
    return clonedImage
  }

  /**
   * fill a NVImage instance with zeros for the image data
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   * clonedImageWithZeros = myImage.clone().zeroImage()
   */
  zeroImage(): void {
    this.img!.fill(0)
  }

  /**
   * get nifti specific metadata about the image
   */
  getImageMetadata(): ImageMetadata {
    if (!this.hdr) {
      throw new Error('hdr undefined')
    }
    const id = this.id
    const datatypeCode = this.hdr.datatypeCode
    const dims = this.hdr.dims
    const nx = dims[1]
    const ny = dims[2]
    const nz = dims[3]
    const nt = Math.max(1, dims[4])
    const pixDims = this.hdr.pixDims
    const dx = pixDims[1]
    const dy = pixDims[2]
    const dz = pixDims[3]
    const dt = pixDims[4]
    const bpv = Math.floor(this.hdr.numBitsPerVoxel / 8)

    return { id, datatypeCode, nx, ny, nz, nt, dx, dy, dz, dt, bpv }
  }

  /**
   * a factory function to make a zero filled image given a NVImage as a reference
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   * newZeroImage = NVImage.zerosLike(myImage)
   */
  static zerosLike(nvImage: NVImage, dataType = 'same'): NVImage {
    // dataType can be: 'same', 'uint8'
    // 'same' means that the zeroed image data type is the same as the input image
    const zeroClone = nvImage.clone()
    zeroClone.zeroImage()
    if (dataType === 'uint8') {
      zeroClone.img = Uint8Array.from(zeroClone.img!)
      zeroClone.hdr!.datatypeCode = NiiDataType.DT_UINT8
      zeroClone.hdr!.numBitsPerVoxel = 8
    }
    if (dataType === 'float32') {
      zeroClone.img = Float32Array.from(zeroClone.img!)
      zeroClone.hdr!.datatypeCode = NiiDataType.DT_FLOAT32
      zeroClone.hdr!.numBitsPerVoxel = 32
    }
    return zeroClone
  }

  /**
   * Returns voxel intensity at specific native coordinates.
   * Delegates to VolumeUtils.getValue.
   */
  getValue(x: number, y: number, z: number, frame4D = 0, isReadImaginary = false): number {
    return VolumeUtils.getValue(this, x, y, z, frame4D, isReadImaginary)
  }

  /**
   * Returns voxel intensities at specific native coordinates.
   * Delegates to VolumeUtils.getValue.
   */
  getValues(x: number, y: number, z: number, frame4D = 0, isReadImaginary = false): number[] {
    return VolumeUtils.getValues(this, x, y, z, frame4D, isReadImaginary)
  }

  /**
   * Update options for image
   */
  applyOptionsUpdate(options: ImageFromUrlOptions): void {
    this.hdr!.cal_min = options.cal_min!
    this.hdr!.cal_max = options.cal_max!
    Object.assign(this, options)
  }

  getImageOptions(): ImageFromUrlOptions {
    const options = NVImageFromUrlOptions(
      '', // url,
      '', // urlImageData
      this.name, // name
      this._colormap, // colormap
      this.opacity, // opacity
      this.hdr!.cal_min, // cal_min
      this.hdr!.cal_max, // cal_max
      this.trustCalMinMax, // trustCalMinMax,
      this.percentileFrac, // percentileFrac
      this.ignoreZeroVoxels, // ignoreZeroVoxels
      this.useQFormNotSForm, // useQFormNotSForm
      this.colormapNegative, // colormapNegative
      this.frame4D,
      this.imageType, // imageType
      this.colormapType
    )
    return options
  }

  /**
   * Converts NVImage to NIfTI compliant byte array.
   * Handles potential re-orientation of drawing data.
   * Delegates to ImageWriter.toUint8Array.
   */
  toUint8Array(drawingBytes: Uint8Array | null = null): Uint8Array {
    // Delegate to the writer module, passing the instance 'this'
    return ImageWriter.toUint8Array(this, drawingBytes)
  }

  // not included in public docs
  convertVox2Frac(vox: vec3): vec3 {
    return CoordinateTransform.convertVox2Frac(this, vox)
  }

  // not included in public docs
  convertFrac2Vox(frac: vec3): vec3 {
    return CoordinateTransform.convertFrac2Vox(this, frac)
  }

  // not included in public docs
  convertFrac2MM(frac: vec3, isForceSliceMM = false): vec4 {
    return CoordinateTransform.convertFrac2MM(this, frac, isForceSliceMM)
  }

  // not included in public docs
  convertMM2Frac(mm: vec3 | vec4, isForceSliceMM = false): vec3 {
    return CoordinateTransform.convertMM2Frac(this, mm, isForceSliceMM)
  }
}
