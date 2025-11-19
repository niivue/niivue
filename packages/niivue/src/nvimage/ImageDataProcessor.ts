/**
 * ImageDataProcessor module
 *
 * Handles low-level image data processing:
 * - Endian byte swapping for cross-platform compatibility
 * - Data type conversion from NIfTI format codes to TypeScript typed arrays
 *
 * This module contains pure functions for transforming raw image data
 * according to NIfTI header specifications.
 */

import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { NiiDataType, isPlatformLittleEndian } from '@/nvimage/utils'
import type { TypedVoxelArray } from './index'

/**
 * Result of data type conversion, containing the converted image data
 * and potentially updated header fields.
 */
export interface DataTypeConversionResult {
  img: TypedVoxelArray
  imaginary?: Float32Array
  updatedDatatypeCode?: number
  updatedNumBitsPerVoxel?: number
}

/**
 * Swap byte order of multi-byte data if foreign endian.
 * Modifies the ArrayBuffer in place.
 *
 * @param imgRaw - Raw image data buffer
 * @param hdr - NIfTI header containing datatype and endianness information
 */
export function swapBytesIfNeeded(imgRaw: ArrayBufferLike, hdr: NIFTI1 | NIFTI2): void {
  // No swapping needed for RGB formats or single-byte data
  if (
    hdr.datatypeCode === NiiDataType.DT_RGB24 ||
    hdr.datatypeCode === NiiDataType.DT_RGBA32 ||
    hdr.littleEndian === isPlatformLittleEndian() ||
    hdr.numBitsPerVoxel <= 8
  ) {
    return
  }

  if (hdr.numBitsPerVoxel === 16) {
    // inspired by https://github.com/rii-mango/Papaya
    const u16 = new Uint16Array(imgRaw)
    for (let i = 0; i < u16.length; i++) {
      const val = u16[i]
      u16[i] = ((((val & 0xff) << 8) | ((val >> 8) & 0xff)) << 16) >> 16 // since JS uses 32-bit when bit shifting
    }
  } else if (hdr.numBitsPerVoxel === 32) {
    // inspired by https://github.com/rii-mango/Papaya
    const u32 = new Uint32Array(imgRaw)
    for (let i = 0; i < u32.length; i++) {
      const val = u32[i]
      u32[i] = ((val & 0xff) << 24) | ((val & 0xff00) << 8) | ((val >> 8) & 0xff00) | ((val >> 24) & 0xff)
    }
  } else if (hdr.numBitsPerVoxel === 64) {
    // inspired by MIT licensed code: https://github.com/rochars/endianness
    const numBytesPerVoxel = hdr.numBitsPerVoxel / 8
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
  }
}

/**
 * Convert raw image data to the appropriate TypedArray based on NIfTI datatype code.
 * Some data types are converted to simpler representations (e.g., INT8 → INT16).
 *
 * @param imgRaw - Raw image data buffer (after endian swapping if needed)
 * @param hdr - NIfTI header containing datatype information
 * @returns Conversion result with typed array and any header updates
 * @throws Error if datatype is not supported
 */
export function convertDataType(imgRaw: ArrayBufferLike, hdr: NIFTI1 | NIFTI2): DataTypeConversionResult {
  switch (hdr.datatypeCode) {
    case NiiDataType.DT_UINT8:
      return { img: new Uint8Array(imgRaw) }

    case NiiDataType.DT_INT16:
      return { img: new Int16Array(imgRaw) }

    case NiiDataType.DT_FLOAT32:
      return { img: new Float32Array(imgRaw) }

    case NiiDataType.DT_FLOAT64:
      return { img: new Float64Array(imgRaw) }

    case NiiDataType.DT_RGB24:
      return { img: new Uint8Array(imgRaw) }

    case NiiDataType.DT_UINT16:
      return { img: new Uint16Array(imgRaw) }

    case NiiDataType.DT_RGBA32:
      return { img: new Uint8Array(imgRaw) }

    case NiiDataType.DT_INT8: {
      // Convert INT8 to INT16 for easier handling
      const i8 = new Int8Array(imgRaw)
      const vx8 = i8.length
      const img = new Int16Array(vx8)
      for (let i = 0; i < vx8; i++) {
        img[i] = i8[i]
      }
      return {
        img,
        updatedDatatypeCode: NiiDataType.DT_INT16,
        updatedNumBitsPerVoxel: 16
      }
    }

    case NiiDataType.DT_BINARY: {
      // Convert binary (bit-packed) to UINT8
      const nvox = hdr.dims[1] * hdr.dims[2] * Math.max(1, hdr.dims[3]) * Math.max(1, hdr.dims[4])
      const img1 = new Uint8Array(imgRaw)
      const img = new Uint8Array(nvox)
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
          img[i] = 1
        }
      }
      return {
        img,
        updatedDatatypeCode: NiiDataType.DT_UINT8,
        updatedNumBitsPerVoxel: 8
      }
    }

    case NiiDataType.DT_UINT32: {
      // Convert UINT32 to FLOAT64 (JavaScript number precision)
      const u32 = new Uint32Array(imgRaw)
      const vx32 = u32.length
      const img = new Float64Array(vx32)
      for (let i = 0; i < vx32 - 1; i++) {
        img[i] = u32[i]
      }
      return {
        img,
        updatedDatatypeCode: NiiDataType.DT_FLOAT64
      }
    }

    case NiiDataType.DT_INT32: {
      // Convert INT32 to FLOAT64 (JavaScript number precision)
      const i32 = new Int32Array(imgRaw)
      const vxi32 = i32.length
      const img = new Float64Array(vxi32)
      for (let i = 0; i < vxi32 - 1; i++) {
        img[i] = i32[i]
      }
      return {
        img,
        updatedDatatypeCode: NiiDataType.DT_FLOAT64
      }
    }

    case NiiDataType.DT_INT64: {
      // Convert INT64 to FLOAT64 (JavaScript number precision)
      const i64 = new BigInt64Array(imgRaw)
      const vx = i64.length
      const img = new Float64Array(vx)
      for (let i = 0; i < vx - 1; i++) {
        img[i] = Number(i64[i])
      }
      return {
        img,
        updatedDatatypeCode: NiiDataType.DT_FLOAT64
      }
    }

    case NiiDataType.DT_COMPLEX64: {
      // Saved as real/imaginary pairs: show real following fsleyes/MRIcroGL convention
      const f32 = new Float32Array(imgRaw)
      const nvx = Math.floor(f32.length / 2)
      const imaginary = new Float32Array(nvx)
      const img = new Float32Array(nvx)
      let r = 0
      for (let i = 0; i < nvx - 1; i++) {
        img[i] = f32[r]
        imaginary[i] = f32[r + 1]
        r += 2
      }
      return {
        img,
        imaginary,
        updatedDatatypeCode: NiiDataType.DT_FLOAT32
      }
    }

    default:
      throw new Error('datatype ' + hdr.datatypeCode + ' not supported')
  }
}
