import { NIFTI1 } from 'nifti-reader-js'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Helper function to convert ZXY RGB data to XYZ format for Zarr arrays.
 * @param data - Input data in ZXY order
 * @param X - Width dimension
 * @param Y - Height dimension
 * @param Z - Depth dimension
 * @returns Uint8Array in XYZ order
 */
function zxy2xyz(data: any, X: number, Y: number, Z: number): Uint8Array {
  const voxelCount = X * Y
  const rgb = new Uint8Array(voxelCount * Z * 3)
  const offsets = new Array(Z)
  for (let s = 0; s < Z; s++) {
    offsets[s] = voxelCount * 3 * s
  }
  let srcIndex = 0
  let dstIndex = 0
  for (let v = 0; v < voxelCount; v++) {
    for (let s = 0; s < Z; s++) {
      rgb[offsets[s] + dstIndex] = data[srcIndex++] // R
      rgb[offsets[s] + dstIndex + 1] = data[srcIndex++] // G
      rgb[offsets[s] + dstIndex + 2] = data[srcIndex++] // B
    }
    dstIndex += 3
  }
  return rgb
}

/**
 * Reads Zarr multi-dimensional array format, modifying the provided
 * NVImage header and returning the raw image data buffer.
 *
 * Format specification: https://zarrita.dev/get-started.html
 *
 * Note: RGB channels may be returned as depth dimension.
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the Zarr file data (unused, kept for consistency).
 * @param zarrData - Parsed Zarr data object containing width, height, depth, and data.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if data dimensions don't match expected size.
 */
export async function readZARR(
  nvImage: NVImage,
  buffer: ArrayBuffer,
  zarrData: unknown
): Promise<ArrayBufferLike> {
  let { width, height, depth = 1, data } = (zarrData ?? {}) as any
  let expectedLength = width * height * depth * 3
  let isRGB = expectedLength === data.length
  if (!isRGB) {
    expectedLength = width * height * depth
    if (depth === 3) {
      // see https://zarrita.dev/get-started.html R,G,B channels returns as depth!
      isRGB = true
      depth = 1
    }
  }
  if (expectedLength !== data.length) {
    throw new Error(`Expected RGB ${width}×${height}×${depth}×3 =  ${expectedLength}, but ZARR length ${data.length}`)
  }
  nvImage.hdr = new NIFTI1()
  const hdr = nvImage.hdr
  hdr.dims = [3, width, height, depth, 1, 1, 1, 1]
  hdr.pixDims = [1, 1, 1, 1, 0, 0, 0, 0]

  hdr.affine = [
    [hdr.pixDims[1], 0, 0, -(hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
    [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
    [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
    [0, 0, 0, 1]
  ]
  if (!isRGB) {
    hdr.numBitsPerVoxel = 8
    hdr.datatypeCode = NiiDataType.DT_UINT8
    // if data is a Uint8Array, convert to ArrayBuffer
    if (data instanceof Uint8Array) {
      const retBuffer = new ArrayBuffer(data.length)
      const retView = new Uint8Array(retBuffer)
      retView.set(data)
      return retBuffer
    }
    return data
  }
  hdr.numBitsPerVoxel = 24
  hdr.datatypeCode = NiiDataType.DT_RGB24
  const retData = zxy2xyz(data, hdr.dims[1], hdr.dims[2], hdr.dims[3])
  // convert retData Uint8Array to ArrayBuffer
  const retBuffer = new ArrayBuffer(retData.length)
  const retView = new Uint8Array(retBuffer)
  retView.set(retData)
  return retBuffer
}
