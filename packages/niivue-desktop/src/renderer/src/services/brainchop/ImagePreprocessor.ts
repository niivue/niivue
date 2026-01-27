import * as tf from '@tensorflow/tfjs'
import type { NVImage } from '@niivue/niivue'
import type { PreprocessingResult } from './types.js'

/**
 * Image preprocessing for brain segmentation models
 * Handles volume harmonization, resampling, and intensity normalization
 */
export class ImagePreprocessor {
  private readonly targetShape = [256, 256, 256] as const

  /**
   * Preprocess a volume for inference
   * Conforms to 256×256×256, 1mm isotropic resolution
   */
  async preprocessVolume(
    volume: NVImage,
    options: {
      normalizeIntensity?: boolean
      onProgress?: (progress: number, status?: string) => void
    } = {}
  ): Promise<PreprocessingResult> {
    const { normalizeIntensity = true, onProgress } = options

    onProgress?.(0, 'Preparing volume data')

    // Extract volume data and metadata
    const volumeData = this.extractVolumeData(volume)
    const dims = volume.dims
    if (!dims) {
      throw new Error('Volume dimensions not available')
    }
    const originalShape = [dims[1], dims[2], dims[3]] // [width, height, depth]

    // Get original voxel size
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const originalVoxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    let affineMatrix = this.extractAffineMatrix(volume)

    onProgress?.(20, 'Checking if resampling needed')

    // Check if resampling is needed
    const needsResampling = this.checkIfResamplingNeeded(volume)

    let processedData = volumeData
    let processedShape = originalShape

    if (needsResampling) {
      onProgress?.(30, 'Resampling to 1mm isotropic')

      console.log('[ImagePreprocessor] Original voxel size:', originalVoxelSize)
      console.log('[ImagePreprocessor] Original affine matrix:', affineMatrix)

      processedData = await this.resampleVolume(volumeData, originalShape, volume)
      processedShape = [256, 256, 256] // Update shape after resampling to target size

      // Update affine matrix to reflect 1mm isotropic voxels
      // The rotation/scaling part (first 3x3) needs to be adjusted
      affineMatrix = this.adjustAffineForResampling(affineMatrix, originalVoxelSize, originalShape)

      console.log('[ImagePreprocessor] Adjusted affine matrix for 1mm isotropic:', affineMatrix)

      onProgress?.(60, 'Resampling complete')
    } else {
      onProgress?.(60, 'No resampling needed')
    }

    onProgress?.(70, 'Converting to tensor')

    // Convert to tensor with correct shape (either original or resampled)
    let tensor = this.dataToTensor(processedData, processedShape)

    // Pad or crop to target shape
    onProgress?.(80, 'Adjusting to target shape')
    const { tensor: adjustedTensor, paddingOffset } = this.adjustToTargetShape(tensor)
    tensor = adjustedTensor

    // Normalize intensity if requested
    if (normalizeIntensity) {
      onProgress?.(90, 'Normalizing intensity')
      tensor = this.normalizeIntensity(tensor)
    }

    onProgress?.(100, 'Preprocessing complete')

    return {
      tensor: tensor as tf.Tensor4D,
      originalShape,
      originalVoxelSize,
      affineMatrix,
      needsResampling,
      paddingOffset
    }
  }

  /**
   * Extract volume data from NVImage
   */
  private extractVolumeData(volume: NVImage): Float32Array {
    // NVImage stores data as typed arrays
    // We need to convert to Float32Array for processing
    const img = volume.img

    if (!img) {
      throw new Error('Volume image data not available')
    }

    if (img instanceof Float32Array) {
      return img
    } else if (img instanceof Uint8Array || img instanceof Uint16Array || img instanceof Int16Array) {
      return new Float32Array(img)
    } else {
      // Handle other array types
      const length = img.length
      const float32 = new Float32Array(length)
      for (let i = 0; i < length; i++) {
        float32[i] = img[i]
      }
      return float32
    }
  }

