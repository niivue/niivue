import { NIFTI1 } from 'nifti-reader-js'
import { mat3, mat4, vec3 } from 'gl-matrix'
import { log } from '@/logger'
import { NVUtilities } from '@/nvutilities'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Reads NRRD/NHDR format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param dataBuffer - ArrayBuffer containing the NRRD header or full file.
 * @param pairedImgData - Optional ArrayBuffer for detached data file (used by NHDR).
 * @returns Promise resolving to the imgRaw ArrayBuffer or null on critical error.
 */
export async function readNrrd(
  nvImage: NVImage,
  dataBuffer: ArrayBuffer,
  pairedImgData: ArrayBuffer | null = null
): Promise<ArrayBuffer | null> {
  if (!nvImage.hdr) {
    log.warn('readNrrd called before nvImage.hdr was initialized. Creating default.')
    nvImage.hdr = new NIFTI1()
  }
  const hdr = nvImage.hdr // Use nvImage.hdr directly
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]

  const len = dataBuffer.byteLength
  let txt: string | null = null
  const bytes = new Uint8Array(dataBuffer)

  for (let i = 1; i < len; i++) {
    if (bytes[i - 1] === 10 && bytes[i] === 10) {
      const v = dataBuffer.slice(0, i - 1)
      txt = new TextDecoder().decode(v)
      hdr.vox_offset = i + 1 // Set based on header end position
      break
    }
  }

  if (txt === null) {
    log.error('readNrrd: could not extract txt')
    return null
  }

  const lines = txt.split('\n')
  if (!lines[0].startsWith('NRRD')) {
    log.error('Invalid NRRD image (magic signature missing)')
    return null
  }

  const n = lines.length
  let isGz = false
  let isMicron = false
  let isDetached = false
  const mat33 = mat3.fromValues(NaN, 0, 0, 0, 1, 0, 0, 0, 1)
  const offset = vec3.fromValues(0, 0, 0)
  let rot33 = mat3.create() // Initialize space correction matrix

  for (let i = 1; i < n; i++) {
    let str = lines[i]
    if (str.length === 0 || str[0] === '#') {
      if (str.startsWith('#')) {
        continue
      }
      if (str.trim().length === 0) {
        continue
      }
    }
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
          log.error('Unsupported NRRD encoding')
          return null
        }
        break
      case 'type':
        switch (value) {
          case 'uchar':
          case 'unsigned char':
          case 'uint8':
          case 'uint8_t':
            hdr.numBitsPerVoxel = 8
            hdr.datatypeCode = NiiDataType.DT_UINT8
            break
          case 'signed char':
          case 'int8':
          case 'int8_t':
            hdr.numBitsPerVoxel = 8
            hdr.datatypeCode = NiiDataType.DT_INT8
            break
          case 'short':
          case 'short int':
          case 'signed short':
          case 'signed short int':
          case 'int16':
          case 'int16_t':
            hdr.numBitsPerVoxel = 16
            hdr.datatypeCode = NiiDataType.DT_INT16
            break
          case 'ushort':
          case 'unsigned short':
          case 'unsigned short int':
          case 'uint16':
          case 'uint16_t':
            hdr.numBitsPerVoxel = 16
            hdr.datatypeCode = NiiDataType.DT_UINT16
            break
          case 'int':
          case 'signed int':
          case 'int32':
          case 'int32_t':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = NiiDataType.DT_INT32
            break
          case 'uint':
          case 'unsigned int':
          case 'uint32':
          case 'uint32_t':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = NiiDataType.DT_UINT32
            break
          case 'float':
            hdr.numBitsPerVoxel = 32
            hdr.datatypeCode = NiiDataType.DT_FLOAT32
            break
          case 'double':
            hdr.numBitsPerVoxel = 64
            hdr.datatypeCode = NiiDataType.DT_FLOAT64
            break
          default:
            log.error('Unsupported NRRD data type: ' + value)
            return null
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
          if (vs.length === 9) {
            for (let d = 0; d < 9; d++) {
              mat33[d] = parseFloat(vs[d])
            }
          }
        }
        break
      case 'space origin':
        {
          const ts = value.split(/[ ,]+/)
          if (ts.length === 3) {
            offset[0] = parseFloat(ts[0])
            offset[1] = parseFloat(ts[1])
            offset[2] = parseFloat(ts[2])
          }
        }
        break
      case 'space units':
        if (value.includes('microns')) {
          isMicron = true
        }
        break
      case 'space':
        if (value.includes('right-anterior-superior') || value.includes('ras')) {
          rot33 = mat3.fromValues(1, 0, 0, 0, 1, 0, 0, 0, 1)
        } else if (value.includes('left-anterior-superior') || value.includes('las')) {
          rot33 = mat3.fromValues(-1, 0, 0, 0, 1, 0, 0, 0, 1)
        } else if (value.includes('left-posterior-superior') || value.includes('lps')) {
          rot33 = mat3.fromValues(-1, 0, 0, 0, -1, 0, 0, 0, 1)
        } else {
          log.warn('Unsupported NRRD space value:', value)
        }
        break
      default:
        log.warn('Unknown:', key)
        break
    }
  }

  if (!isNaN(mat33[0])) {
    hdr.sform_code = 2
    if (isMicron) {
      // @ts-expect-error FIXME: converting mat3 to mat4
      mat4.multiplyScalar(mat33, mat33, 0.001)
      offset[0] *= 0.001
      offset[1] *= 0.001
      offset[2] *= 0.001
    }
    if (rot33[0] < 0) {
      offset[0] = -offset[0]
    }
    if (rot33[4] < 0) {
      offset[1] = -offset[1]
    }
    if (rot33[8] < 0) {
      offset[2] = -offset[2]
    }
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

    // Ensure vox2mm function is accessible via nvImage
    if (!nvImage.vox2mm) {
      return null
    }
    const mm000 = nvImage.vox2mm([0, 0, 0], mat)
    const mm100 = nvImage.vox2mm([1, 0, 0], mat)
    vec3.subtract(mm100, mm100, mm000)
    const mm010 = nvImage.vox2mm([0, 1, 0], mat)
    vec3.subtract(mm010, mm010, mm000)
    const mm001 = nvImage.vox2mm([0, 0, 1], mat)
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
  let imgRaw: ArrayBuffer | null = null // Use null for error case

  // Data source depends on whether header was detached
  const sourceBuffer = isDetached ? pairedImgData : dataBuffer
  // Offset where data starts within the sourceBuffer
  const sourceOffset = isDetached ? 0 : hdr.vox_offset // Use hdr.vox_offset set during header parsing

  if (isDetached && !sourceBuffer) {
    log.warn('Missing data: NRRD header describes detached data file but only one URL provided')
    return null
  }

  if (!sourceBuffer || sourceOffset >= sourceBuffer.byteLength) {
    log.error(`NRRD data offset (${sourceOffset}) invalid for buffer length (${sourceBuffer?.byteLength ?? 0})`)
    return null
  }

  // Slice the data section
  let dataSection = sourceBuffer.slice(sourceOffset)

  // Decompress if necessary
  if (isGz) {
    try {
      log.debug('Decompressing NRRD data...')
      dataSection = await NVUtilities.decompressToBuffer(new Uint8Array(dataSection))
      log.debug('Decompression complete.')
    } catch (err) {
      log.error('Failed to decompress NRRD data.', err)
      return null
    }
  }

  const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
  const nVoxels = hdr.dims.slice(1, hdr.dims[0] + 1).reduce((acc, dim) => acc * Math.max(1, dim), 1)
  const expectedBytes = nVoxels * nBytesPerVoxel
  if (dataSection.byteLength < expectedBytes) {
    log.error(`NRRD image data size mismatch: expected ${expectedBytes}, found ${dataSection.byteLength}`)
    return null
  } else if (dataSection.byteLength > expectedBytes) {
    log.warn(`NRRD has extra ${dataSection.byteLength - expectedBytes} bytes after expected image data. Truncating.`)
    dataSection = dataSection.slice(0, expectedBytes)
  }

  imgRaw = dataSection // Assign the final buffer

  // Ensure header has essential NIFTI fields if missing defaults
  if (!hdr.datatypeCode) {
    log.error('NRRD parsing failed to set datatypeCode.')
    return null
  }
  if (!hdr.numBitsPerVoxel) {
    log.error('NRRD parsing failed to set numBitsPerVoxel.')
    return null
  }

  return imgRaw // Return the image data buffer
}
