import { isCompressed, decompressAsync, readHeaderAsync, readImage } from 'nifti-reader-js'
import { log } from '../../logger.js'
import type { NVImage } from '../index.js'
import { NiiDataType } from '../utils.js'

/**
 * Reads NIfTI format image (.nii, .nii.gz), modifying the provided NVImage header
 * and returning the raw image data buffer. Matches original internal logic.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the NIfTI file data.
 * @returns Promise resolving to the imgRaw ArrayBufferLike or null on critical error.
 */
export async function readNifti(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBufferLike | null> {
  let dataBuffer = buffer // Work with a local variable
  let imgRaw: ArrayBufferLike | null = null

  try {
    // 1. Check compression and decompress if necessary (same as original)
    // Note: isCompressed and decompressAsync might need ArrayBuffer, careful with ArrayBufferLike types if they change
    if (isCompressed(dataBuffer as ArrayBuffer)) {
      log.debug(`Decompressing NIfTI file: ${nvImage.name}`) // Use name from nvImage instance
      dataBuffer = await decompressAsync(dataBuffer as ArrayBuffer)
      log.debug(`Decompression complete for: ${nvImage.name}`)
    }

    // Ensure buffer is still valid after potential decompression
    if (!dataBuffer || dataBuffer.byteLength === 0) {
      throw new Error('Buffer became invalid after decompression attempt.')
    }

    // 2. Read header (same as original), assign directly to nvImage.hdr
    // readHeaderAsync likely returns NIFTI1 | NIFTI2 | null
    nvImage.hdr = await readHeaderAsync(dataBuffer as ArrayBuffer)

    if (nvImage.hdr === null) {
      throw new Error(`Failed to read NIfTI header: ${nvImage.name}`)
    }

    // 3. Perform header adjustments (same as original)
    // Reset cal_min/cal_max if they look like default uint8 range for non-uint8 types
    if (nvImage.hdr.cal_min === 0 && nvImage.hdr.cal_max === 255 && nvImage.hdr.datatypeCode !== NiiDataType.DT_UINT8) {
      log.debug(`Resetting suspicious cal_min/max (0/255) for non-uint8 NIfTI: ${nvImage.name}`)
      nvImage.hdr.cal_min = 0.0 // Use 0.0 to signal unset/recalculate later
      nvImage.hdr.cal_max = 0.0
    }
    // Add any other specific header adjustments from the original NII case here

    // 4. Read image data (same as original)
    // readImage expects the header object and the (potentially decompressed) buffer
    imgRaw = readImage(nvImage.hdr, dataBuffer as ArrayBuffer)

    if (imgRaw === null) {
      // This might indicate an issue like mismatched dimensions or data type error in readImage
      throw new Error(`nifti-reader-js readImage returned null for ${nvImage.name}`)
    }

    // 5. Return the raw image data buffer
    return imgRaw
  } catch (err) {
    log.error(`Error processing NIfTI file ${nvImage.name}:`, err)
    // Ensure header is nullified if reading failed critically
    nvImage.hdr = null
    return null // Return null on error to match MGH reader pattern
  }
}