  /**
   * Extract affine transformation matrix from NVImage
   */
  private extractAffineMatrix(volume: NVImage): number[][] {
    // NVImage uses matRAS for the affine matrix (4x4)
    const matRAS = volume.matRAS

    // If no matrix, use identity
    if (!matRAS) {
      return [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ]
    }

    // Convert from Float32Array (or mat4) to 2D array
    const matrix: number[][] = []
    for (let i = 0; i < 4; i++) {
      matrix[i] = []
      for (let j = 0; j < 4; j++) {
        matrix[i][j] = matRAS[i * 4 + j]
      }
    }

    return matrix
  }

  /**
   * Adjust affine matrix after resampling to 1mm isotropic
   * Based on NiiVue's conformVox2Vox algorithm
   */
  private adjustAffineForResampling(
    originalAffine: number[][],
    originalVoxelSize: number[],
    originalShape: number[]
  ): number[][] {
    const targetShape = this.targetShape

    // 1. Compute input volume center in physical RAS coordinates
    // Transform voxel center [width/2, height/2, depth/2] through input affine
    const inCenter = [
      originalShape[0] / 2,
      originalShape[1] / 2,
      originalShape[2] / 2
    ]

    const Pxyz_c = [
      originalAffine[0][0] * inCenter[0] + originalAffine[0][1] * inCenter[1] + originalAffine[0][2] * inCenter[2] + originalAffine[0][3],
      originalAffine[1][0] * inCenter[0] + originalAffine[1][1] * inCenter[1] + originalAffine[1][2] * inCenter[2] + originalAffine[1][3],
      originalAffine[2][0] * inCenter[0] + originalAffine[2][1] * inCenter[1] + originalAffine[2][2] * inCenter[2] + originalAffine[2][3]
    ]

    console.log('[ImagePreprocessor] Input center in physical space:', Pxyz_c)

    // 2. Extract pure rotation (divide out voxel size)
    const rotation: number[][] = []
    for (let i = 0; i < 3; i++) {
      rotation[i] = []
      for (let j = 0; j < 3; j++) {
        rotation[i][j] = originalAffine[i][j] / originalVoxelSize[j]
      }
    }

    // 3. Create output rotation+scale matrix (1mm isotropic)
    const MdcD: number[][] = []
    for (let i = 0; i < 3; i++) {
      MdcD[i] = []
      for (let j = 0; j < 3; j++) {
        MdcD[i][j] = rotation[i][j] * 1.0 // 1mm voxel size
      }
    }

    // 4. Compute output volume center in physical RAS coordinates
    // Transform [256/2, 256/2, 256/2] through output rotation+scale
    const outCenter = [targetShape[0] / 2, targetShape[1] / 2, targetShape[2] / 2]
    const vol_center = [
      MdcD[0][0] * outCenter[0] + MdcD[0][1] * outCenter[1] + MdcD[0][2] * outCenter[2],
      MdcD[1][0] * outCenter[0] + MdcD[1][1] * outCenter[1] + MdcD[1][2] * outCenter[2],
      MdcD[2][0] * outCenter[0] + MdcD[2][1] * outCenter[1] + MdcD[2][2] * outCenter[2]
    ]

    console.log('[ImagePreprocessor] Output center in physical space:', vol_center)

    // 5. Translation = input_center - output_center
    const translate = [
      Pxyz_c[0] - vol_center[0],
      Pxyz_c[1] - vol_center[1],
      Pxyz_c[2] - vol_center[2]
    ]

    console.log('[ImagePreprocessor] Translation:', translate)

    // 6. Build output affine
    const newAffine: number[][] = [
      [MdcD[0][0], MdcD[0][1], MdcD[0][2], translate[0]],
      [MdcD[1][0], MdcD[1][1], MdcD[1][2], translate[1]],
      [MdcD[2][0], MdcD[2][1], MdcD[2][2], translate[2]],
      [0, 0, 0, 1]
    ]

    console.log('[ImagePreprocessor] New affine matrix:', newAffine)

    return newAffine
  }

  /**
   * Check if volume needs resampling to 1mm isotropic
   */
  private checkIfResamplingNeeded(volume: NVImage): boolean {
    // Get voxel dimensions from pixDims
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const voxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    // Check if already 1mm isotropic (with small tolerance)
    const tolerance = 0.1
    const isIsotropic = voxelSize.every(dim => Math.abs(dim - 1.0) < tolerance)

    // Also check if dimensions match target
    const dims = volume.dims
    if (!dims) {
      return true // Need resampling if dims not available
    }
    const dimVals = [dims[1], dims[2], dims[3]]
    const dimsMatch = dimVals.every((dim, i) => dim === this.targetShape[i])

    return !isIsotropic || !dimsMatch
  }

