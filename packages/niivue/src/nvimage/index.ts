import { NIFTI1, NIFTI2, NIFTIEXTENSION, readHeaderAsync } from 'nifti-reader-js'
import { mat4, vec3, vec4 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { ColorMap, LUT } from '@/colortables'
import { log } from '@/logger'
import {
  ImageFromBase64,
  ImageFromFileOptions,
  ImageFromUrlOptions,
  ImageMetadata,
  ImageType,
  NVIMAGE_TYPE,
  NiiDataType,
  NiiIntentCode
} from '@/nvimage/utils'
import * as ImageWriter from '@/nvimage/ImageWriter'
import * as VolumeUtils from '@/nvimage/VolumeUtils'
import * as ImageReaders from '@/nvimage/ImageReaders'
import * as CoordinateTransform from '@/nvimage/CoordinateTransform'
import * as ImageOrientation from '@/nvimage/ImageOrientation'
import * as TensorProcessing from '@/nvimage/TensorProcessing'
import * as IntensityCalibration from '@/nvimage/IntensityCalibration'
import * as ColormapManager from '@/nvimage/ColormapManager'
import * as ImageFactory from '@/nvimage/ImageFactory'
import * as ImageMetadataModule from '@/nvimage/ImageMetadata'
import * as ImageDataProcessor from '@/nvimage/ImageDataProcessor'
import * as AffineProcessor from '@/nvimage/AffineProcessor'
import * as ZarrProcessor from '@/nvimage/ZarrProcessor'
import * as StreamingLoader from '@/nvimage/StreamingLoader'

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
    // Process affine matrix: validate, calculate from QForm if needed, repair if defective
    AffineProcessor.processAffine(this.hdr, useQFormNotSForm)
    // Swap bytes if foreign endian, then convert to appropriate typed array
    ImageDataProcessor.swapBytesIfNeeded(imgRaw, this.hdr)
    const conversionResult = ImageDataProcessor.convertDataType(imgRaw, this.hdr)
    this.img = conversionResult.img
    if (conversionResult.imaginary) {
      this.imaginary = conversionResult.imaginary
    }
    if (conversionResult.updatedDatatypeCode !== undefined) {
      this.hdr.datatypeCode = conversionResult.updatedDatatypeCode
    }
    if (conversionResult.updatedNumBitsPerVoxel !== undefined) {
      this.hdr.numBitsPerVoxel = conversionResult.updatedNumBitsPerVoxel
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
    return ImageFactory.fetchDicomData(url, headers)
  }

  static async readFirstDecompressedBytes(stream: ReadableStream<Uint8Array>, minBytes: number): Promise<Uint8Array> {
    return ImageFactory.readFirstDecompressedBytes(stream, minBytes)
  }

  static extractFilenameFromUrl(url: string): string | null {
    return ImageFactory.extractFilenameFromUrl(url)
  }

  static async loadInitialVolumesGz(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    return ImageFactory.loadInitialVolumesGz(url, headers, limitFrames4D)
  }

  static async loadInitialVolumes(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    return ImageFactory.loadInitialVolumes(url, headers, limitFrames4D)
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
    // Resolve paired image URL if necessary
    let ext = ''
    if (name === '') {
      ext = ImageFactory.getPrimaryExtension(url)
    } else {
      ext = ImageFactory.getPrimaryExtension(name)
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
            ext = ImageFactory.getPrimaryExtension(name)
            imageType = NVIMAGE_TYPE.parse(ext)
          }
        }
      }
    }
    // try url and name attributes to test for .zarr
    if (imageType === NVIMAGE_TYPE.ZARR) {
      const zarrResult = await ZarrProcessor.loadZarrData(url)
      dataBuffer = zarrResult.dataBuffer
      zarrData = zarrResult.zarrData
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
        dataBuffer = await StreamingLoader.fetchAndStreamData(url, headers)
      }
    }
    // Handle paired image data for formats with separate header/data files
    const pairedUrl = StreamingLoader.getPairedImageUrl(url, ext.toUpperCase(), urlImgData)
    let pairedImgData = null
    if (pairedUrl) {
      pairedImgData = await StreamingLoader.fetchPairedImageData(pairedUrl, headers)
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
    return ImageFactory.readFileAsync(file, bytesToLoad)
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
    let nvimage = null
    try {
      const dataBuffer = ImageFactory.base64ToArrayBuffer(base64)
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
    return ImageMetadataModule.getImageMetadata(this)
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
    ImageMetadataModule.applyOptionsUpdate(this, options)
  }

  getImageOptions(): ImageFromUrlOptions {
    return ImageMetadataModule.getImageOptions(this)
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
