import { NIFTI1, NIFTIEXTENSION } from 'nifti-reader-js'
import { mat4, vec3, vec4 } from 'gl-matrix'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'
import { NVUtilities } from '@/nvutilities'

/**
 * Helper function to convert voxel location (row, column slice, indexed from 0) to world space.
 * @param XYZ - Voxel coordinates [x, y, z]
 * @param mtx - 4x4 transformation matrix
 * @returns World space coordinates as vec3
 */
function vox2mm(XYZ: number[], mtx: mat4): vec3 {
  const sform = mat4.clone(mtx)
  mat4.transpose(sform, sform)
  const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
  vec4.transformMat4(pos, pos, sform)
  const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
  return pos3
}

/**
 * Helper function to determine spacing voxel centers (rows, columns, slices).
 * @param nvImage - The NVImage instance whose header will be modified
 */
function setPixDimFromSForm(nvImage: NVImage): void {
  if (!nvImage.hdr) {
    throw new Error('hdr not defined')
  }
  const m = nvImage.hdr.affine
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
  const mm000 = vox2mm([0, 0, 0], mat)
  const mm100 = vox2mm([1, 0, 0], mat)
  vec3.subtract(mm100, mm100, mm000)
  const mm010 = vox2mm([0, 1, 0], mat)
  vec3.subtract(mm010, mm010, mm000)
  const mm001 = vox2mm([0, 0, 1], mat)
  vec3.subtract(mm001, mm001, mm000)
  nvImage.hdr.pixDims[1] = vec3.length(mm100)
  nvImage.hdr.pixDims[2] = vec3.length(mm010)
  nvImage.hdr.pixDims[3] = vec3.length(mm001)
}

/**
 * Helper function to convert AFNI head/brik space to NIfTI format.
 *
 * Based on AFNI source code:
 * https://github.com/afni/afni/blob/d6997e71f2b625ac1199460576d48f3136dac62c/src/thd_niftiwrite.c#L315
 *
 * @param nvImage - The NVImage instance whose header will be modified
 * @param xyzDelta - Voxel spacing in each dimension
 * @param xyzOrigin - Origin coordinates
 * @param orientSpecific - Orientation codes for each axis
 */
function THD_daxes_to_NIFTI(nvImage: NVImage, xyzDelta: number[], xyzOrigin: number[], orientSpecific: number[]): void {
  const hdr = nvImage.hdr

  if (hdr === null) {
    throw new Error('HDR is not set')
  }

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

/**
 * Reads AFNI HEAD/BRIK format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 *
 * HEAD files contain the header information as text attributes.
 * BRIK files contain the binary image data.
 *
 * Format specification: https://afni.nimh.nih.gov/pub/dist/doc/program_help/README.attributes.html
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param dataBuffer - ArrayBuffer containing the HEAD file data.
 * @param pairedImgData - ArrayBuffer containing the BRIK file data (required).
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if pairedImgData is not provided.
 */
export async function readHEAD(
  nvImage: NVImage,
  dataBuffer: ArrayBuffer,
  pairedImgData: ArrayBuffer | null
): Promise<ArrayBuffer> {
  nvImage.hdr = new NIFTI1()
  const hdr = nvImage.hdr
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
  log.debug(dataBuffer.byteLength, 'len', len)
  const extBuffer = new ArrayBuffer(len)
  new Uint8Array(extBuffer).set(new Uint8Array(dataBuffer))
  const newExtension = new NIFTIEXTENSION(len + 8, 42, extBuffer, true)
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
    let items: Array<string | number> = line.split('= ')
    const key = items[1] // e.g. 'IDCODE_DATE'
    line = lines[i] // e.g. 'count = 5'
    i++
    items = line.split('= ')
    let count = parseInt(items[1] as string) // e.g. '5'
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
        items[j] = parseFloat(items[j] as string)
      }
    }
    switch (key) {
      case 'BYTEORDER_STRING':
        if ((items[0] as string).includes('LSB_FIRST')) {
          hdr.littleEndian = true
        } else if ((items[0] as string).includes('MSB_FIRST')) {
          hdr.littleEndian = false
        }
        break
      case 'BRICK_TYPES':
        {
          hdr.dims[4] = count
          const datatype = parseInt(items[0] as string)
          if (datatype === 0) {
            hdr.numBitsPerVoxel = 8
            hdr.datatypeCode = NiiDataType.DT_UINT8
          } else if (datatype === 1) {
            hdr.numBitsPerVoxel = 16
            hdr.datatypeCode = NiiDataType.DT_INT16
          } else if (datatype === 3) {
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = NiiDataType.DT_FLOAT32
          } else {
            log.warn('Unknown BRICK_TYPES ', datatype)
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
          // TODO don't reuse items for numeric values
          [items[8] as number, items[9] as number, items[10] as number, items[11] as number],
          [0, 0, 0, 1]
        ]
        break
      case 'DATASET_DIMENSIONS':
        count = Math.max(count, 3)
        for (let j = 0; j < count; j++) {
          hdr.dims[j + 1] = items[j] as number
        }
        break
      case 'ORIENT_SPECIFIC':
        orientSpecific = items as number[]
        break
      case 'ORIGIN':
        xyzOrigin = items as number[]
        break
      case 'DELTA':
        xyzDelta = items as number[]
        break
      case 'TAXIS_FLOATS':
        hdr.pixDims[4] = items[0] as number
        break
      default:
        log.warn('Unknown:', key)
    } // read item
  } // read all lines
  if (!hasIJK_TO_DICOM_REAL) {
    THD_daxes_to_NIFTI(nvImage, xyzDelta, xyzOrigin, orientSpecific)
  } else {
    setPixDimFromSForm(nvImage)
  }
  const nBytes = (hdr.numBitsPerVoxel / 8) * hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4]
  if (!pairedImgData) {
    throw new Error('pairedImgData not set')
  }
  if (pairedImgData.byteLength < nBytes) {
    // n.b. npm run dev implicitly extracts gz, npm run demo does not!
    return await NVUtilities.decompressToBuffer(new Uint8Array(pairedImgData))
  }
  return pairedImgData.slice(0)
}
