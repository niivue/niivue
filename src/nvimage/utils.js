import { vec3 } from 'gl-matrix'
import { Log } from '../logger'

const log = new Log()

export const isPlatformLittleEndian = () => {
  // inspired by https://github.com/rii-mango/Papaya
  const buffer = new ArrayBuffer(2)
  new DataView(buffer).setInt16(0, 256, true)
  return new Int16Array(buffer)[0] === 256
}

/**
 * Enum for supported image types (e.g. NII, NRRD, DICOM)
 * @readonly
 * @enum {number}
 */
export const NVIMAGE_TYPE = Object.freeze({
  UNKNOWN: 0,
  NII: 1,
  DCM: 2,
  DCM_MANIFEST: 3,
  MIH: 4,
  MIF: 5,
  NHDR: 6,
  NRRD: 7,
  MHD: 8,
  MHA: 9,
  MGH: 10,
  MGZ: 11,
  V: 12,
  V16: 13,
  VMR: 14,
  HEAD: 15,
  DCM_FOLDER: 16,
  parse: (ext) => {
    let imageType = NVIMAGE_TYPE.UNKNOWN
    switch (ext.toUpperCase()) {
      case '':
      case 'DCM':
        imageType = NVIMAGE_TYPE.DCM
        break
      case 'TXT':
        imageType = NVIMAGE_TYPE.DCM_MANIFEST
        break
      case 'NII':
        imageType = NVIMAGE_TYPE.NII
        break
      case 'MIH':
        imageType = NVIMAGE_TYPE.MIH
        break
      case 'MIF':
        imageType = NVIMAGE_TYPE.MIF
        break
      case 'NHDR':
        imageType = NVIMAGE_TYPE.NHDR
        break
      case 'NRRD':
        imageType = NVIMAGE_TYPE.NRRD
        break
      case 'MHD':
        imageType = NVIMAGE_TYPE.MHD
        break
      case 'MHA':
        imageType = NVIMAGE_TYPE.MHA
        break
      case 'MGH':
        imageType = NVIMAGE_TYPE.MGH
        break
      case 'MGZ':
        imageType = NVIMAGE_TYPE.MGZ
        break
      case 'V':
        imageType = NVIMAGE_TYPE.V
        break
      case 'V16':
        imageType = NVIMAGE_TYPE.V16
        break
      case 'VMR':
        imageType = NVIMAGE_TYPE.VMR
        break
      case 'HEAD':
        imageType = NVIMAGE_TYPE.HEAD
        break
    }
    return imageType
  }
})

/**
 * NVImageFromUrlOptions
 * @typedef  NVImageFromUrlOptions
 * @type {object}
 * @property {string} url - the resolvable URL pointing to a nifti image to load
 * @property {string} [urlImgData=""] Allows loading formats where header and image are separate files (e.g. nifti.hdr, nifti.img)
 * @property {string} [name=""] a name for this image. Default is an empty string
 * @property {string} [colormap="gray"] a color map to use. default is gray
 * @property {number} [opacity=1.0] the opacity for this image. default is 1
 * @property {number} [cal_min=NaN] minimum intensity for color brightness/contrast
 * @property {number} [cal_max=NaN] maximum intensity for color brightness/contrast
 * @property {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @property {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @property {boolean} [visible=true] whether or not this image is to be visible
 * @property {boolean} [useQFormNotSForm=false] whether or not to use QForm over SForm constructing the NVImage instance
 * @property {boolean} [alphaThreshold=false] if true, values below cal_min are shown as translucent, not transparent
 * @property {string} [colormapNegative=""] a color map to use for negative intensities
 * @property {number} [cal_minNeg=NaN] minimum intensity for colormapNegative brightness/contrast (NaN for symmetrical cal_min)
 * @property {number} [cal_maxNeg=NaN] maximum intensity for colormapNegative brightness/contrast (NaN for symmetrical cal_max)
 * @property {boolean} [colorbarVisible=true] hide colormaps 


 * @property {NVIMAGE_TYPE} [imageType=NVIMAGE_TYPE.UNKNOWN] image type being loaded
 */

/**
 *
 * @constructor
 * @returns {NVImageFromUrlOptions}
 */
export function NVImageFromUrlOptions(
  url,
  urlImageData = '',
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
  imageType = NVIMAGE_TYPE.UNKNOWN,
  cal_minNeg = NaN,
  cal_maxNeg = NaN,
  colorbarVisible = true,
  alphaThreshold = false,
  colormapLabel = []
) {
  return {
    url,
    urlImageData,
    name,
    colormap,
    opacity,
    cal_min,
    cal_max,
    trustCalMinMax,
    percentileFrac,
    ignoreZeroVoxels,
    visible,
    useQFormNotSForm,
    colormapNegative,
    imageType,
    cal_minNeg,
    cal_maxNeg,
    colorbarVisible,
    frame4D,
    alphaThreshold,
    colormapLabel
  }
}

