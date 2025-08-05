import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { log } from '@/logger'
import { NVUtilities } from '@/nvutilities'
import { hdrToArrayBuffer, NiiDataType } from '@/nvimage/utils'
import type { NVImage, TypedVoxelArray } from '@/nvimage'
/**
 * Creates a NIFTI1 header object with basic properties.
 */
export function createNiftiHeader(
  dims: number[] = [256, 256, 256],
  pixDims: number[] = [1, 1, 1],
  affine: number[] = [1, 0, 0, -128, 0, 1, 0, -128, 0, 0, 1, -128, 0, 0, 0, 1],
  datatypeCode = NiiDataType.DT_UINT8
): NIFTI1 {
  const hdr = new NIFTI1()
  hdr.littleEndian = true
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
  hdr.dims[0] = Math.max(3, dims.length)
  for (let i = 0; i < dims.length; i++) {
    hdr.dims[i + 1] = dims[i]
  }
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
  for (let i = 0; i < dims.length; i++) {
    hdr.pixDims[i + 1] = pixDims[i]
  }
  if (affine.length === 16) {
    let k = 0
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        hdr.affine[i][j] = affine[k]
        k++
      }
    }
  }
  let bpv = 8
  if (datatypeCode === NiiDataType.DT_INT8 || datatypeCode === NiiDataType.DT_UINT8) {
    bpv = 8
  } else if (datatypeCode === NiiDataType.DT_UINT16 || datatypeCode === NiiDataType.DT_INT16) {
    bpv = 16
  } else if (
    datatypeCode === NiiDataType.DT_FLOAT32 ||
    datatypeCode === NiiDataType.DT_UINT32 ||
    datatypeCode === NiiDataType.DT_INT32 ||
    datatypeCode === NiiDataType.DT_RGBA32
  ) {
    bpv = 32
  } else if (datatypeCode === NiiDataType.DT_FLOAT64) {
    bpv = 64
  } else {
    log.warn('Unsupported NIfTI datatypeCode for header creation: ' + datatypeCode)
  }
  hdr.datatypeCode = datatypeCode
  hdr.numBitsPerVoxel = bpv
  hdr.scl_inter = 0
  hdr.scl_slope = 1 // Default slope should be 1
  hdr.sform_code = 2 // Assume affine is RAS
  hdr.magic = 'n+1'
  hdr.vox_offset = 352 // Standard offset for NIfTI-1 with no extensions
  return hdr
}

/**
 * Creates a Uint8Array representing a NIFTI file (header + optional image data).
 */
export function createNiftiArray(
  dims: number[] = [256, 256, 256],
  pixDims: number[] = [1, 1, 1],
  affine: number[] = [1, 0, 0, -128, 0, 1, 0, -128, 0, 0, 1, -128, 0, 0, 0, 1],
  datatypeCode = NiiDataType.DT_UINT8,
  img: TypedVoxelArray | Uint8Array = new Uint8Array()
): Uint8Array {
  const hdr = createNiftiHeader(dims, pixDims, affine, datatypeCode)
  // hdrToArrayBuffer should handle creating the byte array correctly based on header info
  const hdrBytes = hdrToArrayBuffer(hdr, false) // Pass header directly

  // Ensure the header reports the correct offset, usually 352 for simple NIfTI-1
  hdr.vox_offset = Math.max(352, hdrBytes.length) // Ensure offset is at least header size
  // Re-generate header bytes if vox_offset changed header size itself (unlikely but possible with extensions)
  const finalHdrBytes = hdrToArrayBuffer(hdr, false)

  if (img.length < 1) {
    // Return just the header if no image data
    return finalHdrBytes
  }

  // Calculate padding needed to reach vox_offset
  const paddingSize = Math.max(0, hdr.vox_offset - finalHdrBytes.length)
  const padding = new Uint8Array(paddingSize)

  // Get the image data bytes correctly
  const imgBytes = new Uint8Array(img.buffer, img.byteOffset, img.byteLength)

  // Combine header, padding, and image data
  const totalLength = hdr.vox_offset + imgBytes.length
  const outputData = new Uint8Array(totalLength)

  outputData.set(finalHdrBytes, 0)
  outputData.set(padding, finalHdrBytes.length)
  outputData.set(imgBytes, hdr.vox_offset) // Place image data at the offset

  return outputData
}

/**
 * Converts NVImage data (header and image) to a NIfTI compliant Uint8Array.
 * Handles potential re-orientation of drawing data if necessary.
 * @param nvImage - The NVImage instance
 * @param drawingBytes - Optional Uint8Array for drawing overlay (assumed to be in RAS order)
 * @returns Uint8Array representing the NIfTI file
 */
