import * as nifti from 'nifti-reader-js'
import daikon from 'daikon'
import { mat3, mat4, vec3, vec4 } from 'gl-matrix'
import { Decompress, decompressSync, gzipSync } from 'fflate/browser'
import { cmapper } from '../colortables.js'
import { NiivueObject3D } from '../niivue-object3D.js'
import { Log } from '../logger.js'
import {
  NVIMAGE_TYPE,
  NVImageFromUrlOptions,
  getBestTransform,
  getExtents,
  hdrToArrayBuffer,
  isPlatformLittleEndian
} from './utils.js'
const log = new Log()

export * from './utils.js'

/**
 * @class NVImage
 * @type NVImage
 * @description
 * a NVImage encapsulates some images data and provides methods to query and operate on images
 * @constructor
 * @param {array} dataBuffer an array buffer of image data to load (there are also methods that abstract this more. See loadFromUrl, and loadFromFile)
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {string} [colormap='gray'] a color map to use. default is gray
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {string} [pairedImgData=null] Allows loading formats where header and image are separate files (e.g. nifti.hdr, nifti.img)
 * @param {number} [cal_min=NaN] minimum intensity for color brightness/contrast
 * @param {number} [cal_max=NaN] maximum intensity for color brightness/contrast
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 * @param {boolean} [useQFormNotSForm=true] give precedence to QForm (Quaternion) or SForm (Matrix)
 * @param {string} [colormapNegative=''] a color map to use for symmetrical negative intensities
 * @param {number} [frame4D = 0] volume displayed, 0 indexed, must be less than nFrame4D
 * @param {function} [onColormapChange=()=>{}] callback for color map change
 * @param {function} [onOpacityChange=()=>{}] callback for color map change
 */
