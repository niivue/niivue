import { NIFTI1 } from 'nifti-reader-js'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Helper function to convert an ArrayBuffer to ImageData using the browser's Image API.
 * @param buffer - ArrayBuffer containing image data (BMP, PNG, JPG, etc.)
 * @returns Promise resolving to ImageData
 */
export async function imageDataFromArrayBuffer(buffer: ArrayBuffer): Promise<ImageData> {
  return new Promise<ImageData>((resolve, reject): void => {
    const blob = new Blob([buffer]) // Convert ArrayBuffer to Blob
    const url = URL.createObjectURL(blob) // Create a Blob URL
    const img = new Image()
    img.crossOrigin = 'Anonymous' // Allow CORS if needed
    img.src = url
    img.onload = (): void => {
      URL.revokeObjectURL(url) // Clean up the object URL
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get 2D context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.onerror = (err): void => {
      URL.revokeObjectURL(url) // Ensure cleanup on error
      reject(err)
    }
  })
}

/**
 * Reads standard image formats (BMP, PNG, JPG) using the browser's Image API,
 * modifying the provided NVImage header and returning the raw image data buffer.
 *
 * Automatically detects grayscale images and converts RGB data accordingly.
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the image file data.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 */
export async function readBMP(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const imageData = await imageDataFromArrayBuffer(buffer)
  const { width, height, data } = imageData
  nvImage.hdr = new NIFTI1()
  const hdr = nvImage.hdr
  hdr.dims = [3, width, height, 1, 0, 0, 0, 0]
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
  hdr.affine = [
    [hdr.pixDims[1], 0, 0, -(hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
    [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
    [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
    [0, 0, 0, 1]
  ]
  hdr.numBitsPerVoxel = 8
  hdr.datatypeCode = NiiDataType.DT_RGBA32
  let isGrayscale = true
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) {
      isGrayscale = false
      break
    }
  }
  if (isGrayscale) {
    hdr.datatypeCode = NiiDataType.DT_UINT8
    const grayscaleData = new Uint8Array(width * height)
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      grayscaleData[j] = data[i]
    }
    return grayscaleData.buffer
  }
  return data.buffer as ArrayBuffer
}
