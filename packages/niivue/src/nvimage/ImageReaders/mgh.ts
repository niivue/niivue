import { NIFTI1 } from 'nifti-reader-js'
import { mat4, vec4, vec3 } from 'gl-matrix'
import { log } from '../../logger.js'
import { NVUtilities } from '../../nvutilities.js'
import type { NVImage } from '../index.js'
import { NiiDataType } from '../utils.js'

// not included in public docs
// MGH images can contain strings in the optional footer
function readFirstTag1String(view: DataView, offset: number, footerLength: number): string {
  const end = offset + footerLength
  let pos = offset

  while (pos + 12 <= end) {
    const tag = view.getInt32(pos, false) // tag (little-endian)
    // skip 4 bytes (padding), read 4-byte length
    const length = view.getInt32(pos + 8, false) // length of data
    pos += 12
    if (tag !== 1) {
      pos += length // skip non-tag-1 data
      continue
    }
    // Found tag 1, now decode the first length-prefixed string
    if (pos + 4 > end) {
      return ''
    }
    const strLen = view.getInt32(pos, false) // >>> 0 // big-endian
    pos += 4
    if (strLen <= 1 || pos + strLen > end) {
      return ''
    }
    const raw = new Uint8Array(view.buffer, pos, strLen)
    return new TextDecoder('utf-8').decode(raw.slice(0, -1)) // remove null terminator
  }
  return ''
}

/**
 * Reads FreeSurfer MGH/MGZ format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the MGH/MGZ file data.
 * @returns Promise resolving to the imgRaw ArrayBuffer or null on critical error.
 */
export async function readMgh(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBuffer | null> {
  if (!nvImage.hdr) {
    log.warn('readMgh called before nvImage.hdr was initialized. Creating default.')
    nvImage.hdr = new NIFTI1() // Ensure header object exists
  }
  const hdr = nvImage.hdr
  hdr.littleEndian = false

  let raw = buffer
  let reader = new DataView(raw)

  // Decompression logic
  if (raw.byteLength >= 2 && reader.getUint8(0) === 31 && reader.getUint8(1) === 139) {
    try {
      raw = await NVUtilities.decompressToBuffer(new Uint8Array(buffer))
      reader = new DataView(raw)
    } catch (err) {
      log.error('Failed to decompress MGZ file.', err)
      return null
    }
  }

  if (raw.byteLength < 284) {
    log.error('File too small to be a valid MGH/MGZ header.')
    return null
  }

  // --- Read MGH Header Fields ---
  const version = reader.getInt32(0, false)
  const width = reader.getInt32(4, false)
  const height = reader.getInt32(8, false)
  const depth = reader.getInt32(12, false)
  const nframes = reader.getInt32(16, false)
  const mtype = reader.getInt32(20, false)
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

  if (version !== 1) {
    log.warn(`Unexpected MGH version: ${version}.`)
  }
  if (width <= 0 || height <= 0 || depth <= 0) {
    log.error(`Invalid MGH dimensions: ${width}x${height}x${depth}`)
    return null
  }

  // Map MGH data type directly onto nvImage.hdr
  switch (mtype) {
    case 0:
      hdr.numBitsPerVoxel = 8
      hdr.datatypeCode = NiiDataType.DT_UINT8
      break
    case 4:
      hdr.numBitsPerVoxel = 16
      hdr.datatypeCode = NiiDataType.DT_INT16
      break
    case 1:
      hdr.numBitsPerVoxel = 32
      hdr.datatypeCode = NiiDataType.DT_INT32
      break
    case 3:
      hdr.numBitsPerVoxel = 32
      hdr.datatypeCode = NiiDataType.DT_FLOAT32
      break
    default:
      log.error(`Unsupported MGH data type: ${mtype}`)
      return null
  }

  // Set dimensions directly onto nvImage.hdr
  hdr.dims[1] = width
  hdr.dims[2] = height
  hdr.dims[3] = depth
  hdr.dims[4] = Math.max(1, nframes)
  hdr.dims[0] = hdr.dims[4] > 1 ? 4 : 3

  // Set pixel dimensions directly onto nvImage.hdr (using abs)
  hdr.pixDims[1] = Math.abs(spacingX)
  hdr.pixDims[2] = Math.abs(spacingY)
  hdr.pixDims[3] = Math.abs(spacingZ)
  hdr.pixDims[4] = 0

  hdr.sform_code = 1
  hdr.qform_code = 0
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

  const PcrsVec = vec4.fromValues(hdr.dims[1] / 2.0, hdr.dims[2] / 2.0, hdr.dims[3] / 2.0, 1)
  const PxyzOffsetVec = vec4.create()
  vec4.transformMat4(PxyzOffsetVec, PcrsVec, rot44)
  const translation = vec3.fromValues(cr - PxyzOffsetVec[0], ca - PxyzOffsetVec[1], cs - PxyzOffsetVec[2])

  hdr.affine = [
    [rot44[0], rot44[1], rot44[2], translation[0]],
    [rot44[4], rot44[5], rot44[6], translation[1]],
    [rot44[8], rot44[9], rot44[10], translation[2]],
    [0, 0, 0, 1]
  ]

  hdr.vox_offset = 284
  hdr.magic = 'n+1'

  // Check data size
  const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
  const nVoxels = width * height * depth * hdr.dims[4]
  const expectedBytes = nVoxels * nBytesPerVoxel
  const remainingBytes = raw.byteLength - hdr.vox_offset

  if (remainingBytes < expectedBytes) {
    log.error(`MGH image data size mismatch: expected ${expectedBytes}, found ${remainingBytes}`)
    return null
  } else if (remainingBytes > expectedBytes) {
    log.warn(`MGH file has extra ${remainingBytes - expectedBytes} bytes after image data. Truncating.`)
    // n.b. ignore first 20 bytes of footer (5 * float32)
    const footerStart = hdr.vox_offset + expectedBytes + 20
    const footerLength = raw.byteLength - footerStart
    if (footerLength > 12) {
      const firstTag1String = readFirstTag1String(reader, footerStart, footerLength)
      const isLUT = firstTag1String.toLowerCase().endsWith('lut.txt')
      if (isLUT) {
        // TODO: we assume labels are integers, not floats!
        // TODO: we could support specific FreeSurfer LUTs
        hdr.intent_code = 1002
      }
      log.debug(`First tag 1 string: ${firstTag1String} isLUT: ${isLUT}`)
    }
  }

  // Return only the raw image data buffer
  const imgRaw = raw.slice(hdr.vox_offset, hdr.vox_offset + expectedBytes)
  return imgRaw
}
