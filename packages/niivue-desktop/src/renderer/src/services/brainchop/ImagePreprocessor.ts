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

    // Extract volume data - volume should already be conformed to 256^3 @ 1mm by NiiVue's conform()
    const volumeData = this.extractVolumeData(volume)

    // Debug: log all available dimension info
    console.log('[ImagePreprocessor] Volume dimension sources:', {
      'volume.dims': volume.dims,
      'volume.hdr?.dims': volume.hdr?.dims,
      'dataLength': volumeData.length,
      'expected256³': 256 * 256 * 256
    })

    // Extract original shape
    let originalShape: number[]
    if (volume.hdr?.dims && volume.hdr.dims.length > 3) {
      originalShape = [volume.hdr.dims[1], volume.hdr.dims[2], volume.hdr.dims[3]]
    } else if (volume.dims && volume.dims.length >= 3) {
      if (volume.dims[0] <= 7 && volume.dims.length > 3) {
        originalShape = [volume.dims[1], volume.dims[2], volume.dims[3]]
      } else {
        originalShape = [volume.dims[0], volume.dims[1], volume.dims[2]]
      }
    } else {
      throw new Error('Cannot determine volume dimensions')
    }

    console.log('[ImagePreprocessor] Original shape:', originalShape)

    // Extract original voxel size
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const originalVoxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    console.log('[ImagePreprocessor] Original voxel size:', originalVoxelSize)

    // Log affine matrix for debugging
    const affine = this.extractAffineMatrix(volume)
    console.log('[ImagePreprocessor] Affine matrix:', affine)

    // Check if volume needs resampling to 256³
    let processedData = volumeData
    let finalShape = originalShape

    if (volumeData.length !== 256 * 256 * 256) {
      console.log('[ImagePreprocessor] Volume is not 256³, resampling...')
      onProgress?.(10, 'Resampling to 256³ @ 1mm')

      // Resample to 256³
      processedData = await this.resampleVolume(volumeData, originalShape, volume)
      finalShape = [256, 256, 256]

      console.log('[ImagePreprocessor] Resampled to 256³')
    } else {
      console.log('[ImagePreprocessor] Volume is already 256³')
      finalShape = [256, 256, 256]
    }

    onProgress?.(30, 'Converting to tensor')

    // Convert to tensor
    let tensor = this.dataToTensor(processedData, finalShape)

    // Normalize intensity if requested
    if (normalizeIntensity) {
      onProgress?.(60, 'Normalizing intensity')
      tensor = this.normalizeIntensity(tensor)
    }

    onProgress?.(100, 'Preprocessing complete')

    // Return result
    return {
      tensor: tensor as tf.Tensor4D,
      originalShape: originalShape,
      originalVoxelSize: originalVoxelSize,
      affineMatrix: this.extractAffineMatrix(volume),
      needsResampling: false,
      paddingOffset: [0, 0, 0]
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
   * Resample volume to 256³ @ 1mm isotropic resolution
   * Centers the volume in the 256³ space to match brainchop/FastSurfer conform
   */
  private async resampleVolume(
    data: Float32Array,
    originalShape: number[],
    volume: NVImage
  ): Promise<Float32Array> {
    // Get voxel spacing
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const voxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    const [targetX, targetY, targetZ] = this.targetShape
    const [origX, origY, origZ] = originalShape

    // Calculate physical center of original volume (in mm)
    const origCenterPhysical = [
      (origX * voxelSize[0]) / 2,
      (origY * voxelSize[1]) / 2,
      (origZ * voxelSize[2]) / 2
    ]

    // Calculate physical center of target volume (in mm)
    const targetCenterPhysical = [targetX / 2, targetY / 2, targetZ / 2]

    console.log('[ImagePreprocessor] Resampling with centering:', {
      originalShape: [origX, origY, origZ],
      originalPhysicalCenter: origCenterPhysical,
      targetPhysicalCenter: targetCenterPhysical,
      voxelSize,
      originalPhysicalExtent: [origX * voxelSize[0], origY * voxelSize[1], origZ * voxelSize[2]],
      targetPhysicalExtent: [targetX, targetY, targetZ]
    })

    const resampled = new Float32Array(targetX * targetY * targetZ)

    // Trilinear interpolation with proper centering
    for (let z = 0; z < targetZ; z++) {
      for (let y = 0; y < targetY; y++) {
        for (let x = 0; x < targetX; x++) {
          // Target physical coordinate (mm) - voxel center
          const targetPhysX = (x + 0.5) * 1.0
          const targetPhysY = (y + 0.5) * 1.0
          const targetPhysZ = (z + 0.5) * 1.0

          // Offset from target center
          const offsetX = targetPhysX - targetCenterPhysical[0]
          const offsetY = targetPhysY - targetCenterPhysical[1]
          const offsetZ = targetPhysZ - targetCenterPhysical[2]

          // Source physical coordinate (centered)
          const srcPhysX = origCenterPhysical[0] + offsetX
          const srcPhysY = origCenterPhysical[1] + offsetY
          const srcPhysZ = origCenterPhysical[2] + offsetZ

          // Convert to source voxel coordinates (find voxel center that matches)
          const srcX = (srcPhysX / voxelSize[0]) - 0.5
          const srcY = (srcPhysY / voxelSize[1]) - 0.5
          const srcZ = (srcPhysZ / voxelSize[2]) - 0.5

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
   * Brainchop models expect 5D tensors with shape [batch, width, height, depth, channels]
   */
  private dataToTensor(data: Float32Array, shape: number[]): tf.Tensor4D {
    const [width, height, depth] = shape

    // First ensure the shape matches 256^3
    if (width !== 256 || height !== 256 || depth !== 256) {
      console.warn(`[ImagePreprocessor] Volume is not 256^3: [${width}, ${height}, ${depth}]`)
      console.warn('[ImagePreprocessor] Volume should be conformed before preprocessing')
    }

    // Create 5D tensor [batch, width, height, depth, channels]
    // Brainchop models expect this format
    const tensor5d = tf.tensor5d(Array.from(data), [1, width, height, depth, 1])

    // Return as Tensor4D for type compatibility (TensorFlow will handle it)
    return tensor5d as any as tf.Tensor4D
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
   * Inverse of the centered resampling in preprocessVolume
   */
  async resampleToOriginalSpace(
    data: Float32Array,
    originalShape: number[],
    originalVoxelSize: number[]
  ): Promise<Float32Array> {
    const [origX, origY, origZ] = originalShape
    const [targetX, targetY, targetZ] = this.targetShape

    // Calculate physical centers (same as forward resampling)
    const origCenterPhysical = [
      (origX * originalVoxelSize[0]) / 2,
      (origY * originalVoxelSize[1]) / 2,
      (origZ * originalVoxelSize[2]) / 2
    ]

    const targetCenterPhysical = [targetX / 2, targetY / 2, targetZ / 2]

    console.log('[ImagePreprocessor] Reverse resampling with centering:', {
      originalPhysicalCenter: origCenterPhysical,
      targetPhysicalCenter: targetCenterPhysical,
      originalVoxelSize
    })

    const resampled = new Float32Array(origX * origY * origZ)

    // Nearest neighbor interpolation for label data (preserves integer labels)
    for (let z = 0; z < origZ; z++) {
      for (let y = 0; y < origY; y++) {
        for (let x = 0; x < origX; x++) {
          // Original voxel physical coordinate (mm) - voxel center
          const origPhysX = (x + 0.5) * originalVoxelSize[0]
          const origPhysY = (y + 0.5) * originalVoxelSize[1]
          const origPhysZ = (z + 0.5) * originalVoxelSize[2]

          // Offset from original center
          const offsetX = origPhysX - origCenterPhysical[0]
          const offsetY = origPhysY - origCenterPhysical[1]
          const offsetZ = origPhysZ - origCenterPhysical[2]

          // Target physical coordinate (centered)
          const targetPhysX = targetCenterPhysical[0] + offsetX
          const targetPhysY = targetCenterPhysical[1] + offsetY
          const targetPhysZ = targetCenterPhysical[2] + offsetZ

          // Convert to target voxel coordinates (1mm isotropic) - find voxel index
          const targetVoxX = (targetPhysX / 1.0) - 0.5
          const targetVoxY = (targetPhysY / 1.0) - 0.5
          const targetVoxZ = (targetPhysZ / 1.0) - 0.5

          // Nearest neighbor
          const nearX = Math.round(targetVoxX)
          const nearY = Math.round(targetVoxY)
          const nearZ = Math.round(targetVoxZ)

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
   * Handles both 4D and 5D tensors (with channel dimension)
   */
  async tensorToVolumeData(tensor: tf.Tensor4D): Promise<Float32Array> {
    // Squeeze out batch and channel dimensions if present
    // Shape can be [1, W, H, D] or [1, W, H, D, 1]
    let squeezed = tensor

    // Remove batch dimension (axis 0)
    if (tensor.shape[0] === 1) {
      squeezed = tf.squeeze(squeezed, [0]) as any
    }

    // Remove channel dimension (last axis) if present
    const lastDim = squeezed.shape[squeezed.shape.length - 1]
    if (lastDim === 1) {
      squeezed = tf.squeeze(squeezed, [squeezed.shape.length - 1]) as any
    }

    const data = await squeezed.data()

    // Only dispose if we created a new tensor
    if (squeezed !== tensor) {
      squeezed.dispose()
    }

    return new Float32Array(data)
  }
}

// Export singleton instance
export const imagePreprocessor = new ImagePreprocessor()
