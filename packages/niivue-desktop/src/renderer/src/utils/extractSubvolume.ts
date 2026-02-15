import { NVImage } from '@niivue/niivue'

/**
 * Extract a subvolume from a base volume using a label mask.
 * Returns a new volume with original intensities where selected labels exist, zeros elsewhere.
 */
export function extractSubvolume(
  baseVolume: NVImage,
  labelVolume: NVImage,
  selectedLabels: Set<number>
): NVImage {
  const baseData = baseVolume.img as Float32Array | Int16Array | Uint8Array
  const labelData = labelVolume.img as Float32Array | Int16Array | Uint8Array

  if (baseData.length !== labelData.length) {
    throw new Error(
      `Base volume and label volume dimensions must match (base: ${baseData.length}, label: ${labelData.length})`
    )
  }

  const outputData = new Float32Array(baseData.length)

  for (let i = 0; i < labelData.length; i++) {
    const labelValue = Math.round(labelData[i])
    if (selectedLabels.has(labelValue)) {
      outputData[i] = baseData[i]
    } else {
      outputData[i] = 0
    }
  }

  const extractedVolume = baseVolume.clone()
  extractedVolume.img = outputData
  if (extractedVolume.hdr) {
    extractedVolume.hdr.intent_code = 0
    // Update header to match Float32Array data so WebGL texture upload uses correct format
    extractedVolume.hdr.datatypeCode = 16 // DT_FLOAT32
    extractedVolume.hdr.numBitsPerVoxel = 32
  }
  extractedVolume.calMinMax()

  return extractedVolume
}
