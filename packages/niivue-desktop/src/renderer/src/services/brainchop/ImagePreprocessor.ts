import * as tf from '@tensorflow/tfjs'
import type { NVImage } from '@niivue/niivue'
import type { PreprocessingResult } from './types.js'

/**
 * Image preprocessing for brain segmentation models
 * Handles volume harmonization, resampling, and intensity normalization
 */
export class ImagePreprocessor {
  private targetShape: [number, number, number] = [256, 256, 256]

  /**
   * Preprocess a volume for inference
   * @param volume - The NVImage volume to preprocess
   * @param options - Preprocessing options including target shape from model settings
   */
  async preprocessVolume(
    volume: NVImage,
    options: {
      normalizeIntensity?: boolean
      onProgress?: (progress: number, status?: string) => void
      /** Target shape from model's expectedInputShape [batch, depth, height, width] */
      expectedInputShape?: [number, number, number, number]
    } = {}
  ): Promise<PreprocessingResult> {
    const { normalizeIntensity = true, onProgress, expectedInputShape } = options

    // Update target shape if provided (extract [depth, height, width] from [batch, d, h, w])
    if (expectedInputShape && expectedInputShape.length === 4) {
      this.targetShape = [expectedInputShape[1], expectedInputShape[2], expectedInputShape[3]]
    }

    onProgress?.(0, 'Preparing volume data')

    // Extract volume data - volume should already be conformed to 256^3 @ 1mm by NiiVue's conform()
    const volumeData = this.extractVolumeData(volume)

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

    // Extract original voxel size
    const pixDims = volume.hdr?.pixDims || [1, 1, 1, 1, 1, 1, 1, 1]
    const originalVoxelSize = [pixDims[1], pixDims[2], pixDims[3]]

    // Volume must be conformed to target shape by caller (via nv.conform())
    const [targetX, targetY, targetZ] = this.targetShape
    const targetVoxelCount = targetX * targetY * targetZ
    const processedData = volumeData
    const finalShape = [targetX, targetY, targetZ]

    if (volumeData.length !== targetVoxelCount) {
      throw new Error(
        `Volume must be conformed to ${targetX}x${targetY}x${targetZ} before preprocessing ` +
        `(got ${volumeData.length} voxels). Call nv.conform(volume, true) first.`
      )
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
