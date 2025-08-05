import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { mat4, vec4, vec3 } from 'gl-matrix'
import { log } from '@/logger'
import { NVUtilities } from '@/nvutilities'
import type { NVImage } from '@/nvimage'
import { isPlatformLittleEndian, NiiDataType } from '@/nvimage/utils'

/**
 * @internal
 * Read all occurrences of a metadata tag from the MGH image footer.
 *
 * MGH images can contain strings in an optional footer.
 * These items are discriminated by their "tag" number.
 * Tags can be used to detect indexed atlases.
 * Note: Some tags (like tag 1) include a combination of ASCII and binary data.
 *
 * @param view - DataView representing the footer bytes
 * @param offset - Byte offset to the start of the footer
 * @param footerLength - Length of the footer
 * @param tagToRead - Tag identifier to extract (default = 1)
 * @returns Concatenated string of all matched tag contents, separated by double newlines
 */
function readTag(view: DataView, offset: number, footerLength: number, tagToRead: number = 1): string {
  const end = offset + footerLength
  let pos = offset
  const results: string[] = []
  while (pos + 12 <= end) {
    const tag = view.getInt32(pos, false) // tag (little-endian)
    // skip 4 bytes (padding), read 4-byte length
    const length = view.getInt32(pos + 8, false) // length of data
    pos += 12
    if (length <= 0 || pos + length > end) {
      break // corrupt or truncated footer
    }
    if (tag !== tagToRead) {
      pos += length
      continue
    }
    let strLen = length
    let contentPos = pos
    if (tagToRead === 1) {
      if (pos + 4 > end) {
        break
      }
      strLen = view.getInt32(pos, false)
      contentPos += 4
    }
    if (strLen > 1 && contentPos + strLen <= end) {
      const raw = new Uint8Array(view.buffer, contentPos, strLen)
      const str = new TextDecoder('utf-8').decode(raw.slice(0, -1)) // remove null terminator
      results.push(str)
    }
    pos += length
  }
  return results.join('\n\n')
}

/**
 * @internal
 * Optimize FreeSurfer label image data by converting from float/int32 to the smallest suitable integer type.
 * Returns the raw image buffer if the input type is unsupported or values are not valid label indices.
 *
 * This function:
 * - Handles byte-swapping for little-endian systems.
 * - Ensures all values are finite integers within valid label ranges.
 * - Converts data to INT32, INT16, or UINT8 to reduce memory usage when possible.
 *
 * @param hdr - The NIfTI header object, which will be updated in-place.
 * @param imgRaw - The raw image data as an ArrayBuffer.
 * @returns A possibly transformed ArrayBuffer, or the original buffer if optimization is not possible.
 */
export function optimizeFreeSurferLabels(hdr: NIFTI1 | NIFTI2, imgRaw: ArrayBuffer): ArrayBuffer {
  hdr.intent_code = 1002
  if (hdr.datatypeCode !== NiiDataType.DT_FLOAT32 && hdr.datatypeCode !== NiiDataType.DT_INT32) {
    return imgRaw
  }
  // Parse input to float or int array
  let img: Float32Array | Int32Array = new Float32Array(imgRaw)
  if (hdr.datatypeCode === NiiDataType.DT_INT32) {
    img = new Int32Array(imgRaw)
  }
  // Byte-swap if needed
  if (isPlatformLittleEndian()) {
    const u32 = new Uint32Array(imgRaw)
    for (let i = 0; i < u32.length; i++) {
      const val = u32[i]
      u32[i] =
        ((val & 0x000000ff) << 24) |
        ((val & 0x0000ff00) << 8) |
        ((val & 0x00ff0000) >>> 8) |
        ((val & 0xff000000) >>> 24)
    }
  }
  hdr.littleEndian = isPlatformLittleEndian()
  // Validate values
  let isInteger = true
  let mn = Infinity
  let mx = -Infinity
  for (let i = 0; i < img.length; i++) {
    const v = img[i]
    if (!Number.isFinite(v)) {
      continue
    }
    if (!Number.isInteger(v)) {
      isInteger = false
    }
    if (v < mn) {
      mn = v
    }
    if (v > mx) {
      mx = v
    }
  }
  if (!isInteger || mn < 0 || mx > 2147483647) {
    log.warn(`FreeSurfer Labels must be integers in INT32 range. range ${mn}..${mx}`)
    return imgRaw
  }
  // Optimize datatype
  if (mx > 32767) {
    hdr.datatypeCode = NiiDataType.DT_INT32
    const out = new Int32Array(img.length)
    for (let i = 0; i < img.length; i++) {
      out[i] = Math.trunc(img[i])
    }
    return out.buffer
  } else if (mx > 255) {
    hdr.datatypeCode = NiiDataType.DT_INT16
    hdr.numBitsPerVoxel = 16
    const out = new Int16Array(img.length)
    for (let i = 0; i < img.length; i++) {
      out[i] = Math.trunc(img[i])
    }
    return out.buffer
  } else {
    hdr.datatypeCode = NiiDataType.DT_UINT8
    hdr.numBitsPerVoxel = 8
    const out = new Uint8Array(img.length)
    for (let i = 0; i < img.length; i++) {
      out[i] = Math.trunc(img[i])
    }
    return out.buffer
  }
}

/**
 * @internal
 * Determine if an MGH file is a FreeSurfer label image by inspecting the footer.
 * MGH label images often include additional metadata after the image data.
 * This function checks for specific patterns in the footer to infer if the image
 * represents labeled data (e.g., label2vol-generated volumes or files referencing LUTs).
 *
 * @param raw - The complete ArrayBuffer of the MGH file.
 * @param hdr - The parsed NIfTI header, including vox_offset and datatypeCode.
 * @param expectedBytes - The expected size of the image data in bytes.
 * @returns A boolean indicating whether the file is likely a labeled atlas.
 * @see https://niivue.com/demos/features/labels.html
 */
export function isFreeSurferLabelImage(raw: ArrayBuffer, hdr: NIFTI1 | NIFTI2, expectedBytes: number): boolean {
  const remainingBytes = raw.byteLength - hdr.vox_offset
  if (remainingBytes < expectedBytes) {
    log.error(`MGH image data size mismatch: expected ${expectedBytes}, found ${remainingBytes}`)
    return false
  }

  if (remainingBytes === expectedBytes) {
    return false
  }
  // Skip the first 20 bytes (5 * float32) of the MGH footer
  const footerStart = hdr.vox_offset + expectedBytes + 20
  const footerLength = raw.byteLength - footerStart
  if (footerLength <= 12) {
    return false
  }
  const tag1 = readTag(new DataView(raw), footerStart, footerLength)
  if (tag1.toLowerCase().endsWith('lut.txt')) {
    return true
  }
  const tag3 = readTag(new DataView(raw), footerStart, footerLength, 3)
  return tag3.includes('mri_label2vol')
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
    log.debug('readMgh called before nvImage.hdr was initialized. Creating default.')
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
  // Return only the raw image data buffer
  const imgRaw = raw.slice(hdr.vox_offset, hdr.vox_offset + expectedBytes)
  if (isFreeSurferLabelImage(raw, hdr, expectedBytes)) {
    return optimizeFreeSurferLabels(hdr, imgRaw)
  }
  return imgRaw
}