  /**
   * Resample volume to 1mm isotropic resolution
   * Uses trilinear interpolation
   */
  private async resampleVolume(
    data: Float32Array,
    originalShape: number[],
    volume: NVImage
  ): Promise<Float32Array> {
    // Get voxel spacing
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const voxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    // Simple resampling: target voxel i maps to source voxel i * voxelSize
    // This preserves the origin (voxel 0 → voxel 0)
    const scaleFactors = [...voxelSize]

    const [targetX, targetY, targetZ] = this.targetShape
    const [origX, origY, origZ] = originalShape

    const resampled = new Float32Array(targetX * targetY * targetZ)

    // Trilinear interpolation
    for (let z = 0; z < targetZ; z++) {
      for (let y = 0; y < targetY; y++) {
        for (let x = 0; x < targetX; x++) {
          // Map target voxel to source coordinates
          const srcX = x * scaleFactors[0]
          const srcY = y * scaleFactors[1]
          const srcZ = z * scaleFactors[2]

          // Get integer and fractional parts
          const x0 = Math.floor(srcX)
          const y0 = Math.floor(srcY)
          const z0 = Math.floor(srcZ)

          const x1 = Math.min(x0 + 1, origX - 1)
          const y1 = Math.min(y0 + 1, origY - 1)
          const z1 = Math.min(z0 + 1, origZ - 1)

          const xFrac = srcX - x0
          const yFrac = srcY - y0
          const zFrac = srcZ - z0

          // Boundary check
          if (x0 < 0 || x0 >= origX || y0 < 0 || y0 >= origY || z0 < 0 || z0 >= origZ) {
            continue
          }

          // Get 8 corner values
          const c000 = data[z0 * origX * origY + y0 * origX + x0]
          const c001 = data[z0 * origX * origY + y0 * origX + x1]
          const c010 = data[z0 * origX * origY + y1 * origX + x0]
          const c011 = data[z0 * origX * origY + y1 * origX + x1]
          const c100 = data[z1 * origX * origY + y0 * origX + x0]
          const c101 = data[z1 * origX * origY + y0 * origX + x1]
          const c110 = data[z1 * origX * origY + y1 * origX + x0]
          const c111 = data[z1 * origX * origY + y1 * origX + x1]

          // Interpolate along x
          const c00 = c000 * (1 - xFrac) + c001 * xFrac
          const c01 = c010 * (1 - xFrac) + c011 * xFrac
          const c10 = c100 * (1 - xFrac) + c101 * xFrac
          const c11 = c110 * (1 - xFrac) + c111 * xFrac

          // Interpolate along y
          const c0 = c00 * (1 - yFrac) + c01 * yFrac
          const c1 = c10 * (1 - yFrac) + c11 * yFrac

          // Interpolate along z
          const value = c0 * (1 - zFrac) + c1 * zFrac

          resampled[z * targetX * targetY + y * targetX + x] = value
        }
      }
    }

    return resampled
  }

  /**
   * Convert Float32Array to TensorFlow tensor
   */
  private dataToTensor(data: Float32Array, shape: number[]): tf.Tensor4D {
    // TensorFlow expects [batch, depth, height, width, channels]
    // But for medical imaging we typically use [batch, width, height, depth]
    const [width, height, depth] = shape

    // Reshape to 4D tensor [1, width, height, depth]
    return tf.tensor4d(Array.from(data), [1, width, height, depth])
  }