export class NVImage {
  constructor(
    dataBuffer, // can be an array of Typed arrays or just a typed array. If an array of Typed arrays then it is assumed you are loading DICOM (perhaps the only real use case?)
    name = '',
    colormap = 'gray',
    opacity = 1.0,
    pairedImgData = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    visible = true,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    imageType = NVIMAGE_TYPE.UNKNOWN,
    cal_minNeg = NaN,
    cal_maxNeg = NaN,
    colorbarVisible = true,
    colormapLabel = []
  ) {
    // https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h
    this.DT_NONE = 0
    this.DT_UNKNOWN = 0 /* what it says, dude           */
    this.DT_BINARY = 1 /* binary (1 bit/voxel)         */
    this.DT_UNSIGNED_CHAR = 2 /* unsigned char (8 bits/voxel) */
    this.DT_SIGNED_SHORT = 4 /* signed short (16 bits/voxel) */
    this.DT_SIGNED_INT = 8 /* signed int (32 bits/voxel)   */
    this.DT_FLOAT = 16 /* float (32 bits/voxel)        */
    this.DT_COMPLEX = 32 /* complex (64 bits/voxel)      */
    this.DT_DOUBLE = 64 /* double (64 bits/voxel)       */
    this.DT_RGB = 128 /* RGB triple (24 bits/voxel)   */
    this.DT_ALL = 255 /* not very useful (?)          */
    this.DT_INT8 = 256 /* signed char (8 bits)         */
    this.DT_UINT16 = 512 /* unsigned short (16 bits)     */
    this.DT_UINT32 = 768 /* unsigned int (32 bits)       */
    this.DT_INT64 = 1024 /* long long (64 bits)          */
    this.DT_UINT64 = 1280 /* unsigned long long (64 bits) */
    this.DT_FLOAT128 = 1536 /* long double (128 bits)       */
    this.DT_COMPLEX128 = 1792 /* double pair (128 bits)       */
    this.DT_COMPLEX256 = 2048 /* long double pair (256 bits)  */
    this.DT_RGBA32 = 2304 /* 4 byte RGBA (32 bits/voxel)  */
    this.name = name
    this.id = crypto.randomUUID()
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
    this.visible = visible
    this.modulationImage = null
    this.modulateAlpha = 0 // if !=0, mod transparency with expon power |Alpha|
    this.series = [] // for concatenating dicom images

    this.onColormapChange = () => {}
    this.onOpacityChange = () => {}

    // Added to support zerosLike
    if (!dataBuffer) {
      return
    }
    const re = /(?:\.([^.]+))?$/
    let ext = re.exec(name)[1] || ''
    ext = ext.toUpperCase()
    if (ext === 'GZ') {
      ext = re.exec(name.slice(0, -3))[1] // img.trk.gz -> img.trk
      ext = ext.toUpperCase()
    }
    let imgRaw = null
    this.hdr = null

    if (imageType === NVIMAGE_TYPE.UNKNOWN) {
      imageType = NVIMAGE_TYPE.parse(ext)
    }

    this.imageType = imageType

    switch (imageType) {
      case NVIMAGE_TYPE.DCM_FOLDER:
      case NVIMAGE_TYPE.DCM_MANIFEST:
      case NVIMAGE_TYPE.DCM:
        imgRaw = this.readDICOM(dataBuffer)
        break
      case NVIMAGE_TYPE.MIH:
      case NVIMAGE_TYPE.MIF:
        imgRaw = this.readMIF(dataBuffer, pairedImgData) // detached
        break
      case NVIMAGE_TYPE.NHDR:
      case NVIMAGE_TYPE.NRRD:
        imgRaw = this.readNRRD(dataBuffer, pairedImgData) // detached
        break
      case NVIMAGE_TYPE.MHD:
      case NVIMAGE_TYPE.MHA:
        imgRaw = this.readMHA(dataBuffer, pairedImgData)
        break
      case NVIMAGE_TYPE.MGH:
      case NVIMAGE_TYPE.MGZ:
        imgRaw = this.readMGH(dataBuffer) // to do: pairedImgData
        break
      case NVIMAGE_TYPE.V:
        imgRaw = this.readECAT(dataBuffer)
        break
      case NVIMAGE_TYPE.V16:
        imgRaw = this.readV16(dataBuffer)
        break
      case NVIMAGE_TYPE.VMR:
        imgRaw = this.readVMR(dataBuffer)
        break
      case NVIMAGE_TYPE.HEAD:
        imgRaw = this.readHEAD(dataBuffer, pairedImgData) // paired = .BRIK
        break
      case NVIMAGE_TYPE.NII:
        this.hdr = nifti.readHeader(dataBuffer)
        if (this.hdr.cal_min === 0 && this.hdr.cal_max === 255) {
          this.hdr.cal_max = 0.0
        }
        if (nifti.isCompressed(dataBuffer)) {
          imgRaw = nifti.readImage(this.hdr, nifti.decompress(dataBuffer))
        } else {
          imgRaw = nifti.readImage(this.hdr, dataBuffer)
        }
        break
      default:
        throw new Error('Image type not supported')
    }
    if (typeof this.hdr.magic === 'number') {
      this.hdr.magic = 'n+1'
    } // fix for issue 481, where magic is set to the number 1 rather than a string
    this.nFrame4D = 1
    for (let i = 4; i < 7; i++) {
      if (this.hdr.dims[i] > 1) {
        this.nFrame4D *= this.hdr.dims[i]
      }
    }
    this.frame4D = Math.min(this.frame4D, this.nFrame4D - 1)
    this.nVox3D = this.hdr.dims[1] * this.hdr.dims[2] * this.hdr.dims[3]
    const bytesPerVol = this.nVox3D * (this.hdr.numBitsPerVoxel / 8)
    const nVol4D = imgRaw.byteLength / bytesPerVol
    this.nTotalFrame4D = this.nFrame4D
    if (nVol4D !== this.nFrame4D) {
      if (nVol4D > 0 && nVol4D * bytesPerVol === imgRaw.byteLength) {
        console.log('Loading the first ' + nVol4D + ' of ' + this.nFrame4D + ' volumes')
      } else {
        console.log('This header does not match voxel data', this.hdr, imgRaw.byteLength)
      }
      this.nFrame4D = nVol4D
    }
    // 1007 = NIFTI_INTENT_VECTOR; 2003 = NIFTI_INTENT_RGB_VECTOR
    // n.b. NIfTI standard says "NIFTI_INTENT_RGB_VECTOR" should be RGBA, but FSL only stores RGB
    if (
      (this.hdr.intent_code === 1007 || this.hdr.intent_code === 2003) &&
      this.nFrame4D === 3 &&
      this.hdr.datatypeCode === this.DT_FLOAT
    ) {
      const tmp = new Float32Array(imgRaw)
      const f32 = tmp.slice()
      this.hdr.datatypeCode = this.DT_RGB
      this.nFrame4D = 1
      for (let i = 4; i < 7; i++) {
        this.hdr.dims[i] = 1
      }
      this.hdr.dims[0] = 3 // 3D
      imgRaw = new Uint8Array(this.nVox3D * 3) //* 3 for RGB
      let mx = Math.abs(f32[0])
      for (let i = 0; i < this.nVox3D * 3; i++) {
        mx = Math.max(mx, Math.abs(f32[i]))
      }
      let slope = 1.0
      if (mx > 0) {
        slope = 1.0 / mx
      }
      const nVox3D2 = this.nVox3D * 2
      let j = 0
      for (let i = 0; i < this.nVox3D; i++) {
        imgRaw[j] = 255.0 * Math.abs(f32[i] * slope)
        imgRaw[j + 1] = 255.0 * Math.abs(f32[i + this.nVox3D] * slope)
        imgRaw[j + 2] = 255.0 * Math.abs(f32[i + nVox3D2] * slope)
        j += 3
      }
    } // NIFTI_INTENT_VECTOR: this is a RGB tensor
    if (this.hdr.pixDims[1] === 0.0 || this.hdr.pixDims[2] === 0.0 || this.hdr.pixDims[3] === 0.0) {
      console.log('pixDims not plausible', this.hdr)
    }
    function isAffineOK(mtx) {
      // A good matrix should not have any components that are not a number
      // A good spatial transformation matrix should not have a row or column that is all zeros
      const iOK = [false, false, false, false]
      const jOK = [false, false, false, false]
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (isNaN(mtx[i][j])) {
            return false
          }
        }
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (mtx[i][j] === 0.0) {
            continue
          }
          iOK[i] = true
          jOK[j] = true
        }
      }
      for (let i = 0; i < 3; i++) {
        if (!iOK[i]) {
          return false
        }
        if (!jOK[i]) {
          return false
        }
      }
      return true
    } //
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
      // Define a, b, c, d for coding covenience
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
      this.hdr.datatypeCode !== this.DT_RGB &&
      this.hdr.datatypeCode !== this.DT_RGBA32 &&
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
      case this.DT_UNSIGNED_CHAR:
        this.img = new Uint8Array(imgRaw)
        break
      case this.DT_SIGNED_SHORT:
        this.img = new Int16Array(imgRaw)
        break
      case this.DT_FLOAT:
        this.img = new Float32Array(imgRaw)
        break
      case this.DT_DOUBLE:
        this.img = new Float64Array(imgRaw)
        break
      case this.DT_RGB:
        this.img = new Uint8Array(imgRaw)
        break
      case this.DT_UINT16:
        this.img = new Uint16Array(imgRaw)
        break
      case this.DT_RGBA32:
        this.img = new Uint8Array(imgRaw)
        break
      case this.DT_INT8: {
        const i8 = new Int8Array(imgRaw)
        const vx8 = i8.length
        this.img = new Int16Array(vx8)
        for (let i = 0; i < vx8 - 1; i++) {
          this.img[i] = i8[i]
        }
        this.hdr.datatypeCode = this.DT_SIGNED_SHORT
        break
      }
      case this.DT_UINT32: {
        const u32 = new Uint32Array(imgRaw)
        const vx32 = u32.length
        this.img = new Float64Array(vx32)
        for (let i = 0; i < vx32 - 1; i++) {
          this.img[i] = u32[i]
        }
        this.hdr.datatypeCode = this.DT_DOUBLE
        break
      }
      case this.DT_SIGNED_INT: {
        const i32 = new Int32Array(imgRaw)
        const vxi32 = i32.length
        this.img = new Float64Array(vxi32)
        for (let i = 0; i < vxi32 - 1; i++) {
          this.img[i] = i32[i]
        }
        this.hdr.datatypeCode = this.DT_DOUBLE
        break
      }
      case this.DT_INT64: {
        const i64 = new BigInt64Array(imgRaw)
        const vx = i64.length
        this.img = new Float64Array(vx)
        for (let i = 0; i < vx - 1; i++) {
          this.img[i] = Number(i64[i])
        }
        this.hdr.datatypeCode = this.DT_DOUBLE
        break
      }
      case this.DT_COMPLEX: {
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
        this.hdr.datatypeCode = this.DT_FLOAT
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

  // not included in public docs
  // detect difference between voxel grid and world space
  // https://github.com/afni/afni/blob/25e77d564f2c67ff480fa99a7b8e48ec2d9a89fc/src/thd_coords.c#L717
  computeObliqueAngle = function (mtx44) {
    const mtx = mat4.clone(mtx44)
    mat4.transpose(mtx, mtx44)
    const dxtmp = Math.sqrt(mtx[0] * mtx[0] + mtx[1] * mtx[1] + mtx[2] * mtx[2])
    const xmax = Math.max(Math.max(Math.abs(mtx[0]), Math.abs(mtx[1])), Math.abs(mtx[2])) / dxtmp
    const dytmp = Math.sqrt(mtx[4] * mtx[4] + mtx[5] * mtx[5] + mtx[6] * mtx[6])
    const ymax = Math.max(Math.max(Math.abs(mtx[4]), Math.abs(mtx[5])), Math.abs(mtx[6])) / dytmp
    const dztmp = Math.sqrt(mtx[8] * mtx[8] + mtx[9] * mtx[9] + mtx[10] * mtx[10])
    const zmax = Math.max(Math.max(Math.abs(mtx[8]), Math.abs(mtx[9])), Math.abs(mtx[10])) / dztmp
    const fig_merit = Math.min(Math.min(xmax, ymax), zmax)
    let oblique_angle = Math.abs((Math.acos(fig_merit) * 180.0) / 3.141592653)
    if (oblique_angle > 0.01) {
      console.log('Warning voxels not aligned with world space: ' + oblique_angle + ' degrees from plumb.\n')
    } else {
      oblique_angle = 0.0
    }
    return oblique_angle
  }

  // not included in public docs
  // detect difference between voxel grid and world space
  calculateOblique = function () {
    this.oblique_angle = this.computeObliqueAngle(this.matRAS)
    const LPI = this.vox2mm([0.0, 0.0, 0.0], this.matRAS)
    const X1mm = this.vox2mm([1.0 / this.pixDimsRAS[1], 0.0, 0.0], this.matRAS)
    const Y1mm = this.vox2mm([0.0, 1.0 / this.pixDimsRAS[2], 0.0], this.matRAS)
    const Z1mm = this.vox2mm([0.0, 0.0, 1.0 / this.pixDimsRAS[3]], this.matRAS)
    vec3.subtract(X1mm, X1mm, LPI)
    vec3.subtract(Y1mm, Y1mm, LPI)
    vec3.subtract(Z1mm, Z1mm, LPI)
    const oblique = mat4.fromValues(
      X1mm[0],
      X1mm[1],
      X1mm[2],
      0,
      Y1mm[0],
      Y1mm[1],
      Y1mm[2],
      0,
      Z1mm[0],
      Z1mm[1],
      Z1mm[2],
      0,
      0,
      0,
      0,
      1
    )
    this.obliqueRAS = mat4.clone(oblique)
    const XY = Math.abs(90 - vec3.angle(X1mm, Y1mm) * (180 / Math.PI))
    const XZ = Math.abs(90 - vec3.angle(X1mm, Z1mm) * (180 / Math.PI))
    const YZ = Math.abs(90 - vec3.angle(Y1mm, Z1mm) * (180 / Math.PI))
    this.maxShearDeg = Math.max(Math.max(XY, XZ), YZ)
    if (this.maxShearDeg > 0.1) {
      console.log('Warning: voxels are rhomboidal, maximum shear is %f degrees.', this.maxShearDeg)
    }
    // compute a matrix to transform vectors from factional space to mm:
    const dim = vec4.fromValues(this.dimsRAS[1], this.dimsRAS[2], this.dimsRAS[3], 1)
    const sform = mat4.clone(this.matRAS)
    mat4.transpose(sform, sform)
    const shim = vec4.fromValues(-0.5, -0.5, -0.5, 0) // bitmap with 5 voxels scaled 0..1, voxel centers are 0.1,0.3,0.5,0.7,0.9
    mat4.translate(sform, sform, shim)
    // mat.mat4.scale(sform, sform, dim);
    sform[0] *= dim[0]
    sform[1] *= dim[0]
    sform[2] *= dim[0]
    sform[4] *= dim[1]
    sform[5] *= dim[1]
    sform[6] *= dim[1]
    sform[8] *= dim[2]
    sform[9] *= dim[2]
    sform[10] *= dim[2]
    this.frac2mm = mat4.clone(sform)
    const pixdimX = this.pixDimsRAS[1] // vec3.length(X1mm);
    const pixdimY = this.pixDimsRAS[2] // vec3.length(Y1mm);
    const pixdimZ = this.pixDimsRAS[3] // vec3.length(Z1mm);
    // console.log("pixdim", pixdimX, pixdimY, pixdimZ);
    // orthographic view
    const oform = mat4.clone(sform)
    oform[0] = pixdimX * dim[0]
    oform[1] = 0
    oform[2] = 0
    oform[4] = 0
    oform[5] = pixdimY * dim[1]
    oform[6] = 0
    oform[8] = 0
    oform[9] = 0
    oform[10] = pixdimZ * dim[2]
    const originVoxel = this.mm2vox([0, 0, 0], true)
    // set matrix translation for distance from origin
    oform[12] = (-originVoxel[0] - 0.5) * pixdimX
    oform[13] = (-originVoxel[1] - 0.5) * pixdimY
    oform[14] = (-originVoxel[2] - 0.5) * pixdimZ
    this.frac2mmOrtho = mat4.clone(oform)
    this.extentsMinOrtho = [oform[12], oform[13], oform[14]]
    this.extentsMaxOrtho = [oform[0] + oform[12], oform[5] + oform[13], oform[10] + oform[14]]
    this.mm2ortho = mat4.create()
    mat4.invert(this.mm2ortho, oblique)
    /* function reportMat(m) {
    console.log(
      `m = [${m[0]} ${m[1]} ${m[2]} ${m[3]}; ${m[4]} ${m[5]} ${m[6]} ${m[7]}; ${m[8]} ${m[9]} ${m[10]} ${m[11]}; ${m[12]} ${m[13]} ${m[14]} ${m[15]}]`
    );
  }
  reportMat(this.frac2mmOrtho);
  reportMat(this.frac2mm); */
  }

  // not included in public docs
  // convert AFNI head/brik space to NIfTI format
  // https://github.com/afni/afni/blob/d6997e71f2b625ac1199460576d48f3136dac62c/src/thd_niftiwrite.c#L315
  THD_daxes_to_NIFTI = function (xyzDelta, xyzOrigin, orientSpecific) {
    const hdr = this.hdr
    hdr.sform_code = 2
    const ORIENT_xyz = 'xxyyzzg' // note strings indexed from 0!
    let nif_x_axnum = -1
    let nif_y_axnum = -1
    let nif_z_axnum = -1
    const axcode = ['x', 'y', 'z']
    axcode[0] = ORIENT_xyz[orientSpecific[0]]
    axcode[1] = ORIENT_xyz[orientSpecific[1]]
    axcode[2] = ORIENT_xyz[orientSpecific[2]]
    const axstep = xyzDelta.slice(0, 3)
    const axstart = xyzOrigin.slice(0, 3)
    for (let ii = 0; ii < 3; ii++) {
      if (axcode[ii] === 'x') {
        nif_x_axnum = ii
      } else if (axcode[ii] === 'y') {
        nif_y_axnum = ii
      } else {
        nif_z_axnum = ii
      }
    }
    if (nif_x_axnum < 0 || nif_y_axnum < 0 || nif_z_axnum < 0) {
      return
    } // not assigned
    if (nif_x_axnum === nif_y_axnum || nif_x_axnum === nif_z_axnum || nif_y_axnum === nif_z_axnum) {
      return
    } // not assigned
    hdr.pixDims[1] = Math.abs(axstep[0])
    hdr.pixDims[2] = Math.abs(axstep[1])
    hdr.pixDims[3] = Math.abs(axstep[2])
    hdr.affine = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]
    hdr.affine[0][nif_x_axnum] = -axstep[nif_x_axnum]
    hdr.affine[1][nif_y_axnum] = -axstep[nif_y_axnum]
    hdr.affine[2][nif_z_axnum] = axstep[nif_z_axnum]
    hdr.affine[0][3] = -axstart[nif_x_axnum]
    hdr.affine[1][3] = -axstart[nif_y_axnum]
    hdr.affine[2][3] = axstart[nif_z_axnum]
  }

  // not included in public docs
  // determine spacing voxel centers (rows, columns, slices)
  SetPixDimFromSForm = function () {
    const m = this.hdr.affine
    const mat = mat4.fromValues(
      m[0][0],
      m[0][1],
      m[0][2],
      m[0][3],
      m[1][0],
      m[1][1],
      m[1][2],
      m[1][3],
      m[2][0],
      m[2][1],
      m[2][2],
      m[2][3],
      m[3][0],
      m[3][1],
      m[3][2],
      m[3][3]
    )
    const mm000 = this.vox2mm([0, 0, 0], mat)
    const mm100 = this.vox2mm([1, 0, 0], mat)
    vec3.subtract(mm100, mm100, mm000)
    const mm010 = this.vox2mm([0, 1, 0], mat)
    vec3.subtract(mm010, mm010, mm000)
    const mm001 = this.vox2mm([0, 0, 1], mat)
    vec3.subtract(mm001, mm001, mm000)
    this.hdr.pixDims[1] = vec3.length(mm100)
    this.hdr.pixDims[2] = vec3.length(mm010)
    this.hdr.pixDims[3] = vec3.length(mm001)
  }

  // not included in public docs
  // read DICOM format image and treat it like a NIfTI
  readDICOM = function (buf) {
    this.series = new daikon.Series()
    // parse DICOM file
    if (Array.isArray(buf)) {
      for (let i = 0; i < buf.length; i++) {
        const dataview = new DataView(buf[i])
        const image = daikon.Series.parseImage(dataview)
        if (image === null) {
          console.error(daikon.Series.parserError)
        } else if (image.hasPixelData()) {
          // if it's part of the same series, add it
          if (this.series.images.length === 0 || image.getSeriesId() === this.series.images[0].getSeriesId()) {
            this.series.addImage(image)
          }
        } // if hasPixelData
      } // for i
    } else {
      // not a dicom folder drop
      const image = daikon.Series.parseImage(new DataView(buf))
      if (image === null) {
        console.error(daikon.Series.parserError)
      } else if (image.hasPixelData()) {
        // if it's part of the same series, add it
        if (this.series.images.length === 0 || image.getSeriesId() === this.series.images[0].getSeriesId()) {
          this.series.addImage(image)
        }
      }
    }
    // order the image files, determines number of frames, etc.
    this.series.buildSeries()
    // output some header info
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.scl_inter = 0
    hdr.scl_slope = 1
    if (this.series.images[0].getDataScaleIntercept()) {
      hdr.scl_inter = this.series.images[0].getDataScaleIntercept()
    }
    if (this.series.images[0].getDataScaleSlope()) {
      hdr.scl_slope = this.series.images[0].getDataScaleSlope()
    }
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.dims[1] = this.series.images[0].getCols()
    hdr.dims[2] = this.series.images[0].getRows()
    hdr.dims[3] = this.series.images[0].getNumberOfFrames()
    if (this.series.images.length > 1) {
      if (hdr.dims[3] > 1) {
        console.log('To Do: multiple slices per file and multiple files (XA30 DWI)')
      }
      hdr.dims[3] = this.series.images.length
    }
    const rc = this.series.images[0].getPixelSpacing() // TODO: order?
    hdr.pixDims[1] = rc[0]
    hdr.pixDims[2] = rc[1]
    if (this.series.images.length > 1) {
      // Multiple slices. The depth of a pixel is the physical distance between offsets. This is not the same as slice
      // spacing for tilted slices (skew).
      const p0 = vec3.fromValues(...this.series.images[0].getImagePosition())
      const p1 = vec3.fromValues(...this.series.images[1].getImagePosition())
      const n = vec3.fromValues(0, 0, 0)
      vec3.subtract(n, p0, p1)
      hdr.pixDims[3] = vec3.length(n)
    } else {
      // Single slice. Use the slice thickness as pixel depth.
      hdr.pixDims[3] = this.series.images[0].getSliceThickness()
    }
    hdr.pixDims[4] = this.series.images[0].getTR() / 1000.0 // msec -> sec
    const dt = this.series.images[0].getDataType() // 2=int,3=uint,4=float,
    const bpv = this.series.images[0].getBitsAllocated()
    hdr.numBitsPerVoxel = bpv
    this.hdr.littleEndian = this.series.images[0].littleEndian
    if (bpv === 8 && dt === 2) {
      hdr.datatypeCode = this.DT_INT8
    } else if (bpv === 8 && dt === 3) {
      hdr.datatypeCode = this.DT_UNSIGNED_CHAR
    } else if (bpv === 16 && dt === 2) {
      hdr.datatypeCode = this.DT_SIGNED_SHORT
    } else if (bpv === 16 && dt === 3) {
      hdr.datatypeCode = this.DT_UINT16
    } else if (bpv === 32 && dt === 2) {
      hdr.datatypeCode = this.DT_SIGNED_INT
    } else if (bpv === 32 && dt === 3) {
      hdr.datatypeCode = this.DT_UINT32
    } else if (bpv === 32 && dt === 4) {
      hdr.datatypeCode = this.DT_FLOAT
    } else if (bpv === 64 && dt === 4) {
      hdr.datatypeCode = this.DT_DOUBLE
    } else {
      console.log('Unsupported DICOM format: ' + dt + ' ' + bpv)
    }
    const voxelDimensions = hdr.pixDims.slice(1, 4)
    // console.log("dir", this.series.images[0].getImageDirections());
    // console.log("pos", this.series.images[0].getImagePosition());
    // console.log("dims", voxelDimensions);
    const m = getBestTransform(
      this.series.images[0].getImageDirections(),
      voxelDimensions,
      this.series.images[0].getImagePosition()
    )
    if (m) {
      hdr.sform_code = 1
      hdr.affine = [
        [m[0][0], m[0][1], m[0][2], m[0][3]],
        [m[1][0], m[1][1], m[1][2], m[1][3]],
        [m[2][0], m[2][1], m[2][2], m[2][3]],
        [0, 0, 0, 1]
      ]
    }
    // console.log("DICOM", this.series.images[0]);
    // console.log("NIfTI", hdr);
    let imgRaw = []
    // let byteLength = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * (bpv / 8);
    let data
    let length = this.series.validatePixelDataLength(this.series.images[0])
    const buffer = new Uint8Array(new ArrayBuffer(length * this.series.images.length))
    // implementation copied from:
    // https://github.com/rii-mango/Daikon/blob/bbe08bad9758dfbdf31ca22fb79048c7bad85706/src/series.js#L496
    for (let i = 0; i < this.series.images.length; i++) {
      if (this.series.isMosaic) {
        data = this.series.getMosaicData(this.series.images[i], this.series.images[i].getPixelDataBytes())
      } else {
        data = this.series.images[i].getPixelDataBytes()
      }
      length = this.series.validatePixelDataLength(this.series.images[i])
      this.series.images[i].clearPixelData()
      buffer.set(new Uint8Array(data, 0, length), length * i)
    } // for images.length
    imgRaw = buffer.buffer
    return imgRaw
  } // readDICOM()

  // not included in public docs
  // read ECAT7 format image
  // https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info
  readECAT = function (buffer) {
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)

    const signature = reader.getInt32(0, false) // "MATR"
    const filetype = reader.getInt16(50, false)
    if (signature !== 1296127058 || filetype < 1 || filetype > 14) {
      console.log('Not a valid ECAT file')
      return
    }
    // list header, starts at 512 bytes: int32_t hdr[4], r[31][4];
    let pos = 512 // 512=main header, 4*32-bit hdr
    let vols = 0
    const frame_duration = []
    let rawImg = []
    while (true) {
      // read 512 block lists
      const hdr0 = reader.getInt32(pos, false)
      const hdr3 = reader.getInt32(pos + 12, false)
      if (hdr0 + hdr3 !== 31) {
        break
      }
      let lpos = pos + 20 // skip hdr and read slice offset (r[0][1])
      let r = 0
      let voloffset = 0
      while (r < 31) {
        // r[0][1]...r[30][1]
        voloffset = reader.getInt32(lpos, false)
        lpos += 16 // e.g. r[0][1] to r[1][1]
        if (voloffset === 0) {
          break
        }
        r++
        let ipos = voloffset * 512 // image start position
        const spos = ipos - 512 // subheader for matrix image, immediately before image
        const data_type = reader.getUint16(spos, false)
        hdr.dims[1] = reader.getUint16(spos + 4, false)
        hdr.dims[2] = reader.getUint16(spos + 6, false)
        hdr.dims[3] = reader.getUint16(spos + 8, false)
        const scale_factor = reader.getFloat32(spos + 26, false)
        hdr.pixDims[1] = reader.getFloat32(spos + 34, false) * 10.0 // cm -> mm
        hdr.pixDims[2] = reader.getFloat32(spos + 38, false) * 10.0 // cm -> mm
        hdr.pixDims[3] = reader.getFloat32(spos + 42, false) * 10.0 // cm -> mm
        hdr.pixDims[4] = reader.getUint32(spos + 46, false) / 1000.0 // ms -> sec
        frame_duration.push(hdr.pixDims[4])
        const nvox3D = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
        const newImg = new Float32Array(nvox3D) // convert to float32 as scale varies
        if (data_type === 1) {
          // uint8
          for (let i = 0; i < nvox3D; i++) {
            newImg[i] = reader.getUint8(ipos) * scale_factor
            ipos++
          }
        } else if (data_type === 6) {
          // uint16
          for (let i = 0; i < nvox3D; i++) {
            newImg[i] = reader.getUint16(ipos, false) * scale_factor
            ipos += 2
          }
        } else if (data_type === 7) {
          // uint32
          for (let i = 0; i < nvox3D; i++) {
            newImg[i] = reader.getUint32(ipos, false) * scale_factor
            ipos += 4
          }
        } else {
          console.log('Unknown ECAT data type ' + data_type)
        }
        const prevImg = rawImg.slice()
        rawImg = new Float32Array(prevImg.length + newImg.length)
        rawImg.set(prevImg)
        rawImg.set(newImg, prevImg.length)
        vols++
      }
      if (voloffset === 0) {
        break
      }
      pos += 512 // possible to have multiple 512-byte lists of images
    }
    hdr.dims[4] = vols
    hdr.pixDims[4] = frame_duration[0]
    if (vols > 1) {
      hdr.dims[0] = 4
      let isFDvaries = false
      for (let i = 0; i < vols; i++) {
        if (frame_duration[i] !== frame_duration[0]) {
          isFDvaries = true
        }
      }
      if (isFDvaries) {
        console.log('Frame durations vary')
      }
    }
    hdr.sform_code = 1
    hdr.affine = [
      [-hdr.pixDims[1], 0, 0, (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
      [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
      [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
      [0, 0, 0, 1]
    ]
    hdr.numBitsPerVoxel = 32
    hdr.datatypeCode = this.DT_FLOAT
    return rawImg
  } // readECAT()

  readV16 = function (buffer) {
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)
    hdr.dims[1] = reader.getUint16(0, true)
    hdr.dims[2] = reader.getUint16(2, true)
    hdr.dims[3] = reader.getUint16(4, true)
    const nBytes = 2 * hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    if (nBytes + 6 !== buffer.byteLength) {
      console.log('This does not look like a valid BrainVoyager V16 file')
    }
    hdr.numBitsPerVoxel = 16
    hdr.datatypeCode = this.DT_UINT16
    console.log('Warning: V16 files have no spatial transforms')
    hdr.affine = [
      [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
      [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
      [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
      [0, 0, 0, 1]
    ]
    hdr.littleEndian = true
    return buffer.slice(6)
  } // readV16()

  // not included in public docs
  // read brainvoyager format VMR image
  // https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/343-developer-guide-2-6-the-format-of-vmr-files
  readVMR = function (buffer) {
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)
    const version = reader.getUint16(0, true)
    if (version !== 4) {
      console.log('Not a valid version 4 VMR image')
    }
    hdr.dims[1] = reader.getUint16(2, true)
    hdr.dims[2] = reader.getUint16(4, true)
    hdr.dims[3] = reader.getUint16(6, true)
    const nBytes = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    if (version >= 4) {
      let pos = 8 + nBytes // offset to post header
      // let xoff = reader.getUint16(pos, true);
      // let yoff = reader.getUint16(pos + 2, true);
      // let zoff = reader.getUint16(pos + 4, true);
      // let framingCube = reader.getUint16(pos + 6, true);
      // let posInfo = reader.getUint32(pos + 8, true);
      // let coordSys = reader.getUint32(pos + 12, true);
      // let XmmStart = reader.getFloat32(pos + 16, true);
      // let YmmStart = reader.getFloat32(pos + 20, true);
      // let ZmmStart = reader.getFloat32(pos + 24, true);
      // let XmmEnd = reader.getFloat32(pos + 28, true);
      // let YmmEnd = reader.getFloat32(pos + 32, true);
      // let ZmmEnd = reader.getFloat32(pos + 36, true);
      // let Xsl = reader.getFloat32(pos + 40, true);
      // let Ysl = reader.getFloat32(pos + 44, true);
      // let Zsl = reader.getFloat32(pos + 48, true);
      // let colDirX = reader.getFloat32(pos + 52, true);
      // let colDirY = reader.getFloat32(pos + 56, true);
      // let colDirZ = reader.getFloat32(pos + 60, true);
      // let nRow = reader.getUint32(pos + 64, true);
      // let nCol = reader.getUint32(pos + 68, true);
      // let FOVrow = reader.getFloat32(pos + 72, true);
      // let FOVcol = reader.getFloat32(pos + 76, true);
      // let sliceThickness = reader.getFloat32(pos + 80, true);
      // let gapThickness = reader.getFloat32(pos + 84, true);
      const nSpatialTransforms = reader.getUint32(pos + 88, true)
      pos = pos + 92
      if (nSpatialTransforms > 0) {
        const len = buffer.byteLength
        for (let i = 0; i < nSpatialTransforms; i++) {
          // read variable length name name...
          while (pos < len && reader.getUint8(pos) !== 0) {
            pos++
          }
          pos++
          // let typ = reader.getUint32(pos, true);
          pos += 4
          // read variable length name name...
          while (pos < len && reader.getUint8(pos) !== 0) {
            pos++
          }
          pos++
          const nValues = reader.getUint32(pos, true)
          pos += 4
          for (let j = 0; j < nValues; j++) {
            pos += 4
          }
        }
      }
      // let LRconv = reader.getUint8(pos);
      // let ref = reader.getUint8(pos + 1);
      hdr.pixDims[1] = reader.getFloat32(pos + 2, true)
      hdr.pixDims[2] = reader.getFloat32(pos + 6, true)
      hdr.pixDims[3] = reader.getFloat32(pos + 10, true)
      // let isVer = reader.getUint8(pos + 14);
      // let isTal = reader.getUint8(pos + 15);
      // let minInten = reader.getInt32(pos + 16, true);
      // let meanInten = reader.getInt32(pos + 20, true);
      // let maxInten = reader.getInt32(pos + 24, true);
    }
    console.log('Warning: VMR spatial transform not implemented')
    // if (XmmStart === XmmEnd) { // https://brainvoyager.com/bv/sampledata/index.html??
    hdr.affine = [
      [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
      [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
      [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
      [0, 0, 0, 1]
    ]
    // }
    console.log(hdr)
    hdr.numBitsPerVoxel = 8
    hdr.datatypeCode = this.DT_UNSIGNED_CHAR
    return buffer.slice(8, 8 + nBytes)
  } // readVMR()

  // not included in public docs
  // read FreeSurfer MGH format image
  readMGH = function (buffer) {
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.littleEndian = false // MGH always big ending
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    let raw = buffer
    let reader = new DataView(raw)
    if (reader.getUint8(0) === 31 && reader.getUint8(1) === 139) {
      const raw8 = decompressSync(new Uint8Array(buffer))
      raw = raw8.buffer
      reader = new DataView(raw)
    }
    const version = reader.getInt32(0, false)
    const width = reader.getInt32(4, false)
    const height = reader.getInt32(8, false)
    const depth = reader.getInt32(12, false)
    const nframes = reader.getInt32(16, false)
    const mtype = reader.getInt32(20, false)
    // let dof = reader.getInt32(24, false);
    // let goodRASFlag = reader.getInt16(28, false);
    const spacingX = reader.getFloat32(30, false)
    const spacingY = reader.getFloat32(34, false)
    const spacingZ = reader.getFloat32(38, false)
    const xr = reader.getFloat32(42, false)
    const xa = reader.getFloat32(46, false)
    const xs = reader.getFloat32(50, false)
    const yr = reader.getFloat32(54, false)
    const ya = reader.getFloat32(58, false)
    const ys = reader.getFloat32(62, false)
    const zr = reader.getFloat32(66, false)
    const za = reader.getFloat32(70, false)
    const zs = reader.getFloat32(74, false)
    const cr = reader.getFloat32(78, false)
    const ca = reader.getFloat32(82, false)
    const cs = reader.getFloat32(86, false)
    if (version !== 1 || mtype < 0 || mtype > 4) {
      console.log('Not a valid MGH file')
    }
    if (mtype === 0) {
      hdr.numBitsPerVoxel = 8
      hdr.datatypeCode = this.DT_UNSIGNED_CHAR
    } else if (mtype === 4) {
      hdr.numBitsPerVoxel = 16
      hdr.datatypeCode = this.DT_SIGNED_SHORT
    } else if (mtype === 1) {
      hdr.numBitsPerVoxel = 32
      hdr.datatypeCode = this.DT_SIGNED_INT
    } else if (mtype === 3) {
      hdr.numBitsPerVoxel = 32
      hdr.datatypeCode = this.DT_FLOAT
    }
    hdr.dims[1] = width
    hdr.dims[2] = height
    hdr.dims[3] = depth
    hdr.dims[4] = nframes
    if (nframes > 1) {
      hdr.dims[0] = 4
    }
    hdr.pixDims[1] = spacingX
    hdr.pixDims[2] = spacingY
    hdr.pixDims[3] = spacingZ
    hdr.vox_offset = 284
    hdr.sform_code = 1
    const rot44 = mat4.fromValues(
      xr * hdr.pixDims[1],
      yr * hdr.pixDims[2],
      zr * hdr.pixDims[3],
      0,
      xa * hdr.pixDims[1],
      ya * hdr.pixDims[2],
      za * hdr.pixDims[3],
      0,
      xs * hdr.pixDims[1],
      ys * hdr.pixDims[2],
      zs * hdr.pixDims[3],
      0,
      0,
      0,
      0,
      1
    )
    const Pcrs = [hdr.dims[1] / 2.0, hdr.dims[2] / 2.0, hdr.dims[3] / 2.0, 1]

    const PxyzOffset = [0, 0, 0, 0]
    for (let i = 0; i < 3; i++) {
      PxyzOffset[i] = 0
      for (let j = 0; j < 3; j++) {
        PxyzOffset[i] = PxyzOffset[i] + rot44[j + i * 4] * Pcrs[j]
      }
    }
    hdr.affine = [
      [rot44[0], rot44[1], rot44[2], cr - PxyzOffset[0]],
      [rot44[4], rot44[5], rot44[6], ca - PxyzOffset[1]],
      [rot44[8], rot44[9], rot44[10], cs - PxyzOffset[2]],
      [0, 0, 0, 1]
    ]
    const nBytes = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4] * (hdr.numBitsPerVoxel / 8)
    return raw.slice(hdr.vox_offset, hdr.vox_offset + nBytes)
  } // readMGH()

  // not included in public docs
  // read AFNI head/brik format image
  readHEAD = function (dataBuffer, pairedImgData) {
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.dims[0] = 3
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    let orientSpecific = [0, 0, 0]
    let xyzOrigin = [0, 0, 0]
    let xyzDelta = [1, 1, 1]
    const txt = new TextDecoder().decode(dataBuffer)
    const lines = txt.split(/\r?\n/)
    // embed entire AFNI HEAD text as NIfTI extension
    const mod = (dataBuffer.byteLength + 8) % 16
    const len = dataBuffer.byteLength + (16 - mod)
    console.log(dataBuffer.byteLength, 'len', len)
    const extBuffer = new Uint8Array(len)
    extBuffer.fill(0)
    extBuffer.set(new Uint8Array(dataBuffer))
    const newExtension = new nifti.NIFTIEXTENSION(len + 8, 42, extBuffer, true)
    hdr.addExtension(newExtension)
    hdr.extensionCode = 42
    hdr.extensionFlag[0] = 1
    hdr.extensionSize = len + 8
    // Done creating an extension
    const nlines = lines.length
    let i = 0
    let hasIJK_TO_DICOM_REAL = false
    while (i < nlines) {
      let line = lines[i] // e.g. 'type = string-attribute'
      i++
      if (!line.startsWith('type')) {
        continue
      } // n.b. white space varies, "type =" vs "type  ="
      const isInt = line.includes('integer-attribute')
      const isFloat = line.includes('float-attribute')
      line = lines[i] // e.g. 'name = IDCODE_DATE'
      i++
      if (!line.startsWith('name')) {
        continue
      }
      let items = line.split('= ')
      const key = items[1] // e.g. 'IDCODE_DATE'
      line = lines[i] // e.g. 'count = 5'
      i++
      items = line.split('= ')
      let count = parseInt(items[1]) // e.g. '5'
      if (count < 1) {
        continue
      }
      line = lines[i] // e.g. ''LSB_FIRST~'
      i++
      items = line.trim().split(/\s+/)
      if (isFloat || isInt) {
        // read arrays written on multiple lines
        while (items.length < count) {
          line = lines[i] // e.g. ''LSB_FIRST~'
          i++
          const items2 = line.trim().split(/\s+/)
          items.push(...items2)
        }
        for (let j = 0; j < count; j++) {
          items[j] = parseFloat(items[j])
        }
      }
      switch (key) {
        case 'BYTEORDER_STRING':
          if (items[0].includes('LSB_FIRST')) {
            hdr.littleEndian = true
          } else if (items[0].includes('MSB_FIRST')) {
            hdr.littleEndian = false
          }
          break
        case 'BRICK_TYPES':
          {
            hdr.dims[4] = count
            const datatype = parseInt(items[0])
            if (datatype === 0) {
              hdr.numBitsPerVoxel = 8
              hdr.datatypeCode = this.DT_UNSIGNED_CHAR
            } else if (datatype === 1) {
              hdr.numBitsPerVoxel = 16
              hdr.datatypeCode = this.DT_SIGNED_SHORT
            } else if (datatype === 3) {
              hdr.numBitsPerVoxel = 32
              hdr.datatypeCode = this.DT_FLOAT
            } else {
              console.log('Unknown BRICK_TYPES ', datatype)
            }
          }
          break
        case 'IJK_TO_DICOM_REAL':
          if (count < 12) {
            break
          }
          hasIJK_TO_DICOM_REAL = true
          hdr.sform_code = 2
          // note DICOM space is LPS while NIfTI is RAS
          hdr.affine = [
            [-items[0], -items[1], -items[2], -items[3]],
            [-items[4], -items[5], -items[6], -items[7]],
            [items[8], items[9], items[10], items[11]],
            [0, 0, 0, 1]
          ]
          break
        case 'DATASET_DIMENSIONS':
          count = Math.max(count, 3)
          for (let j = 0; j < count; j++) {
            hdr.dims[j + 1] = items[j]
          }
          break
        case 'ORIENT_SPECIFIC':
          orientSpecific = items
          break
        case 'ORIGIN':
          xyzOrigin = items
          break
        case 'DELTA':
          xyzDelta = items
          break
        case 'TAXIS_FLOATS':
          hdr.pixDims[4] = items[0]
          break
        default:
        // console.log('Unknown:',key);
      } // read item
    } // read all lines
    if (!hasIJK_TO_DICOM_REAL) {
      this.THD_daxes_to_NIFTI(xyzDelta, xyzOrigin, orientSpecific)
    } else {
      this.SetPixDimFromSForm()
    }
    const nBytes = (hdr.numBitsPerVoxel / 8) * hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4]
    if (pairedImgData.byteLength < nBytes) {
      // n.b. npm run dev implicitly extracts gz, npm run demo does not!
      // assume gz compressed
      const raw = decompressSync(new Uint8Array(pairedImgData))
      return raw.buffer
    }
    return pairedImgData.slice()
  }

  // not included in public docs
  // read ITK MHA format image
  // https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29
  readMHA = function (buffer, pairedImgData) {
    const len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be VTK: bytes = ' + buffer.byteLength)
    }
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function eol(c) {
      return c === 10 || c === 13 // c is either a line feed character (10) or carriage return character (13)
    }
    function readStr() {
      while (pos < len && eol(bytes[pos])) {
        pos++
      } // Skip blank lines
      const startPos = pos
      while (pos < len && !eol(bytes[pos])) {
        pos++
      } // Forward until end of line
      if (pos - startPos < 2) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos))
    }
    let line = readStr() // 1st line: signature
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.dims = [1, 1, 1, 1, 1, 1, 1, 1]
    hdr.littleEndian = true
    let isGz = false
    let isDetached = false
    const mat33 = mat3.fromValues(NaN, 0, 0, 0, 1, 0, 0, 0, 1)
    const offset = vec3.fromValues(0, 0, 0)
    while (line !== '') {
      let items = line.split(' ')
      if (items.length > 2) {
        items = items.slice(2)
      }
      if (line.startsWith('BinaryDataByteOrderMSB') && items[0].includes('False')) {
        hdr.littleEndian = true
      }
      if (line.startsWith('BinaryDataByteOrderMSB') && items[0].includes('True')) {
        hdr.littleEndian = false
      }
      if (line.startsWith('CompressedData') && items[0].includes('True')) {
        isGz = true
      }
      if (line.startsWith('TransformMatrix')) {
        for (let d = 0; d < 9; d++) {
          mat33[d] = parseFloat(items[d])
        }
      }
      if (line.startsWith('Offset')) {
        for (let d = 0; d < Math.min(items.length, 3); d++) {
          offset[d] = parseFloat(items[d])
        }
      }
      // if (line.startsWith("AnatomicalOrientation")) //we can ignore, tested with Slicer3D converting NIfTIspace images
      if (line.startsWith('ElementSpacing')) {
        for (let d = 0; d < items.length; d++) {
          hdr.pixDims[d + 1] = parseFloat(items[d])
        }
      }
      if (line.startsWith('DimSize')) {
        hdr.dims[0] = items.length
        for (let d = 0; d < items.length; d++) {
          hdr.dims[d + 1] = parseInt(items[d])
        }
      }
      if (line.startsWith('ElementType')) {
        switch (items[0]) {
          case 'MET_UCHAR':
            hdr.numBitsPerVoxel = 8
            hdr.datatypeCode = this.DT_UNSIGNED_CHAR
            break
          case 'MET_CHAR':
            hdr.numBitsPerVoxel = 8
            hdr.datatypeCode = this.DT_INT8
            break
          case 'MET_SHORT':
            hdr.numBitsPerVoxel = 16
            hdr.datatypeCode = this.DT_SIGNED_SHORT
            break
          case 'MET_USHORT':
            hdr.numBitsPerVoxel = 16
            hdr.datatypeCode = this.DT_UINT16
            break
          case 'MET_INT':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = this.DT_SIGNED_INT
            break
          case 'MET_UINT':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = this.DT_UINT32
            break
          case 'MET_FLOAT':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = this.DT_FLOAT
            break
          case 'MET_DOUBLE':
            hdr.numBitsPerVoxel = 64
            hdr.datatypeCode = this.DT_DOUBLE
            break
          default:
            throw new Error('Unsupported NRRD data type: ' + items[0])
        }
      }
      if (line.startsWith('ObjectType') && !items[0].includes('Image')) {
        console.log('Only able to read ObjectType = Image, not ' + line)
      }
      if (line.startsWith('ElementDataFile')) {
        if (items[0] !== 'LOCAL') {
          isDetached = true
        }
        break
      }
      line = readStr()
    }
    const mmMat = mat3.fromValues(hdr.pixDims[1], 0, 0, 0, hdr.pixDims[2], 0, 0, 0, hdr.pixDims[3])
    mat3.multiply(mat33, mat33, mmMat)
    hdr.affine = [
      [-mat33[0], -mat33[3], -mat33[6], -offset[0]],
      [-mat33[1], -mat33[4], -mat33[7], -offset[1]],
      [mat33[2], mat33[5], mat33[8], offset[2]],
      [0, 0, 0, 1]
    ]
    hdr.vox_offset = pos
    if (isDetached && pairedImgData) {
      if (isGz) {
        return decompressSync(new Uint8Array(pairedImgData.slice())).buffer
      }
      return pairedImgData.slice()
    }
    if (isGz) {
      return decompressSync(new Uint8Array(buffer.slice(hdr.vox_offset))).buffer
    }
    return buffer.slice(hdr.vox_offset)
  } // readMHA()

  // not included in public docs
  // read mrtrix MIF format image
  // https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats
  readMIF = function (buffer, pairedImgData) {
    // MIF files typically 3D (e.g. anatomical), 4D (fMRI, DWI). 5D rarely seen
    // This read currently supports up to 5D. To create test: "mrcat -axis 4 a4d.mif b4d.mif out5d.mif"
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.dims = [1, 1, 1, 1, 1, 1, 1, 1]
    let len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be MIF: bytes = ' + len)
    }
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 31 && bytes[1] === 139) {
      console.log('MIF with GZ decompression')
      const raw = decompressSync(new Uint8Array(buffer))
      buffer = raw.buffer
      len = buffer.byteLength
    }
    let pos = 0
    function readStr() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: signature 'mrtrix tracks'
    if (!line.startsWith('mrtrix image')) {
      console.log('Not a valid MIF file')
      return
    }
    const layout = []
    let nTransform = 0
    let TR = 0
    let isDetached = false
    line = readStr()
    while (pos < len && !line.startsWith('END')) {
      let items = line.split(':') // "vox: 1,1,1" -> "vox", " 1,1,1"
      line = readStr()
      if (items.length < 2) {
        break
      } //
      const tag = items[0] // "datatype", "dim"
      items = items[1].split(',') // " 1,1,1" -> " 1", "1", "1"
      for (let i = 0; i < items.length; i++) {
        items[i] = items[i].trim()
      } // " 1", "1", "1" -> "1", "1", "1"
      switch (tag) {
        case 'dim':
          hdr.dims[0] = items.length
          for (let i = 0; i < items.length; i++) {
            hdr.dims[i + 1] = parseInt(items[i])
          }
          break
        case 'vox':
          for (let i = 0; i < items.length; i++) {
            hdr.pixDims[i + 1] = parseFloat(items[i])
            if (isNaN(hdr.pixDims[i + 1])) {
              hdr.pixDims[i + 1] = 0.0
            }
          }
          break
        case 'layout':
          for (let i = 0; i < items.length; i++) {
            layout.push(parseInt(items[i]))
          } // n.b. JavaScript preserves sign for -0
          break
        case 'datatype':
          {
            const dt = items[0]
            if (dt.startsWith('Int8')) {
              hdr.datatypeCode = this.DT_INT8
            } else if (dt.startsWith('UInt8')) {
              hdr.datatypeCode = this.DT_UNSIGNED_CHAR
            } else if (dt.startsWith('Int16')) {
              hdr.datatypeCode = this.DT_SIGNED_SHORT
            } else if (dt.startsWith('UInt16')) {
              hdr.datatypeCode = this.DT_UINT16
            } else if (dt.startsWith('Int32')) {
              hdr.datatypeCode = this.DT_SIGNED_INT
            } else if (dt.startsWith('UInt32')) {
              hdr.datatypeCode = this.DT_UINT32
            } else if (dt.startsWith('Float32')) {
              hdr.datatypeCode = this.DT_FLOAT
            } else if (dt.startsWith('Float64')) {
              hdr.datatypeCode = this.DT_DOUBLE
            } else {
              console.log('Unsupported datatype ' + dt)
            }
            if (dt.includes('8')) {
              hdr.numBitsPerVoxel = 8
            } else if (dt.includes('16')) {
              hdr.numBitsPerVoxel = 16
            } else if (dt.includes('32')) {
              hdr.numBitsPerVoxel = 32
            } else if (dt.includes('64')) {
              hdr.numBitsPerVoxel = 64
            }
            hdr.littleEndian = true // native, to do support big endian readers
            if (dt.endsWith('LE')) {
              hdr.littleEndian = true
            }
            if (dt.endsWith('BE')) {
              hdr.littleEndian = false
            }
          }
          break
        case 'transform':
          if (nTransform > 2 || items.length !== 4) {
            break
          }
          hdr.affine[nTransform][0] = parseFloat(items[0])
          hdr.affine[nTransform][1] = parseFloat(items[1])
          hdr.affine[nTransform][2] = parseFloat(items[2])
          hdr.affine[nTransform][3] = parseFloat(items[3])
          nTransform++
          break
        case 'RepetitionTime':
          TR = parseFloat(items[0])
          break
        case 'file':
          isDetached = !items[0].startsWith('. ')
          if (!isDetached) {
            items = items[0].split(' ') // ". 2336" -> ". ", "2336"
            hdr.vox_offset = parseInt(items[1])
          }
          break
      }
    }
    const ndim = hdr.dims[0]
    if (ndim > 5) {
      console.log('reader only designed for a maximum of 5 dimensions (XYZTD)')
    }
    let nvox = 1
    for (let i = 0; i < ndim; i++) {
      nvox *= Math.max(hdr.dims[i + 1], 1)
    }
    console.log(nvox)
    // let nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // hdr.affine[i][j] *= hdr.pixDims[i + 1];
        hdr.affine[i][j] *= hdr.pixDims[j + 1]
      }
    }
    console.log('mif affine:' + hdr.affine[0])
    if (TR > 0) {
      hdr.pixDims[4] = TR
    }
    if (isDetached && !pairedImgData) {
      console.log('MIH header provided without paired image data')
    }
    let rawImg = []
    if (isDetached) {
      rawImg = pairedImgData.slice()
    }
    // n.b. mrconvert can pad files? See dtitest_Siemens_SC 4_dti_nopf_x2_pitch
    else {
      rawImg = buffer.slice(hdr.vox_offset, hdr.vox_offset + nvox * (hdr.numBitsPerVoxel / 8))
    }
    if (layout.length !== hdr.dims[0]) {
      console.log('dims does not match layout')
    }
    // estimate strides:
    let stride = 1
    const instride = [1, 1, 1, 1, 1]
    const inflip = [false, false, false, false, false]
    for (let i = 0; i < layout.length; i++) {
      for (let j = 0; j < layout.length; j++) {
        const a = Math.abs(layout[j])
        if (a !== i) {
          continue
        }
        instride[j] = stride
        // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
        if (layout[j] < 0 || Object.is(layout[j], -0)) {
          inflip[j] = true
        }
        stride *= hdr.dims[j + 1]
      }
    }
    // lookup table for flips and stride offsets:
    const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
    let xlut = range(0, hdr.dims[1] - 1, 1)
    if (inflip[0]) {
      xlut = range(hdr.dims[1] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[1]; i++) {
      xlut[i] *= instride[0]
    }
    let ylut = range(0, hdr.dims[2] - 1, 1)
    if (inflip[1]) {
      ylut = range(hdr.dims[2] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[2]; i++) {
      ylut[i] *= instride[1]
    }
    let zlut = range(0, hdr.dims[3] - 1, 1)
    if (inflip[2]) {
      zlut = range(hdr.dims[3] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[3]; i++) {
      zlut[i] *= instride[2]
    }
    let tlut = range(0, hdr.dims[4] - 1, 1)
    if (inflip[3]) {
      tlut = range(hdr.dims[4] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[4]; i++) {
      tlut[i] *= instride[3]
    }
    let dlut = range(0, hdr.dims[5] - 1, 1)
    if (inflip[4]) {
      dlut = range(hdr.dims[5] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[5]; i++) {
      dlut[i] *= instride[4]
    }
    // input and output arrays
    let j = 0
    let inVs = []
    let outVs = []
    if (hdr.numBitsPerVoxel === 8) {
      inVs = new Uint8Array(rawImg)
      outVs = new Uint8Array(nvox)
    } // 8bit
    if (hdr.numBitsPerVoxel === 16) {
      inVs = new Uint16Array(rawImg)
      outVs = new Uint16Array(nvox)
    }
    if (hdr.numBitsPerVoxel === 32) {
      inVs = new Uint32Array(rawImg)
      outVs = new Uint32Array(nvox)
    } // 32bit
    if (hdr.numBitsPerVoxel === 64) {
      inVs = new BigUint64Array(rawImg)
      outVs = new BigUint64Array(nvox)
    } // 64bit
    for (let d = 0; d < hdr.dims[5]; d++) {
      for (let t = 0; t < hdr.dims[4]; t++) {
        for (let z = 0; z < hdr.dims[3]; z++) {
          for (let y = 0; y < hdr.dims[2]; y++) {
            for (let x = 0; x < hdr.dims[1]; x++) {
              outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z] + tlut[t] + dlut[d]]
              j++
            } // for x
          } // for y
        } // for z
      } // for t (time)
    } // for d (direction, phase/real, etc)
    return outVs
  } // readMIF()

  // not included in public docs
  // read NRRD format image
  // http://teem.sourceforge.net/nrrd/format.html
  readNRRD = function (dataBuffer, pairedImgData) {
    // inspired by parserNRRD.js in https://github.com/xtk
    // Copyright (c) 2012 The X Toolkit Developers <dev@goXTK.com>
    // http://www.opensource.org/licenses/mit-license.php
    this.hdr = new nifti.NIFTI1()
    const hdr = this.hdr
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const len = dataBuffer.byteLength
    // extract initial text header
    let txt = null
    const bytes = new Uint8Array(dataBuffer)
    for (let i = 1; i < len; i++) {
      if (bytes[i - 1] === 10 && bytes[i] === 10) {
        const v = dataBuffer.slice(0, i - 1)
        txt = new TextDecoder().decode(v)
        hdr.vox_offset = i + 1
        break
      }
    }
    const lines = txt.split('\n')
    if (!lines[0].startsWith('NRRD')) {
      alert('Invalid NRRD image')
    }
    const n = lines.length
    let isGz = false
    let isMicron = false
    let isDetached = false
    const mat33 = mat3.fromValues(NaN, 0, 0, 0, 1, 0, 0, 0, 1)
    const offset = vec3.fromValues(0, 0, 0)
    let rot33 = mat3.create()
    for (let i = 1; i < n; i++) {
      let str = lines[i]
      if (str[0] === '#') {
        continue
      } // comment
      str = str.toLowerCase()
      const items = str.split(':')
      if (items.length < 2) {
        continue
      }
      const key = items[0].trim()
      let value = items[1].trim()
      value = value.replaceAll(')', ' ')
      value = value.replaceAll('(', ' ')
      value = value.trim()
      switch (key) {
        case 'data file':
          isDetached = true
          break
        case 'encoding':
          if (value.includes('raw')) {
            isGz = false
          } else if (value.includes('gz')) {
            isGz = true
          } else {
            alert('Unsupported NRRD encoding')
          }
          break
        case 'type':
          switch (value) {
            case 'uchar':
            case 'unsigned char':
            case 'uint8':
            case 'uint8_t':
              hdr.numBitsPerVoxel = 8
              hdr.datatypeCode = this.DT_UNSIGNED_CHAR
              break
            case 'signed char':
            case 'int8':
            case 'int8_t':
              hdr.numBitsPerVoxel = 8
              hdr.datatypeCode = this.DT_INT8
              break
            case 'short':
            case 'short int':
            case 'signed short':
            case 'signed short int':
            case 'int16':
            case 'int16_t':
              hdr.numBitsPerVoxel = 16
              hdr.datatypeCode = this.DT_SIGNED_SHORT
              break
            case 'ushort':
            case 'unsigned short':
            case 'unsigned short int':
            case 'uint16':
            case 'uint16_t':
              hdr.numBitsPerVoxel = 16
              hdr.datatypeCode = this.DT_UINT16
              break
            case 'int':
            case 'signed int':
            case 'int32':
            case 'int32_t':
              hdr.numBitsPerVoxel = 32
              hdr.datatypeCode = this.DT_SIGNED_INT
              break
            case 'uint':
            case 'unsigned int':
            case 'uint32':
            case 'uint32_t':
              hdr.numBitsPerVoxel = 32
              hdr.datatypeCode = this.DT_UINT32
              break
            case 'float':
              hdr.numBitsPerVoxel = 32
              hdr.datatypeCode = this.DT_FLOAT
              break
            case 'double':
              hdr.numBitsPerVoxel = 64
              hdr.datatypeCode = this.DT_DOUBLE
              break
            default:
              throw new Error('Unsupported NRRD data type: ' + value)
          }
          break
        case 'spacings':
          {
            const values = value.split(/[ ,]+/)
            for (let d = 0; d < values.length; d++) {
              hdr.pixDims[d + 1] = parseFloat(values[d])
            }
          }
          break
        case 'sizes':
          {
            const dims = value.split(/[ ,]+/)
            hdr.dims[0] = dims.length
            for (let d = 0; d < dims.length; d++) {
              hdr.dims[d + 1] = parseInt(dims[d])
            }
          }
          break
        case 'endian':
          if (value.includes('little')) {
            hdr.littleEndian = true
          } else if (value.includes('big')) {
            hdr.littleEndian = false
          }
          break
        case 'space directions':
          {
            const vs = value.split(/[ ,]+/)
            if (vs.length !== 9) {
              break
            }
            for (let d = 0; d < 9; d++) {
              mat33[d] = parseFloat(vs[d])
            }
          }
          break
        case 'space origin':
          {
            const ts = value.split(/[ ,]+/)
            if (ts.length !== 3) {
              break
            }
            offset[0] = parseFloat(ts[0])
            offset[1] = parseFloat(ts[1])
            offset[2] = parseFloat(ts[2])
          }
          break
        case 'space units':
          if (value.includes('microns')) {
            isMicron = true
          }
          break
        case 'space':
          if (value.includes('right-anterior-superior') || value.includes('RAS')) {
            rot33 = mat3.fromValues(
              1,
              0,
              0,

              0,
              1,
              0,

              0,
              0,
              1
            )
          } else if (value.includes('left-anterior-superior') || value.includes('LAS')) {
            rot33 = mat3.fromValues(
              -1,
              0,
              0,

              0,
              1,
              0,

              0,
              0,
              1
            )
          } else if (value.includes('left-posterior-superior') || value.includes('LPS')) {
            rot33 = mat3.fromValues(
              -1,
              0,
              0,

              0,
              -1,
              0,

              0,
              0,
              1
            )
          } else {
            console.log('Unsupported NRRD space value:', value)
          }
          break
        default:
        // console.log('Unknown:',key);
      } // read line
    } // read all lines
    if (!isNaN(mat33[0])) {
      // if spatial transform provided
      this.hdr.sform_code = 2
      if (isMicron) {
        // convert micron to mm
        mat4.multiplyScalar(mat33, mat33, 0.001)
        offset[0] *= 0.001
        offset[1] *= 0.001
        offset[2] *= 0.001
      }
      if (rot33[0] < 0) {
        offset[0] = -offset[0]
      } // origin L<->R
      if (rot33[4] < 0) {
        offset[1] = -offset[1]
      } // origin A<->P
      if (rot33[8] < 0) {
        offset[2] = -offset[2]
      } // origin S<->I
      mat3.multiply(mat33, rot33, mat33)
      const mat = mat4.fromValues(
        mat33[0],
        mat33[3],
        mat33[6],
        offset[0],
        mat33[1],
        mat33[4],
        mat33[7],
        offset[1],
        mat33[2],
        mat33[5],
        mat33[8],
        offset[2],
        0,
        0,
        0,
        1
      )
      const mm000 = this.vox2mm([0, 0, 0], mat)
      const mm100 = this.vox2mm([1, 0, 0], mat)
      vec3.subtract(mm100, mm100, mm000)
      const mm010 = this.vox2mm([0, 1, 0], mat)
      vec3.subtract(mm010, mm010, mm000)
      const mm001 = this.vox2mm([0, 0, 1], mat)
      vec3.subtract(mm001, mm001, mm000)
      hdr.pixDims[1] = vec3.length(mm100)
      hdr.pixDims[2] = vec3.length(mm010)
      hdr.pixDims[3] = vec3.length(mm001)
      hdr.affine = [
        [mat[0], mat[1], mat[2], mat[3]],
        [mat[4], mat[5], mat[6], mat[7]],
        [mat[8], mat[9], mat[10], mat[11]],
        [0, 0, 0, 1]
      ]
    }

    if (isDetached && pairedImgData) {
      // ??? .gz files automatically decompressed?
      return pairedImgData.slice()
    }
    if (isDetached) {
      console.log('Missing data: NRRD header describes detached data file but only one URL provided')
    }
    if (isGz) {
      return decompressSync(new Uint8Array(dataBuffer.slice(hdr.vox_offset))).buffer
    } else {
      return dataBuffer.slice(hdr.vox_offset)
    }
  } // readNRRD()

  // not included in public docs
  // Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  calculateRAS = function () {
    // port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
    // not elegant, as JavaScript arrays are always 1D
    const a = this.hdr.affine
    const header = this.hdr
    const absR = mat3.fromValues(
      Math.abs(a[0][0]),
      Math.abs(a[0][1]),
      Math.abs(a[0][2]),
      Math.abs(a[1][0]),
      Math.abs(a[1][1]),
      Math.abs(a[1][2]),
      Math.abs(a[2][0]),
      Math.abs(a[2][1]),
      Math.abs(a[2][2])
    )
    // 1st column = x
    const ixyz = [1, 1, 1]
    if (absR[3] > absR[0]) {
      ixyz[0] = 2 // (absR[1][0] > absR[0][0]) ixyz[0] = 2;
    }
    if (absR[6] > absR[0] && absR[6] > absR[3]) {
      ixyz[0] = 3 // ((absR[2][0] > absR[0][0]) && (absR[2][0]> absR[1][0])) ixyz[0] = 3;
    } // 2nd column = y
    ixyz[1] = 1
    if (ixyz[0] === 1) {
      if (absR[4] > absR[7]) {
        // (absR[1][1] > absR[2][1])
        ixyz[1] = 2
      } else {
        ixyz[1] = 3
      }
    } else if (ixyz[0] === 2) {
      if (absR[1] > absR[7]) {
        // (absR[0][1] > absR[2][1])
        ixyz[1] = 1
      } else {
        ixyz[1] = 3
      }
    } else {
      if (absR[1] > absR[4]) {
        // (absR[0][1] > absR[1][1])
        ixyz[1] = 1
      } else {
        ixyz[1] = 2
      }
    }
    // 3rd column = z: constrained as x+y+z = 1+2+3 = 6
    ixyz[2] = 6 - ixyz[1] - ixyz[0]
    const perm = [1, 2, 3]
    perm[ixyz[0] - 1] = 1
    perm[ixyz[1] - 1] = 2
    perm[ixyz[2] - 1] = 3
    let rotM = mat4.fromValues(
      a[0][0],
      a[0][1],
      a[0][2],
      a[0][3],
      a[1][0],
      a[1][1],
      a[1][2],
      a[1][3],
      a[2][0],
      a[2][1],
      a[2][2],
      a[2][3],
      0,
      0,
      0,
      1
    )
    // n.b. 0.5 in these values to account for voxel centers, e.g. a 3-pixel wide bitmap in unit space has voxel centers at 0.25, 0.5 and 0.75
    this.mm000 = this.vox2mm([-0.5, -0.5, -0.5], rotM)
    this.mm100 = this.vox2mm([header.dims[1] - 0.5, -0.5, -0.5], rotM)
    this.mm010 = this.vox2mm([-0.5, header.dims[2] - 0.5, -0.5], rotM)
    this.mm001 = this.vox2mm([-0.5, -0.5, header.dims[3] - 0.5], rotM)
    const R = mat4.create()
    mat4.copy(R, rotM)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        R[i * 4 + j] = rotM[i * 4 + perm[j] - 1] // rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];
      }
    }
    const flip = [0, 0, 0]
    if (R[0] < 0) {
      flip[0] = 1
    } // R[0][0]
    if (R[5] < 0) {
      flip[1] = 1
    } // R[1][1]
    if (R[10] < 0) {
      flip[2] = 1
    } // R[2][2]
    this.dimsRAS = [header.dims[0], header.dims[perm[0]], header.dims[perm[1]], header.dims[perm[2]]]
    this.pixDimsRAS = [header.pixDims[0], header.pixDims[perm[0]], header.pixDims[perm[1]], header.pixDims[perm[2]]]
    this.permRAS = perm.slice()
    for (let i = 0; i < 3; i++) {
      if (flip[i] === 1) {
        this.permRAS[i] = -this.permRAS[i]
      }
    }
    if (this.arrayEquals(perm, [1, 2, 3]) && this.arrayEquals(flip, [0, 0, 0])) {
      this.toRAS = mat4.create() // aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
      this.matRAS = mat4.clone(rotM)
      this.calculateOblique()
      return // no rotation required!
    }
    mat4.identity(rotM)
    rotM[0 + 0 * 4] = 1 - flip[0] * 2
    rotM[1 + 1 * 4] = 1 - flip[1] * 2
    rotM[2 + 2 * 4] = 1 - flip[2] * 2
    rotM[3 + 0 * 4] = (header.dims[perm[0]] - 1) * flip[0]
    rotM[3 + 1 * 4] = (header.dims[perm[1]] - 1) * flip[1]
    rotM[3 + 2 * 4] = (header.dims[perm[2]] - 1) * flip[2]
    const residualR = mat4.create()
    mat4.invert(residualR, rotM)
    mat4.multiply(residualR, residualR, R)
    this.matRAS = mat4.clone(residualR)
    rotM = mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)
    rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1
    rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1
    rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1
    rotM[3 + 0 * 4] = flip[0]
    rotM[3 + 1 * 4] = flip[1]
    rotM[3 + 2 * 4] = flip[2]
    this.toRAS = mat4.clone(rotM) // webGL unit textures
    // voxel based column-major,
    rotM[3] = 0
    rotM[7] = 0
    rotM[11] = 0
    rotM[12] = 0
    if (this.permRAS[0] === -1 || this.permRAS[1] === -1 || this.permRAS[2] === -1) {
      rotM[12] = header.dims[1] - 1
    }
    rotM[13] = 0
    if (this.permRAS[0] === -2 || this.permRAS[1] === -2 || this.permRAS[2] === -2) {
      rotM[13] = header.dims[2] - 1
    }
    rotM[14] = 0
    if (this.permRAS[0] === -3 || this.permRAS[1] === -3 || this.permRAS[2] === -3) {
      rotM[14] = header.dims[3] - 1
    }
    this.toRASvox = mat4.clone(rotM)
    log.debug(this.hdr.dims)
    log.debug(this.dimsRAS)
    this.calculateOblique()
  }

  // Reorient raw image data to RAS
  // note that GPU-based orient shader is much faster
  img2RAS = function () {
    const perm = this.permRAS.slice()
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
      return this.img
    } // image is already in RAS
    const hdr = this.hdr
    // preallocate/clone image (only 3D for 4D datasets!)
    const imgRAS = this.img.slice(0, hdr.dims[1] * hdr.dims[1] * hdr.dims[2] * hdr.dims[3])
    const aperm = [Math.abs(perm[0]), Math.abs(perm[1]), Math.abs(perm[2])]
    const outdim = [hdr.dims[aperm[0]], hdr.dims[aperm[1]], hdr.dims[aperm[2]]]
    const inStep = [1, hdr.dims[1], hdr.dims[1] * hdr.dims[2]] // increment i,j,k
    const outStep = [inStep[aperm[0] - 1], inStep[aperm[1] - 1], inStep[aperm[2] - 1]]
    const outStart = [0, 0, 0]
    for (let p = 0; p < 3; p++) {
      // flip dimensions
      if (perm[p] < 0) {
        outStart[p] = outStep[p] * (outdim[p] - 1)
        outStep[p] = -outStep[p]
      }
    }
    let j = 0
    for (let z = 0; z < outdim[2]; z++) {
      const zi = outStart[2] + z * outStep[2]
      for (let y = 0; y < outdim[1]; y++) {
        const yi = outStart[1] + y * outStep[1]
        for (let x = 0; x < outdim[0]; x++) {
          const xi = outStart[0] + x * outStep[0]
          imgRAS[j] = this.img[xi + yi + zi]
          j++
        } // for x
      } // for y
    } // for z
    return imgRAS
  } // img2RAS()

  // not included in public docs
  // convert voxel location (row, column slice, indexed from 0) to world space
  vox2mm = function (XYZ, mtx) {
    const sform = mat4.clone(mtx)
    mat4.transpose(sform, sform)
    const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
    vec4.transformMat4(pos, pos, sform)
    const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
    return pos3
  } // vox2mm()

  // not included in public docs
  // convert world space to voxel location (row, column slice, indexed from 0)
  mm2vox = function (mm, frac = false) {
    const sform = mat4.clone(this.matRAS)
    const out = mat4.clone(sform)
    mat4.transpose(out, sform)
    mat4.invert(out, out)
    const pos = vec4.fromValues(mm[0], mm[1], mm[2], 1)
    vec4.transformMat4(pos, pos, out)
    const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
    if (frac) {
      return pos3
    }
    return [Math.round(pos3[0]), Math.round(pos3[1]), Math.round(pos3[2])]
  } // vox2mm()

  // not included in public docs
  // returns boolean: are two arrays identical?
  arrayEquals = function (a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
  }

  // not included in public docs
  // base function for niivue.setColormap()
  // colormaps are continuously interpolated between 256 values (0..256)
  setColormap = function (cm) {
    this._colormap = cm
    this.calMinMax()
    if (this.onColormapChange) {
      this.onColormapChange(this)
    }
  }

  // not included in public docs
  // base function for niivue.setColormap()
  // label colormaps are discretely sampled from an arbitrary number of colors
  setColormapLabel = function (cm) {
    this.colormapLabel = cmapper.makeLabelLut(cm)
  }

  setColormapLabelFromUrl = async function (url) {
    this.colormapLabel = await cmapper.makeLabelLutFromUrl(url)
  }

  get colormap() {
    return this._colormap
  }

  set colormap(colormap) {
    this.setColormap(colormap)
  }

  get opacity() {
    return this._opacity
  }

  set opacity(opacity) {
    this._opacity = opacity
    if (this.onOpacityChange) {
      this.onOpacityChange(this)
    }
  }

  // not included in public docs
  // given an overlayItem and its img TypedArray, calculate 2% and 98% display range if needed
  // clone FSL robust_range estimates https://github.com/rordenlab/niimath/blob/331758459140db59290a794350d0ff3ad4c37b67/src/core32.c#L1215
  // ToDo: convert to web assembly, this is slow in JavaScript
  calMinMax = function () {
    const cmap = cmapper.colormapFromKey(this._colormap)
    let cmMin = 0
    let cmMax = 0
    if (cmap.min !== undefined) {
      cmMin = cmap.min
    }
    if (cmap.max !== undefined) {
      cmMax = cmap.max
    }
    if (
      cmMin === cmMax &&
      this.trustCalMinMax &&
      isFinite(this.hdr.cal_min) &&
      isFinite(this.hdr.cal_max) &&
      this.hdr.cal_max > this.hdr.cal_min
    ) {
      this.cal_min = this.hdr.cal_min
      this.cal_max = this.hdr.cal_max
      this.robust_min = this.cal_min
      this.robust_max = this.cal_max
      this.global_min = this.hdr.cal_min
      this.global_max = this.hdr.cal_max
      return [this.hdr.cal_min, this.hdr.cal_max, this.hdr.cal_min, this.hdr.cal_max]
    }
    // if color map specifies non zero values for min and max then use them
    if (cmMin !== cmMax) {
      this.cal_min = cmMin
      this.cal_max = cmMax
      this.robust_min = this.cal_min
      this.robust_max = this.cal_max
      return [cmMin, cmMax, cmMin, cmMax]
    }
    // determine full range: min..max
    let mn = this.img[0]
    let mx = this.img[0]
    let nZero = 0
    let nNan = 0
    const nVox = this.img.length
    for (let i = 0; i < nVox; i++) {
      if (isNaN(this.img[i])) {
        nNan++
        continue
      }
      if (this.img[i] === 0) {
        nZero++
        if (this.ignoreZeroVoxels) {
          continue
        }
      }
      mn = Math.min(this.img[i], mn)
      mx = Math.max(this.img[i], mx)
    }
    const mnScale = this.intensityRaw2Scaled(mn)
    const mxScale = this.intensityRaw2Scaled(mx)
    if (!this.ignoreZeroVoxels) {
      nZero = 0
    }
    nZero += nNan
    const n2pct = Math.round((nVox - nZero) * this.percentileFrac)
    if (n2pct < 1 || mn === mx) {
      log.debug('no variability in image intensity?')
      this.cal_min = mnScale
      this.cal_max = mxScale
      this.robust_min = this.cal_min
      this.robust_max = this.cal_max
      this.global_min = mnScale
      this.global_max = mxScale
      return [mnScale, mxScale, mnScale, mxScale]
    }
    const nBins = 1001
    const scl = (nBins - 1) / (mx - mn)
    const hist = new Array(nBins)
    for (let i = 0; i < nBins; i++) {
      hist[i] = 0
    }
    if (this.ignoreZeroVoxels) {
      for (let i = 0; i <= nVox; i++) {
        if (this.img[i] === 0) {
          continue
        }
        if (isNaN(this.img[i])) {
          continue
        }
        hist[Math.round((this.img[i] - mn) * scl)]++
      }
    } else {
      for (let i = 0; i <= nVox; i++) {
        if (isNaN(this.img[i])) {
          continue
        }
        hist[Math.round((this.img[i] - mn) * scl)]++
      }
    }
    let n = 0
    let lo = 0
    while (n < n2pct) {
      n += hist[lo]
      lo++
    }
    lo-- // remove final increment
    n = 0
    let hi = nBins
    while (n < n2pct) {
      hi--
      n += hist[hi]
    }
    if (lo === hi) {
      // MAJORITY are not black or white
      let ok = -1
      while (ok !== 0) {
        if (lo > 0) {
          lo--
          if (hist[lo] > 0) {
            ok = 0
          }
        }
        if (ok !== 0 && hi < nBins - 1) {
          hi++
          if (hist[hi] > 0) {
            ok = 0
          }
        }
        if (lo === 0 && hi === nBins - 1) {
          ok = 0
        }
      } // while not ok
    } // if lo === hi
    let pct2 = this.intensityRaw2Scaled(lo / scl + mn)
    let pct98 = this.intensityRaw2Scaled(hi / scl + mn)
    if (this.hdr.cal_min < this.hdr.cal_max && this.hdr.cal_min >= mnScale && this.hdr.cal_max <= mxScale) {
      pct2 = this.hdr.cal_min
      pct98 = this.hdr.cal_max
    }
    this.cal_min = pct2
    this.cal_max = pct98
    this.robust_min = this.cal_min
    this.robust_max = this.cal_max
    this.global_min = mnScale
    this.global_max = mxScale
    return [pct2, pct98, mnScale, mxScale]
  } // calMinMax

  // not included in public docs
  // convert voxel intensity from stored value to scaled intensity
  intensityRaw2Scaled = function (raw) {
    if (this.hdr.scl_slope === 0) {
      this.hdr.scl_slope = 1.0
    }
    return raw * this.hdr.scl_slope + this.hdr.scl_inter
  }

  // convert voxel intensity from scaled intensity to stored value
  intensityScaled2Raw = function (scaled) {
    if (this.hdr.scl_slope === 0) {
      this.hdr.scl_slope = 1.0
    }
    return (scaled - this.hdr.scl_inter) / this.hdr.scl_slope
  }

  // not included in public docs
  // see niivue.saveImage() for wrapper of this function
  saveToUint8Array = async function (fnm, drawing8 = null) {
    const isDrawing8 = drawing8 !== null
    const hdrBytes = hdrToArrayBuffer(this.hdr, isDrawing8)
    const opad = new Uint8Array(4)
    let img8 = new Uint8Array(this.img.buffer)
    if (isDrawing8) {
      img8 = new Uint8Array(drawing8.buffer)
    }
    const odata = new Uint8Array(hdrBytes.length + opad.length + img8.length)
    odata.set(hdrBytes)
    odata.set(opad, hdrBytes.length)

    odata.set(img8, hdrBytes.length + opad.length)
    let saveData = null
    const compress = fnm.endsWith('.gz') // true if name ends with .gz
    if (compress) {
      saveData = gzipSync(odata, {
        // GZIP-specific: the filename to use when decompressed
        filename: fnm,
        // GZIP-specific: the modification time. Can be a Date, date string,
        // or Unix timestamp
        mtime: Date.now(),
        level: 6 // the default
      })
    } else {
      saveData = odata
    }
    return saveData
  }

  // not included in public docs
  // save image as NIfTI volume
  // if fnm is empty, data is returned
  saveToDisk = async function (fnm, drawing8 = null) {
    const saveData = await this.saveToUint8Array(fnm, drawing8)
    const isString = (typeof fnm === 'string' || fnm instanceof String) && fnm.length > 0
    if (isString) {
      const blob = new Blob([saveData.buffer], {
        type: 'application/octet-stream'
      })
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', blobUrl)
      link.setAttribute('download', fnm)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    return saveData
  } // saveToDisk()

  static async fetchDicomData(url) {
    if (url === '') {
      throw Error('url must not be empty')
    }

    // https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
    const absoluteUrlRE = /^(?:[a-z+]+:)?\/\//i

    let manifestUrl = absoluteUrlRE.test(url) ? url : new URL(url, window.location.href)
    const extensionRE = /(?:.([^.]+))?$/
    const extension = extensionRE.exec(manifestUrl.pathname)
    if (!extension) {
      manifestUrl = new URL('niivue-manifest.txt', url)
    }

    let response = await fetch(manifestUrl)
    if (!response.ok) {
      throw Error(response.statusText)
    }
    const text = await response.text()
    const lines = text.split('\n')

    const baseUrlRE = /(.*\/).*/
    const folderUrl = baseUrlRE.exec(manifestUrl)[0]
    const dataBuffer = []
    for (const line of lines) {
      const fileUrl = new URL(line, folderUrl)
      response = await fetch(fileUrl)
      if (!response.ok) {
        throw Error(response.statusText)
      }
      const contents = await response.arrayBuffer()
      dataBuffer.push(contents)
    }
    return dataBuffer
  }

  static async fetchPartial(url, bytesToLoad) {
    let response = []
    try {
      response = await fetch(url, {
        headers: { range: 'bytes=0-' + bytesToLoad }
      })
    } catch {
      response = await fetch(url)
    }
    return response
  }

  /**
   * factory function to load and return a new NVImage instance from a given URL
   * @constructs NVImage
   * @param {NVImageFromUrlOptions} options
   * @returns {NVImage} returns a NVImage instance
   * @example
   * myImage = NVImage.loadFromUrl('./someURL/image.nii.gz') // must be served from a server (local or remote)
   */
  static async loadFromUrl({
    url = '',
    urlImgData = '',
    name = '',
    colormap = 'gray',
    opacity = 1.0,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    visible = true,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    isManifest = false,
    limitFrames4D = NaN,
    imageType = NVIMAGE_TYPE.UNKNOWN
  } = {}) {
    if (url === '') {
      throw Error('url must not be empty')
    }
    let nvimage = null
    let dataBuffer = null
    if (url instanceof Uint8Array) {
      url = url.buffer
    } // convert Uint8Array -> ArrayBuffer
    if (url instanceof ArrayBuffer) {
      dataBuffer = url
      url = 'array.nii'
      const bytes = new Uint8Array(dataBuffer)
      if (bytes[0] === 31 && bytes[1] === 139) {
        url = 'array.nii.gz'
      }
    }
    // fetch data associated with image
    if (!isNaN(limitFrames4D)) {
      // let response = await fetch(url, { headers: { range: "bytes=0-352" } });
      // NIfTI header first 352 bytes
      // however, GZip header might can add bloat https://en.wikipedia.org/wiki/Gzip
      let response = await this.fetchPartial(url, 512)
      dataBuffer = await response.arrayBuffer()
      let bytes = new Uint8Array(dataBuffer)
      let isGz = false
      if (bytes[0] === 31 && bytes[1] === 139) {
        isGz = true
        const dcmpStrm = new Decompress((chunk) => {
          // console.log('decoded:', chunk);
          bytes = chunk
        })
        dcmpStrm.push(bytes)
        dataBuffer = bytes.buffer
      }
      let isNifti1 = bytes[0] === 92 && bytes[1] === 1
      if (!isNifti1) {
        isNifti1 = bytes[1] === 92 && bytes[0] === 1
      }
      if (!isNifti1) {
        dataBuffer = null
      } else {
        const hdr = nifti.readHeader(dataBuffer)
        const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
        let nVox3D = 1
        for (let i = 1; i < 4; i++) {
          if (hdr.dims[i] > 1) {
            nVox3D *= hdr.dims[i]
          }
        }
        let nFrame4D = 1
        for (let i = 4; i < 7; i++) {
          if (hdr.dims[i] > 1) {
            nFrame4D *= hdr.dims[i]
          }
        }
        const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
        const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
        if (dataBuffer.byteLength < bytesToLoad) {
          response = await this.fetchPartial(url, bytesToLoad)
          dataBuffer = await response.arrayBuffer()
          if (isGz) {
            let bytes = new Uint8Array(dataBuffer)
            const dcmpStrm2 = new Decompress((chunk) => {
              bytes = chunk
            })
            dcmpStrm2.push(bytes)
            dataBuffer = bytes.buffer
          }
        } // load image data
        if (dataBuffer.byteLength < bytesToLoad) {
          // fail: e.g. incompressible data
          dataBuffer = null
        } else {
          dataBuffer = dataBuffer.slice(0, bytesToLoad)
        }
      } // if isNifti1
    }
    if (dataBuffer) {
      //
    } else if (isManifest) {
      dataBuffer = await NVImage.fetchDicomData(url)
      imageType = NVIMAGE_TYPE.DCM_MANIFEST
    } else {
      const response = await fetch(url)
      if (!response.ok) {
        throw Error(response.statusText)
      }
      dataBuffer = await response.arrayBuffer()
    }

    const re = /(?:\.([^.]+))?$/
    let ext = ''
    if (name === '') {
      ext = re.exec(url)[1]
    } else {
      ext = re.exec(name)[1]
    }

    if (ext.toUpperCase() === 'HEAD') {
      if (urlImgData === '') {
        urlImgData = url.substring(0, url.lastIndexOf('HEAD')) + 'BRIK'
      }
    }
    let urlParts
    if (name === '') {
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

    let pairedImgData = null
    if (urlImgData.length > 0) {
      let resp = await fetch(urlImgData)
      if (resp.status === 404) {
        if (urlImgData.lastIndexOf('BRIK') !== -1) {
          resp = await fetch(urlImgData + '.gz')
        }
      }
      pairedImgData = await resp.arrayBuffer()
    }
    if (dataBuffer) {
      nvimage = new NVImage(
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
        visible,
        useQFormNotSForm,
        colormapNegative,
        frame4D,
        imageType
      )
      nvimage.url = url
    } else {
      alert('Unable to load buffer properly from volume')
    }

    return nvimage
  }

  // not included in public docs
  // loading Nifti files
  static readFileAsync(file, bytesToLoad = NaN) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (file.name.lastIndexOf('gz') !== -1 && isNaN(bytesToLoad)) {
          resolve(nifti.decompress(reader.result))
        } else {
          resolve(reader.result)
        }
      }

      reader.onerror = reject
      if (isNaN(bytesToLoad)) {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsArrayBuffer(file.slice(0, bytesToLoad))
      }
    })
  }

  /**
   * factory function to load and return a new NVImage instance from a file in the browser
   * @constructs NVImage
   * @param {string} file the file object
   * @param {string} [name=''] a name for this image. Default is an empty string
   * @param {string} [colormap='gray'] a color map to use. default is gray
   * @param {number} [opacity=1.0] the opacity for this image. default is 1
   * @param {string} [urlImgData=null] Allows loading formats where header and image are separate files (e.g. nifti.hdr, nifti.img)
   * @param {number} [cal_min=NaN] minimum intensity for color brightness/contrast
   * @param {number} [cal_max=NaN] maximum intensity for color brightness/contrast
   * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
   * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
   * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
   * @param {boolean} [visible=true] whether or not this image is to be visible
   * @param {boolean} [useQFormNotSForm=false] whether or not to use QForm instead of SForm during construction
   * @param {string} [colormapNegative=""] colormap negative for the image
   * @param {NVIMAGE_TYPE} [imageType=NVIMAGE_TYPE.UNKNOWN] image type
   * @returns {NVImage} returns a NVImage instance
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   */
  static async loadFromFile({
    file = null, // file can be an array of file objects or a single file object
    name = '',
    colormap = 'gray',
    opacity = 1.0,
    urlImgData = null,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    visible = true,
    useQFormNotSForm = false,
    colormapNegative = '',
    frame4D = 0,
    limitFrames4D = NaN,
    imageType = NVIMAGE_TYPE.UNKNOWN
  } = {}) {
    let nvimage = null
    let dataBuffer = []
    try {
      if (Array.isArray(file)) {
        for (let i = 0; i < file.length; i++) {
          dataBuffer.push(await this.readFileAsync(file[i]))
        }
      } else {
        if (!isNaN(limitFrames4D)) {
          dataBuffer = await this.readFileAsync(file, 512)
          let bytes = new Uint8Array(dataBuffer)
          let isGz = false
          if (bytes[0] === 31 && bytes[1] === 139) {
            isGz = true
            const dcmpStrm = new Decompress((chunk) => {
              // console.log('decoded:', chunk);
              bytes = chunk
            })
            await dcmpStrm.push(bytes)
            dataBuffer = bytes.buffer
          }
          let isNifti1 = bytes[0] === 92 && bytes[1] === 1
          if (!isNifti1) {
            isNifti1 = bytes[1] === 92 && bytes[0] === 1
          }
          if (!isNifti1) {
            dataBuffer = null
          } else {
            const hdr = nifti.readHeader(dataBuffer)
            const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
            let nVox3D = 1
            for (let i = 1; i < 4; i++) {
              if (hdr.dims[i] > 1) {
                nVox3D *= hdr.dims[i]
              }
            }
            let nFrame4D = 1
            for (let i = 4; i < 7; i++) {
              if (hdr.dims[i] > 1) {
                nFrame4D *= hdr.dims[i]
              }
            }
            const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
            const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
            if (dataBuffer.byteLength < bytesToLoad) {
              // response = await this.fetchPartial(url, bytesToLoad);
              // dataBuffer = await response.arrayBuffer();
              dataBuffer = await this.readFileAsync(file, bytesToLoad)
              if (isGz) {
                let bytes = new Uint8Array(dataBuffer)
                const dcmpStrm2 = new Decompress((chunk) => {
                  bytes = chunk
                })
                await dcmpStrm2.push(bytes)
                dataBuffer = bytes.buffer
              }
            } // load image data
            if (dataBuffer.byteLength < bytesToLoad) {
              // fail: e.g. incompressible data
              dataBuffer = null
            } else {
              dataBuffer = dataBuffer.slice(0, bytesToLoad)
            }
          } // if isNifti1
        } else {
          dataBuffer = await this.readFileAsync(file, limitFrames4D)
        }
        name = file.name
      }
      let pairedImgData = null
      if (urlImgData) {
        pairedImgData = await this.readFileAsync(urlImgData)
      }
      nvimage = new NVImage(
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
        visible,
        useQFormNotSForm,
        colormapNegative,
        frame4D,
        imageType
      )
      // add a reference to the file object as a new property of the NVImage instance
      // is this too hacky?
      nvimage.fileObject = file
    } catch (err) {
      console.log(err)
      log.debug(err)
    }
    return nvimage
  }

  /**
   * factory function to load and return a new NVImage instance from a base64 encoded string
   * @constructs NVImage
   * @param {string} [base64=null] base64 string
   * @param {string} [name=''] a name for this image. Default is an empty string
   * @param {string} [colormap='gray'] a color map to use. default is gray
   * @param {number} [opacity=1.0] the opacity for this image. default is 1
   * @param {number} [cal_min=NaN] minimum intensity for color brightness/contrast
   * @param {number} [cal_max=NaN] maximum intensity for color brightness/contrast
   * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
   * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
   * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
   * @param {boolean} [visible=true] whether or not this image is to be visible
   * @returns {NVImage} returns a NVImage instance
   * @example
   * myImage = NVImage.loadFromBase64('SomeBase64String')
   */
  static loadFromBase64({
    base64 = null,
    name = '',
    colormap = 'gray',
    opacity = 1.0,
    cal_min = NaN,
    cal_max = NaN,
    trustCalMinMax = true,
    percentileFrac = 0.02,
    ignoreZeroVoxels = false,
    visible = true
  } = {}) {
    // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
    function base64ToArrayBuffer(base64) {
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
      nvimage = new NVImage(
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
        visible
      )
    } catch (err) {
      log.debug(err)
    }

    return nvimage
  }

  /**
   * make a clone of a NVImage instance and return a new NVImage
   * @returns {NVImage} returns a NVImage instance
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   * clonedImage = myImage.clone()
   */
  clone = function () {
    const clonedImage = new NVImage()
    clonedImage.id = this.id
    clonedImage.hdr = Object.assign({}, this.hdr)
    clonedImage.img = this.img.slice()
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
  zeroImage = function () {
    this.img.fill(0)
  }

  /**
   * Image M.
   * @typedef {Object} NVImageMetadata
   * @property {string} id - unique if of image
   * @property {number} datatypeCode - data type
   * @property {number} nx - number of columns
   * @property {number} ny - number of rows
   * @property {number} nz - number of slices
   * @property {number} nt - number of volumes
   * @property {number} dx - space between columns
   * @property {number} dy - space between rows
   * @property {number} dz - space between slices
   * @property {number} dt - time between volumes
   * @property {number} bpx - bits per voxel
   */

  /**
   * get nifti specific metadata about the image
   * @returns {NVImageMetadata} - {@link NVImageMetadata}
   */
  getImageMetadata = function () {
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

    return {
      id,
      datatypeCode,
      nx,
      ny,
      nz,
      nt,
      dx,
      dy,
      dz,
      dt,
      bpv
    }
  }

  /**
   * a factory function to make a zero filled image given a NVImage as a reference
   * @param {NVImage} nvImage an existing NVImage as a reference
   * @param {dataType} string the output data type. Options: 'same', 'uint8'
   * @returns {NVImage} returns a new NVImage filled with zeros for the image data
   * @example
   * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
   * newZeroImage = NVImage.zerosLike(myImage)
   */
  static zerosLike(nvImage, dataType = 'same') {
    // dataType can be: 'same', 'uint8'
    // 'same' means that the zeroed image data type is the same as the input image
    const zeroClone = nvImage.clone()
    zeroClone.zeroImage()
    if (dataType === 'uint8') {
      zeroClone.img = Uint8Array.from(zeroClone.img)
      zeroClone.hdr.datatypeCode = zeroClone.DT_UNSIGNED_CHAR
      zeroClone.hdr.numBitsPerVoxel = 8
    }
    return zeroClone
  }

  // not included in public docs
  // return voxel intensity at specific coordinates (xyz are zero indexed column row, slice)
  getValue = function (x, y, z, frame4D = 0, isReadImaginary = false) {
    // const { nx, ny, nz } = this.getImageMetadata();
    const nx = this.hdr.dims[1]
    const ny = this.hdr.dims[2]
    const nz = this.hdr.dims[3]
    const perm = this.permRAS.slice()
    if (perm[0] !== 1 || perm[1] !== 2 || perm[2] !== 3) {
      const pos = vec4.fromValues(x, y, z, 1)
      vec4.transformMat4(pos, pos, this.toRASvox)
      x = pos[0]
      y = pos[1]
      z = pos[2]
    } // image is already in RAS
    let vx = x + y * nx + z * nx * ny

    if (this.hdr.datatypeCode === this.DT_RGBA32) {
      vx *= 4
      // convert rgb to luminance
      return Math.round(this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07)
    }
    if (this.hdr.datatypeCode === this.DT_RGB) {
      vx *= 3
      // convert rgb to luminance
      return Math.round(this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07)
    }
    const vol = frame4D * nx * ny * nz
    let i = this.img[vx + vol]
    if (isReadImaginary) {
      i = this.imaginary[vx + vol]
    }

    return this.hdr.scl_slope * i + this.hdr.scl_inter
  }

  /**
   * @param {number} id - id of 3D Object (is this the base volume or an overlay?)
   * @param {WebGLRenderingContext} gl - WebGL rendering context
   * @returns {NiivueObject3D} returns a new 3D object in model space
   */
  toNiivueObject3D = function (id, gl) {
    // cube has 8 vertices: left/right, posterior/anterior, inferior/superior
    // n.b. voxel coordinates are from VOXEL centers
    // add/subtract 0.5 to get full image field of view
    const L = -0.5
    const P = -0.5
    const I = -0.5
    const R = this.dimsRAS[1] - 1 + 0.5
    const A = this.dimsRAS[2] - 1 + 0.5
    const S = this.dimsRAS[3] - 1 + 0.5

    const LPI = this.vox2mm([L, P, I], this.matRAS)
    const LAI = this.vox2mm([L, A, I], this.matRAS)
    const LPS = this.vox2mm([L, P, S], this.matRAS)
    const LAS = this.vox2mm([L, A, S], this.matRAS)
    const RPI = this.vox2mm([R, P, I], this.matRAS)
    const RAI = this.vox2mm([R, A, I], this.matRAS)
    const RPS = this.vox2mm([R, P, S], this.matRAS)
    const RAS = this.vox2mm([R, A, S], this.matRAS)
    const posTex = [
      // spatial position (XYZ), texture coordinates UVW
      // Superior face
      ...LPS,
      ...[0.0, 0.0, 1.0],
      ...RPS,
      ...[1.0, 0.0, 1.0],
      ...RAS,
      ...[1.0, 1.0, 1.0],
      ...LAS,
      ...[0.0, 1.0, 1.0],

      // Inferior face
      ...LPI,
      ...[0.0, 0.0, 0.0],
      ...LAI,
      ...[0.0, 1.0, 0.0],
      ...RAI,
      ...[1.0, 1.0, 0.0],
      ...RPI,
      ...[1.0, 0.0, 0.0]
    ]

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const indices = [
      // six faces of cube: each has 2 triangles (6 indices)
      0,
      3,
      2,
      2,
      1,
      0, // Top
      4,
      7,
      6,
      6,
      5,
      4, // Bottom
      5,
      6,
      2,
      2,
      3,
      5, // Front
      4,
      0,
      1,
      1,
      7,
      4, // Back
      7,
      1,
      2,
      2,
      6,
      7, // Right
      4,
      5,
      3,
      3,
      0,
      4 // Left
    ]
    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

    const posTexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posTex), gl.STATIC_DRAW)

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer)
    // vertex spatial position: 3 floats X,Y,Z
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
    // UVW texCoord: (also three floats)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
    gl.bindVertexArray(null)

    const obj3D = new NiivueObject3D(id, posTexBuffer, gl.TRIANGLES, indices.length, indexBuffer, vao)
    const extents = getExtents([...LPS, ...RPS, ...RAS, ...LAS, ...LPI, ...LAI, ...RAI, ...RPI])
    obj3D.extentsMin = extents.min.slice()
    obj3D.extentsMax = extents.max.slice()
    obj3D.furthestVertexFromOrigin = extents.furthestVertexFromOrigin
    obj3D.originNegate = vec3.clone(extents.origin)
    vec3.negate(obj3D.originNegate, obj3D.originNegate)
    obj3D.fieldOfViewDeObliqueMM = [
      this.dimsRAS[1] * this.pixDimsRAS[1],
      this.dimsRAS[2] * this.pixDimsRAS[2],
      this.dimsRAS[3] * this.pixDimsRAS[3]
    ]
    return obj3D
  }

  /**
   * Update options for image
   * @param {NVImageFromUrlOptions} options
   */
  applyOptionsUpdate = function (options) {
    this.hdr.cal_min = options.cal_min
    this.hdr.cal_max = options.cal_max
    delete options.url
    delete options.urlImageData
    delete options.cal_min
    delete options.cal_max
    Object.assign(this, options)
  }

  getImageOptions = function () {
    let options = null
    try {
      options = NVImageFromUrlOptions(
        '', // url,
        '', // urlImageData
        this.name, // name
        this._colormap, // colormap
        this.opacity, // opacity
        this.hdr.cal_min, // cal_min
        this.hdr.cal_max, // cal_max
        this.trustCalMinMax, // trustCalMinMax,
        this.percentileFrac, // percentileFrac
        this.ignoreZeroVoxels, // ignoreZeroVoxels
        this.visible, // visible
        this.useQFormNotSForm, // useQFormNotSForm
        this.colormapNegative, // colormapNegative
        this.frame4D,
        this.imageType // imageType
      )
    } catch (e) {
      console.log(e)
    }
    return options
  }

  /**
   * Converts NVImage to NIfTI compliant byte array
   * @param {Uint8Array} drawingBytes
   */
  toUint8Array = function (drawingBytes = null) {
    const isDrawing = drawingBytes
    const hdrBytes = hdrToArrayBuffer(this.hdr, isDrawing)

    let drawingBytesToBeConverted = drawingBytes
    if (isDrawing) {
      const perm = this.permRAS
      if (perm[0] !== 1 || perm[1] !== 2 || perm[2] !== 3) {
        const dims = this.hdr.dims // reverse to original
        // reverse RAS to native space, layout is mrtrix MIF format
        // for details see NVImage.readMIF()
        const layout = [0, 0, 0]
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (Math.abs(perm[i]) - 1 !== j) {
              continue
            }
            layout[j] = i * Math.sign(perm[i])
          }
        }
        let stride = 1
        const instride = [1, 1, 1]
        const inflip = [false, false, false]
        for (let i = 0; i < layout.length; i++) {
          for (let j = 0; j < layout.length; j++) {
            const a = Math.abs(layout[j])
            if (a !== i) {
              continue
            }
            instride[j] = stride
            // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
            if (layout[j] < 0 || Object.is(layout[j], -0)) {
              inflip[j] = true
            }
            stride *= dims[j + 1]
          }
        }
        // lookup table for flips and stride offsets:
        const range = (start, stop, step) =>
          Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
        let xlut = range(0, dims[1] - 1, 1)
        if (inflip[0]) {
          xlut = range(dims[1] - 1, 0, -1)
        }
        for (let i = 0; i < dims[1]; i++) {
          xlut[i] *= instride[0]
        }
        let ylut = range(0, dims[2] - 1, 1)
        if (inflip[1]) {
          ylut = range(dims[2] - 1, 0, -1)
        }
        for (let i = 0; i < dims[2]; i++) {
          ylut[i] *= instride[1]
        }
        let zlut = range(0, dims[3] - 1, 1)
        if (inflip[2]) {
          zlut = range(dims[3] - 1, 0, -1)
        }
        for (let i = 0; i < dims[3]; i++) {
          zlut[i] *= instride[2]
        }
        // convert data

        const inVs = new Uint8Array(drawingBytes)
        const outVs = new Uint8Array(dims[1] * dims[2] * dims[3])
        let j = 0
        for (let z = 0; z < dims[3]; z++) {
          for (let y = 0; y < dims[2]; y++) {
            for (let x = 0; x < dims[1]; x++) {
              outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z]]
              j++
            } // for x
          } // for y
        } // for z
        drawingBytesToBeConverted = outVs
        console.log('drawing bytes')
        console.log(drawingBytesToBeConverted)
      }
    }
    const img8 = isDrawing ? drawingBytesToBeConverted : new Uint8Array(this.img.buffer)
    const opad = new Uint8Array(4)
    const odata = new Uint8Array(hdrBytes.length + opad.length + img8.length)
    odata.set(hdrBytes)
    odata.set(opad, hdrBytes.length)
    odata.set(img8, hdrBytes.length + opad.length)
    return odata
  }
}