export function toUint8Array(nvImage: NVImage, drawingBytes: Uint8Array | null = null): Uint8Array {
  if (!nvImage.hdr) {
    throw new Error('NVImage header is not defined for toUint8Array')
  }
  if (!nvImage.img && drawingBytes === null) {
    throw new Error('NVImage image data is not defined for toUint8Array')
  }

  const isDrawing = drawingBytes !== null
  // Create a deep copy of the header to modify safely for output
  const hdrCopy = JSON.parse(JSON.stringify(nvImage.hdr)) as NIFTI1 | NIFTI2

  // Handle extensions
  const hasExtensions = nvImage.extensions && nvImage.extensions.length > 0
  const extFlag = new Uint8Array(4)
  extFlag[0] = hasExtensions ? 1 : 0

  let extensionsData = new Uint8Array(0)
  if (hasExtensions) {
    const blocks: Uint8Array[] = []
    let totalSize = 0
    for (const ext of nvImage.extensions!) {
      const edataBytes = new Uint8Array(ext.edata)
      const block = new Uint8Array(8 + edataBytes.length)
      const dv = new DataView(block.buffer)
      dv.setInt32(0, ext.esize, true)
      dv.setInt32(4, ext.ecode, true)
      block.set(edataBytes, 8)
      blocks.push(block)
      totalSize += block.length
    }
    extensionsData = new Uint8Array(totalSize)
    let offset = 0
    for (const block of blocks) {
      extensionsData.set(block, offset)
      offset += block.length
    }
  }

  const headerSize = 348 // nifti-1 standard
  hdrCopy.vox_offset = Math.max(352, headerSize + extFlag.length + extensionsData.length)

  // If saving a drawing, ensure output header reflects drawing data type (UINT8) and resets scaling
  if (isDrawing) {
    hdrCopy.datatypeCode = NiiDataType.DT_UINT8
    hdrCopy.numBitsPerVoxel = 8
    hdrCopy.scl_slope = 1.0
    hdrCopy.scl_inter = 0.0
  }

  // Generate header bytes using the potentially modified copy
  const hdrBytes = hdrToArrayBuffer(hdrCopy, isDrawing)

  let imageBytesToSave: Uint8Array

  if (isDrawing) {
    const drawingBytesCurrent = drawingBytes! // Not null asserted by isDrawing check
    const perm = nvImage.permRAS as number[] | undefined

    // Check if reorientation from RAS (drawing space) to native space is needed
    if (perm && (perm[0] !== 1 || perm[1] !== 2 || perm[2] !== 3)) {
      log.debug('Reorienting drawing bytes back to native space for saving...')
      const dims = nvImage.hdr!.dims // Use original native dimensions
      const nVox = dims[1] * dims[2] * dims[3] // Total native voxels

      // Ensure drawing length matches expected RAS voxel count based on calculated dimsRAS
      const nVoxRAS = nvImage.dimsRAS ? nvImage.dimsRAS[1] * nvImage.dimsRAS[2] * nvImage.dimsRAS[3] : nVox
      if (drawingBytesCurrent.length !== nVoxRAS) {
        console.warn(
          `Drawing length (${drawingBytesCurrent.length}) does not match expected RAS voxel count (${nVoxRAS}). Cannot reorient drawing reliably.`
        )
        imageBytesToSave = drawingBytesCurrent // Use original as fallback
        // Ensure necessary transformation arrays exist
      } else if (!nvImage.img2RASstep || !nvImage.img2RASstart || !nvImage.dimsRAS) {
        console.warn(
          `Missing RAS transformation info (img2RASstep, img2RASstart, dimsRAS). Cannot reorient drawing reliably.`
        )
        imageBytesToSave = drawingBytesCurrent // Use original as fallback
      } else {
        const step = nvImage.img2RASstep // [stepX, stepY, stepZ] in native index space for RAS increments
        const start = nvImage.img2RASstart // [startX, startY, startZ] starting native index for RAS[0,0,0]
        const dimsRAS = nvImage.dimsRAS // [4, dimRX, dimRY, dimRZ]

        const nativeData = new Uint8Array(nVox)
        nativeData.fill(0) // Initialize with background value (e.g., 0)
        const inputDrawingRAS = drawingBytesCurrent // Source data is RAS ordered
        let rasIndex = 0 // Index for the flat inputDrawingRAS array

        // Iterate through the source RAS dimensions
        for (let rz = 0; rz < dimsRAS[3]; rz++) {
          const zi = start[2] + rz * step[2] // Native offset component for this RAS Z
          for (let ry = 0; ry < dimsRAS[2]; ry++) {
            const yi = start[1] + ry * step[1] // Native offset component for this RAS Y
            for (let rx = 0; rx < dimsRAS[1]; rx++) {
              const xi = start[0] + rx * step[0] // Native offset component for this RAS X
              const nativeIndex = xi + yi + zi // Calculate the final index in the native orientation buffer

              // Check bounds for safety before writing
              if (nativeIndex >= 0 && nativeIndex < nVox) {
                nativeData[nativeIndex] = inputDrawingRAS[rasIndex] // Place RAS voxel into calculated native position
              } else if (rasIndex < inputDrawingRAS.length) {
                // Log if we calculate an invalid native index but still have RAS data
                console.warn(
                  `Calculated native index ${nativeIndex} is out of bounds [0..${nVox - 1}] during drawing reorientation.`
                )
              }
              rasIndex++ // Increment index into the flat RAS drawing array
            }
          }
        }
        imageBytesToSave = nativeData // Use the reoriented data
      }
    } else {
      // No reorientation needed (image is already native/RAS or drawing is meant to be native)
      imageBytesToSave = drawingBytesCurrent
    }
  } else {
    // Not a drawing, use the main image data directly
    if (!nvImage.img) {
      throw new Error('NVImage image data is null when trying to save non-drawing.')
    }
    imageBytesToSave = new Uint8Array(nvImage.img.buffer, nvImage.img.byteOffset, nvImage.img.byteLength)
  }

  // Calculate padding needed to reach the specified vox_offset in the header
  const preImageBytesSize = hdrBytes.length + extFlag.length + extensionsData.length
  const paddingSize = Math.max(0, hdrCopy.vox_offset - preImageBytesSize)
  const padding = new Uint8Array(paddingSize)

  const totalLength = hdrCopy.vox_offset + imageBytesToSave.length
  const outputData = new Uint8Array(totalLength)

  let offset = 0
  outputData.set(hdrBytes, offset)
  offset += hdrBytes.length

  outputData.set(extFlag, offset)
  offset += extFlag.length

  outputData.set(extensionsData, offset)
  offset += extensionsData.length

  outputData.set(padding, offset)
  offset += padding.length

  outputData.set(imageBytesToSave, hdrCopy.vox_offset)

  return outputData
}