  /**
   * Adjust tensor to target shape by padding or cropping
   * Returns the adjusted tensor and the padding offset (voxels added before content)
   */
  private adjustToTargetShape(tensor: tf.Tensor4D): {
    tensor: tf.Tensor4D
    paddingOffset: [number, number, number]
  } {
    const shape = tensor.shape.slice(1) as [number, number, number] // Remove batch dimension
    const [currentX, currentY, currentZ] = shape

    let adjusted = tensor
    const paddingOffset: [number, number, number] = [0, 0, 0]

    // Pad or crop each dimension
    for (let dim = 0; dim < 3; dim++) {
      const current = shape[dim]
      const target = this.targetShape[dim]

      if (current < target) {
        // Pad (center padding)
        const padBefore = Math.floor((target - current) / 2)
        const padAfter = target - current - padBefore

        // Track the padding offset (negative for cropping, positive for padding)
        paddingOffset[dim] = padBefore

        const paddings: Array<[number, number]> = [
          [0, 0], // batch dimension
          [0, 0],
          [0, 0],
          [0, 0]
        ]
        paddings[dim + 1] = [padBefore, padAfter]

        adjusted = tf.pad(adjusted, paddings, 0)
      } else if (current > target) {
        // Crop (center crop)
        const cropBefore = Math.floor((current - target) / 2)

        // Track the crop offset (negative to indicate we removed voxels)
        paddingOffset[dim] = -cropBefore

        const begin = [0, 0, 0, 0]
        const size = [1, currentX, currentY, currentZ]

        begin[dim + 1] = cropBefore
        size[dim + 1] = target

        adjusted = tf.slice(adjusted, begin, size)
      }
    }

    return {
      tensor: adjusted as tf.Tensor4D,
      paddingOffset
    }
  }

  /**
   * Normalize intensity values
   * Uses min-max normalization to [0, 1] range
   */
  normalizeIntensity(tensor: tf.Tensor4D): tf.Tensor4D {
    return tf.tidy(() => {
      // Get min and max values
      const min = tf.min(tensor)
      const max = tf.max(tensor)

      // Avoid division by zero
      const range = tf.sub(max, min)
      const safeRange = tf.maximum(range, tf.scalar(1e-8))

      // Normalize: (x - min) / (max - min)
      return tf.div(tf.sub(tensor, min), safeRange) as tf.Tensor4D
    })
  }

  /**
   * Denormalize tensor back to original intensity range
   */
  denormalizeIntensity(tensor: tf.Tensor4D, originalMin: number, originalMax: number): tf.Tensor4D {
    return tf.tidy(() => {
      const range = originalMax - originalMin
      return tf.add(tf.mul(tensor, tf.scalar(range)), tf.scalar(originalMin)) as tf.Tensor4D
    })
  }

  /**
   * Resample segmentation back to original volume dimensions
   * Inverse of preprocessVolume resampling
   */
  async resampleToOriginalSpace(
    data: Float32Array,
    originalShape: number[],
    originalVoxelSize: number[]
  ): Promise<Float32Array> {
    const [origX, origY, origZ] = originalShape
    const [targetX, targetY, targetZ] = this.targetShape

    // Inverse scale factors: original voxel i came from resampled voxel i * voxelSize
    const scaleFactors = [...originalVoxelSize]

    const resampled = new Float32Array(origX * origY * origZ)

    // Nearest neighbor interpolation for label data (to preserve integer labels)
    for (let z = 0; z < origZ; z++) {
      for (let y = 0; y < origY; y++) {
        for (let x = 0; x < origX; x++) {
          // Map original voxel to resampled coordinates
          const resampX = x * scaleFactors[0]
          const resampY = y * scaleFactors[1]
          const resampZ = z * scaleFactors[2]

          // Nearest neighbor
          const nearX = Math.min(Math.round(resampX), targetX - 1)
          const nearY = Math.min(Math.round(resampY), targetY - 1)
          const nearZ = Math.min(Math.round(resampZ), targetZ - 1)

          // Bounds check
          if (nearX >= 0 && nearX < targetX && nearY >= 0 && nearY < targetY && nearZ >= 0 && nearZ < targetZ) {
            const value = data[nearZ * targetX * targetY + nearY * targetX + nearX]
            resampled[z * origX * origY + y * origX + x] = value
          }
        }
      }
    }

    return resampled
  }

  /**
   * Convert tensor back to NVImage format
   */
  async tensorToVolumeData(tensor: tf.Tensor4D): Promise<Float32Array> {
    // Remove batch dimension and convert to array
    const squeezed = tf.squeeze(tensor, [0])
    const data = await squeezed.data()
    squeezed.dispose()

    return new Float32Array(data)
  }
}

// Export singleton instance
export const imagePreprocessor = new ImagePreprocessor()
