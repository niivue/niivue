import readVox from 'vox-reader'
import * as nifti from 'nifti-reader-js'

interface VoxXYZI {
  x: number
  y: number
  z: number
  i: number
}

interface VoxColor {
  r: number
  g: number
  b: number
  a: number
}

interface VoxData {
  size: {
    x: number
    y: number
    z: number
  }
  xyzi?: {
    values: VoxXYZI[]
  }
  rgba?: {
    values: VoxColor[]
  }
}

export async function vox2nii(inBuffer: ArrayBuffer | Uint8Array, isVerbose = true): Promise<Uint8Array> {
  try {
    // Ensure the data is a Uint8Array for vox-reader
    let byteArray: Uint8Array
    if (inBuffer instanceof Uint8Array) {
      byteArray = inBuffer
    } else if (inBuffer instanceof ArrayBuffer) {
      byteArray = new Uint8Array(inBuffer)
    } else {
      throw new Error('Unsupported input type: Expected Uint8Array or ArrayBuffer.')
    }

    console.log('here')
    // Parse the .vox file
    // @ts-expect-error - Buffer is an instance of Uint8Array
    const vox: VoxData = readVox(byteArray)
    if (!vox || !vox.size || !vox.xyzi?.values || !vox.rgba?.values) {
      throw new Error('Invalid or empty MagicaVoxel file.')
    }
    const { x: width, y: height, z: depth } = vox.size

    if (isVerbose) {
      console.log(`Loaded MagicaVoxel: ${width}x${height}x${depth}`)
    }

    // RGBA in NIfTI requires 4 bytes per voxel
    const voxelData = new Uint8Array(width * height * depth * 4).fill(0)

    // Convert MagicaVoxel color indices to RGBA
    for (const voxel of vox.xyzi.values) {
      const { x, y, z, i } = voxel
      const color = vox.rgba.values[i] // Lookup RGBA palette entry
      if (color) {
        const index = (x + y * width + z * width * height) * 4
        voxelData[index] = color.r // Red
        voxelData[index + 1] = color.g // Green
        voxelData[index + 2] = color.b // Blue
        voxelData[index + 3] = color.a // Alpha
      }
    }

    const hdr = new nifti.NIFTI1()
    hdr.littleEndian = true
    hdr.dims[0] = 3 // number of dimensions
    hdr.dims[1] = width
    hdr.dims[2] = height
    hdr.dims[3] = depth
    hdr.datatypeCode = 2304 // DT_RGBA32
    hdr.numBitsPerVoxel = 32
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.vox_offset = 352
    hdr.scl_slope = 1
    hdr.scl_inter = 0
    hdr.qform_code = 0
    hdr.sform_code = 0
    hdr.magic = 'n+1'

    const hdrBuffer = hdr.toArrayBuffer()

    const niftiData = new Uint8Array(hdrBuffer.byteLength + voxelData.byteLength)
    niftiData.set(new Uint8Array(hdrBuffer), 0)
    niftiData.set(voxelData, hdrBuffer.byteLength)

    return niftiData
  } catch (error) {
    throw error
  }
}
