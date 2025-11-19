import { NIFTI1 } from 'nifti-reader-js'
import { mat3, vec3 } from 'gl-matrix'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'
import { NVUtilities } from '@/nvutilities'

/**
 * Reads ITK MetaImage format (MHA/MHD), modifying the provided NVImage header
 * and returning the raw image data buffer.
 *
 * MHA files contain both header and image data in one file.
 * MHD files contain only the header, with image data in a separate file.
 *
 * Format specification: https://itk.org/Wiki/ITK/MetaIO/Documentation
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the MHA/MHD file data.
 * @param pairedImgData - Optional paired image data for detached MHD headers.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if the file is too small or has unsupported data types.
 */
export async function readMHA(
  nvImage: NVImage,
  buffer: ArrayBuffer,
  pairedImgData: ArrayBuffer | null
): Promise<ArrayBuffer> {
  const len = buffer.byteLength
  if (len < 20) {
    throw new Error('File too small to be VTK: bytes = ' + buffer.byteLength)
  }
  const bytes = new Uint8Array(buffer)
  let pos = 0
  function eol(c: number): boolean {
    return c === 10 || c === 13 // c is either a line feed character (10) or carriage return character (13)
  }
  function readStr(): string {
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
  nvImage.hdr = new NIFTI1()
  const hdr = nvImage.hdr
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
          hdr.datatypeCode = NiiDataType.DT_UINT8
          break
        case 'MET_CHAR':
          hdr.numBitsPerVoxel = 8
          hdr.datatypeCode = NiiDataType.DT_INT8
          break
        case 'MET_SHORT':
          hdr.numBitsPerVoxel = 16
          hdr.datatypeCode = NiiDataType.DT_INT16
          break
        case 'MET_USHORT':
          hdr.numBitsPerVoxel = 16
          hdr.datatypeCode = NiiDataType.DT_UINT16
          break
        case 'MET_INT':
          hdr.numBitsPerVoxel = 32
          hdr.datatypeCode = NiiDataType.DT_INT32
          break
        case 'MET_UINT':
          hdr.numBitsPerVoxel = 32
          hdr.datatypeCode = NiiDataType.DT_UINT32
          break
        case 'MET_FLOAT':
          hdr.numBitsPerVoxel = 32
          hdr.datatypeCode = NiiDataType.DT_FLOAT32
          break
        case 'MET_DOUBLE':
          hdr.numBitsPerVoxel = 64
          hdr.datatypeCode = NiiDataType.DT_FLOAT64
          break
        default:
          throw new Error('Unsupported MHA data type: ' + items[0])
      }
    }
    if (line.startsWith('ObjectType') && !items[0].includes('Image')) {
      log.warn('Only able to read ObjectType = Image, not ' + line)
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
  while (bytes[pos] === 10) {
    pos++
  }
  hdr.vox_offset = pos
  if (isDetached && pairedImgData) {
    if (isGz) {
      return await NVUtilities.decompressToBuffer(new Uint8Array(pairedImgData.slice(0)))
    }
    return pairedImgData.slice(0)
  }
  if (isGz) {
    return await NVUtilities.decompressToBuffer(new Uint8Array(buffer.slice(hdr.vox_offset)))
  }
  return buffer.slice(hdr.vox_offset)
}
