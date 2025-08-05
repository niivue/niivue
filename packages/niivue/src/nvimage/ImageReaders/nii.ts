import { isCompressed, decompressAsync, readHeaderAsync, readImage, hasExtension } from 'nifti-reader-js'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Reads NIfTI format image (.nii, .nii.gz), modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the NIfTI file data.
 * @returns Promise resolving to the imgRaw ArrayBufferLike or null on critical error.
 */
export async function readNifti(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBufferLike | null> {
  let dataBuffer = buffer // Work with a local variable
  let imgRaw: ArrayBufferLike | null = null

  try {
    if (isCompressed(dataBuffer as ArrayBuffer)) {
      log.debug(`Decompressing NIfTI file: ${nvImage.name}`) // Use name from nvImage instance
      dataBuffer = await decompressAsync(dataBuffer as ArrayBuffer)
      log.debug(`Decompression complete for: ${nvImage.name}`)
    }

    // Ensure buffer is still valid after potential decompression
    if (!dataBuffer || dataBuffer.byteLength === 0) {
      throw new Error('Buffer became invalid after decompression attempt.')
    }

    nvImage.hdr = await readHeaderAsync(dataBuffer as ArrayBuffer)
    if (hasExtension(nvImage.hdr)) {
      nvImage.extensions = nvImage.hdr.extensions
    }

    if (nvImage.hdr === null) {
      throw new Error(`Failed to read NIfTI header: ${nvImage.name}`)
    }

    if (nvImage.hdr.cal_min === 0 && nvImage.hdr.cal_max === 255 && nvImage.hdr.datatypeCode !== NiiDataType.DT_UINT8) {
      log.debug(`Resetting suspicious cal_min/max (0/255) for non-uint8 NIfTI: ${nvImage.name}`)
      nvImage.hdr.cal_min = 0.0 // Use 0.0 to signal unset/recalculate later
      nvImage.hdr.cal_max = 0.0
    }

    imgRaw = readImage(nvImage.hdr, dataBuffer as ArrayBuffer)

    if (imgRaw === null) {
      throw new Error(`nifti-reader-js readImage returned null for ${nvImage.name}`)
    }

    return imgRaw
  } catch (err) {
    log.error(`Error processing NIfTI file ${nvImage.name}:`, err)
    nvImage.hdr = null
    return null
  }
}