/**
 * Generates the NIfTI file as a Uint8Array and optionally compresses it.
 * @param nvImage - The NVImage instance
 * @param fnm - Filename (used to determine if compression is needed, .gz suffix)
 * @param drawing8 - Optional drawing overlay data
 * @returns Uint8Array (potentially compressed)
 */
export async function saveToUint8Array(
  nvImage: NVImage,
  fnm: string,
  drawing8: Uint8Array | null = null
): Promise<Uint8Array> {
  // Generate the core NIfTI byte array first
  const odata = toUint8Array(nvImage, drawing8)
  // Check filename extension for compression request
  const compress = fnm.toLowerCase().endsWith('.gz')

  if (compress) {
    try {
      // Use NVUtilities to compress the data
      const compressedData = await NVUtilities.compress(odata, 'gzip')
      return new Uint8Array(compressedData)
    } catch (error) {
      log.error('Compression failed:', error)
      log.warn('Returning uncompressed data due to compression error.')
      return odata // Return uncompressed data as fallback
    }
  } else {
    // No compression needed
    return odata
  }
}

/**
 * Generates the NIfTI file data and triggers a browser download.
 * @param nvImage - The NVImage instance
 * @param fnm - Filename for the downloaded file. If empty, returns data only.
 * @param drawing8 - Optional drawing overlay data
 * @returns The generated Uint8Array (potentially compressed)
 */
export async function saveToDisk(
  nvImage: NVImage,
  fnm: string = '',
  drawing8: Uint8Array | null = null
): Promise<Uint8Array> {
  // Always generate the data first, handling potential compression based on filename
  const saveData = await saveToUint8Array(nvImage, fnm, drawing8)

  if (!fnm) {
    log.debug('saveToDisk: empty file name, returning data as Uint8Array rather than triggering download')
    return saveData // Return data if filename is empty
  }

  try {
    // Create a Blob from the final data (compressed or not)
    const blob = new Blob([saveData.buffer], {
      type: 'application/octet-stream' // Standard type for binary download
    })
    // Create a temporary URL for the Blob
    const blobUrl = URL.createObjectURL(blob)
    // Create a link element to trigger the download
    const link = document.createElement('a')
    link.setAttribute('href', blobUrl)
    link.setAttribute('download', fnm) // Set the filename for the download
    link.style.visibility = 'hidden' // Hide the link
    document.body.appendChild(link) // Add link to the document
    link.click() // Simulate a click to trigger download
    document.body.removeChild(link) // Remove the link from the document
    // Revoke the temporary URL after a short delay to allow download initiation
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
  } catch (e) {
    log.error('Failed to trigger download:', e)
  }

  return saveData // Return the data regardless of download success/triggering
}