// not included in public docs
// create NIfTI format SForm from DICOM frame of reference
export function getBestTransform(imageDirections, voxelDimensions, imagePosition) {
  // https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/volume/dicom/header-dicom.js#L605
  /* Copyright (c) 2012-2015, RII-UTHSCSA
All rights reserved.

THIS PRODUCT IS NOT FOR CLINICAL USE.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
following conditions are met:

 - Redistributions of source code must retain the above copyright notice, this list of conditions and the following
   disclaimer.

 - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided with the distribution.

 - Neither the name of the RII-UTHSCSA nor the names of its contributors may be used to endorse or promote products
   derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
  const cosines = imageDirections
  let m = null
  if (cosines) {
    const vs = {
      colSize: voxelDimensions[0],
      rowSize: voxelDimensions[1],
      sliceSize: voxelDimensions[2]
    }
    const coord = imagePosition
    const cosx = [cosines[0], cosines[1], cosines[2]]
    const cosy = [cosines[3], cosines[4], cosines[5]]
    const cosz = [
      cosx[1] * cosy[2] - cosx[2] * cosy[1],
      cosx[2] * cosy[0] - cosx[0] * cosy[2],
      cosx[0] * cosy[1] - cosx[1] * cosy[0]
    ]
    m = [
      [cosx[0] * vs.colSize * -1, cosy[0] * vs.rowSize * -1, cosz[0] * vs.sliceSize * -1, -1 * coord[0]],
      [cosx[1] * vs.colSize * -1, cosy[1] * vs.rowSize * -1, cosz[1] * vs.sliceSize * -1, -1 * coord[1]],
      [cosx[2] * vs.colSize, cosy[2] * vs.rowSize, cosz[2] * vs.sliceSize, coord[2]],
      [0, 0, 0, 1]
    ]
  }
  return m
}

function str2Buffer(str) {
  // emulate node.js Buffer.from
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    bytes.push(char & 0xff)
  }
  return bytes
}

// save NIfTI header into UINT8 array for saving to disk
export function hdrToArrayBuffer(hdr, isDrawing8 = false) {
  const SHORT_SIZE = 2
  const FLOAT32_SIZE = 4

  const byteArray = new Uint8Array(348)
  const view = new DataView(byteArray.buffer)
  // sizeof_hdr
  view.setInt32(0, 348, hdr.littleEndian)

  // data_type, db_name, extents, session_error, regular are not used

  // dim_info
  view.setUint8(39, hdr.dim_info)

  // dims
  for (let i = 0; i < 8; i++) {
    view.setUint16(40 + SHORT_SIZE * i, hdr.dims[i], hdr.littleEndian)
  }

  // intent_p1, intent_p2, intent_p3
  view.setFloat32(56, hdr.intent_p1, hdr.littleEndian)
  view.setFloat32(60, hdr.intent_p2, hdr.littleEndian)
  view.setFloat32(64, hdr.intent_p3, hdr.littleEndian)
  // intent_code, datatype, bitpix, slice_start
  view.setInt16(68, hdr.intent_code, hdr.littleEndian)
  if (isDrawing8) {
    view.setInt16(70, 2, hdr.littleEndian) // 2 = DT_UNSIGNED_CHAR
    view.setInt16(72, 8, hdr.littleEndian)
  } else {
    view.setInt16(70, hdr.datatypeCode, hdr.littleEndian)
    view.setInt16(72, hdr.numBitsPerVoxel, hdr.littleEndian)
  }
  view.setInt16(74, hdr.slice_start, hdr.littleEndian)

  // pixdim[8], vox_offset, scl_slope, scl_inter
  for (let i = 0; i < 8; i++) {
    view.setFloat32(76 + FLOAT32_SIZE * i, hdr.pixDims[i], hdr.littleEndian)
  }
  if (isDrawing8) {
    view.setFloat32(108, 352, hdr.littleEndian)
    view.setFloat32(112, 1.0, hdr.littleEndian)
    view.setFloat32(116, 0.0, hdr.littleEndian)
  } else {
    view.setFloat32(108, hdr.vox_offset, hdr.littleEndian)
    view.setFloat32(112, hdr.scl_slope, hdr.littleEndian)
    view.setFloat32(116, hdr.scl_inter, hdr.littleEndian)
  }
  // slice_end
  view.setInt16(120, hdr.slice_end, hdr.littleEndian)

  // slice_code, xyzt_units
  view.setUint8(122, hdr.slice_code)
  view.setUint8(123, hdr.xyzt_units)

  // cal_max, cal_min, slice_duration, toffset
  if (isDrawing8) {
    view.setFloat32(124, 0, hdr.littleEndian)
    view.setFloat32(128, 0, hdr.littleEndian)
  } else {
    view.setFloat32(124, hdr.cal_max, hdr.littleEndian)
    view.setFloat32(128, hdr.cal_min, hdr.littleEndian)
  }
  view.setFloat32(132, hdr.slice_duration, hdr.littleEndian)
  view.setFloat32(136, hdr.toffset, hdr.littleEndian)

  // glmax, glmin are unused

  // descrip and aux_file
  // node.js byteArray.set(Buffer.from(hdr.description), 148);
  byteArray.set(str2Buffer(hdr.description), 148)
  // node.js: byteArray.set(Buffer.from(hdr.aux_file), 228);
  byteArray.set(str2Buffer(hdr.aux_file), 228)
  // qform_code, sform_code
  view.setInt16(252, hdr.qform_code, hdr.littleEndian)
  view.setInt16(254, hdr.sform_code, hdr.littleEndian)

  // quatern_b, quatern_c, quatern_d, qoffset_x, qoffset_y, qoffset_z, srow_x[4], srow_y[4], and srow_z[4]
  view.setFloat32(256, hdr.quatern_b, hdr.littleEndian)
  view.setFloat32(260, hdr.quatern_c, hdr.littleEndian)
  view.setFloat32(264, hdr.quatern_d, hdr.littleEndian)
  view.setFloat32(268, hdr.qoffset_x, hdr.littleEndian)
  view.setFloat32(272, hdr.qoffset_y, hdr.littleEndian)
  view.setFloat32(276, hdr.qoffset_z, hdr.littleEndian)
  const flattened = hdr.affine.flat()
  // we only want the first three rows
  for (let i = 0; i < 12; i++) {
    view.setFloat32(280 + FLOAT32_SIZE * i, flattened[i], hdr.littleEndian)
  }
  // node.js https://www.w3schools.com/nodejs/met_buffer_from.asp
  // intent_name and magic
  // node.js byteArray.set(Buffer.from(hdr.intent_name), 328);
  byteArray.set(str2Buffer(hdr.intent_name), 328)
  // node.js byteArray.set(Buffer.from(hdr.magic), 344);
  byteArray.set(str2Buffer(hdr.magic), 344)
  return byteArray
  // return byteArray.buffer;
}

/**
 * @typedef {Object} NVImage~Extents
 * @property {number[]} min - min bounding point
 * @property {number[]} max - max bounding point
 * @property {number} furthestVertexFromOrigin - point furthest from origin
 */

// returns the left, right, up, down, front and back via pixdims, qform or sform
// +x = Right  +y = Anterior  +z = Superior.
// https://nifti.nimh.nih.gov/nifti-1/documentation/nifti1fields/nifti1fields_pages/qsform.html

/**
 * calculate cuboid extents via pixdims * dims
 * @returns {number[]}
 */

/**
 *
 * @param {number[]} positions
 * @returns {NVImage~Extents}
 */
export function getExtents(positions, forceOriginInVolume = true) {
  const nV = (positions.length / 3).toFixed() // each vertex has 3 components: XYZ
  const origin = vec3.fromValues(0, 0, 0) // default center of rotation
  const mn = vec3.create()
  const mx = vec3.create()
  let mxDx = 0.0
  let nLoops = 1
  if (forceOriginInVolume) {
    nLoops = 2
  } // second pass to reposition origin
  for (let loop = 0; loop < nLoops; loop++) {
    mxDx = 0.0
    for (let i = 0; i < nV; i++) {
      const v = vec3.fromValues(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      if (i === 0) {
        vec3.copy(mn, v)
        vec3.copy(mx, v)
      }
      vec3.min(mn, mn, v)
      vec3.max(mx, mx, v)
      vec3.subtract(v, v, origin)
      const dx = vec3.len(v)
      mxDx = Math.max(mxDx, dx)
    }
    if (loop + 1 >= nLoops) {
      break
    }
    let ok = true
    for (let j = 0; j < 3; ++j) {
      if (mn[j] > origin[j]) {
        ok = false
      }
      if (mx[j] < origin[j]) {
        ok = false
      }
    }
    if (ok) {
      break
    }
    vec3.lerp(origin, mn, mx, 0.5)
    log.debug('origin moved inside volume: ', origin)
  }
  const min = [mn[0], mn[1], mn[2]]
  const max = [mx[0], mx[1], mx[2]]
  const furthestVertexFromOrigin = mxDx
  return { min, max, furthestVertexFromOrigin, origin }
}
