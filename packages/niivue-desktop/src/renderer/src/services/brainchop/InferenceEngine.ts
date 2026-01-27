import * as tf from '@tensorflow/tfjs'
import type { InferenceOptions, TensorSession } from './types.js'

/**
 * Inference engine for running TensorFlow.js models
 * Supports both full volume and subvolume-based inference
 */
export class InferenceEngine {
  private activeSessions: Set<TensorSession> = new Set()

  /**
   * Run inference on a preprocessed volume
   */
  async runInference(
    inputTensor: tf.Tensor4D,
    model: tf.LayersModel,
    options: InferenceOptions
  ): Promise<tf.Tensor4D> {
    const { useSubvolumes, subvolumeSize, onProgress, abortSignal } = options

    // Check for cancellation
    if (abortSignal?.aborted) {
      throw new Error('Inference cancelled by user')
    }

    // Create tensor session for memory tracking
    const session = this.createSession()

    try {
      onProgress?.(0, 'Starting inference')

      let outputTensor: tf.Tensor4D

      if (useSubvolumes) {
        // Use subvolume-based inference for memory efficiency
        outputTensor = await this.runSubvolumeInference(
          inputTensor,
          model,
          subvolumeSize,
          onProgress,
          abortSignal,
          session
        )
      } else {
        // Run inference on full volume
        outputTensor = await this.runFullVolumeInference(inputTensor, model, onProgress, abortSignal, session)
      }

      onProgress?.(100, 'Inference complete')

      return outputTensor
    } catch (error) {
      // Clean up session on error
      session.dispose()
      throw error
    }
  }

  /**
   * Run inference on full volume
   */
  private async runFullVolumeInference(
    inputTensor: tf.Tensor4D,
    model: tf.LayersModel,
    onProgress?: (progress: number, status?: string) => void,
    abortSignal?: AbortSignal,
    session?: TensorSession
  ): Promise<tf.Tensor4D> {
    return tf.tidy(() => {
      onProgress?.(20, 'Running full volume inference')

      // Check for cancellation
      if (abortSignal?.aborted) {
        throw new Error('Inference cancelled by user')
      }

      // Add channel dimension if model expects 5D input
      // Most brainchop models expect [batch, width, height, depth, channels]
      let modelInput = inputTensor
      const inputShape = model.inputs[0].shape
      if (inputShape && inputShape.length === 5 && inputTensor.shape.length === 4) {
        // Expand dims to add channel dimension: [1, 256, 256, 256] -> [1, 256, 256, 256, 1]
        modelInput = tf.expandDims(inputTensor, -1) as any
        console.log('[InferenceEngine] Expanded input shape from', inputTensor.shape, 'to', modelInput.shape)
      }

      // Run model prediction
      const prediction = model.predict(modelInput) as tf.Tensor

      onProgress?.(80, 'Processing output')

      // Ensure output is 4D
      let output: tf.Tensor4D
      if (prediction.shape.length === 5) {
        // [batch, width, height, depth, classes]
        // Take argmax over classes dimension
        // argMax already preserves the batch dimension, so result is [batch, width, height, depth]
        output = tf.argMax(prediction, -1) as tf.Tensor4D
      } else if (prediction.shape.length === 4) {
        output = prediction as tf.Tensor4D
      } else {
        throw new Error(`Unexpected output shape: ${prediction.shape}`)
      }

      // Track tensor in session
      if (session) {
        session.tensors.push(output)
      }

      return output
    })
  }

  /**
   * Run inference on subvolumes for memory efficiency
   * Divides volume into smaller overlapping patches
   */
  private async runSubvolumeInference(
    inputTensor: tf.Tensor4D,
    model: tf.LayersModel,
    subvolumeSize: number,
    onProgress?: (progress: number, status?: string) => void,
    abortSignal?: AbortSignal,
    session?: TensorSession
  ): Promise<tf.Tensor4D> {
    const [, width, height, depth] = inputTensor.shape

    // Calculate number of subvolumes needed
    const strideSize = Math.floor(subvolumeSize * 0.75) // 25% overlap
    const numSubvolumesX = Math.ceil(width / strideSize)
    const numSubvolumesY = Math.ceil(height / strideSize)
    const numSubvolumesZ = Math.ceil(depth / strideSize)
    const totalSubvolumes = numSubvolumesX * numSubvolumesY * numSubvolumesZ

    onProgress?.(5, `Processing ${totalSubvolumes} subvolumes`)

    // Create output tensor filled with zeros
    const outputShape: [number, number, number, number] = [1, width, height, depth]
    let outputTensor = tf.zeros(outputShape)
    let weightsTensor = tf.zeros(outputShape) // For weighted averaging of overlaps

    let processedCount = 0

    // Process each subvolume
    for (let z = 0; z < numSubvolumesZ; z++) {
      for (let y = 0; y < numSubvolumesY; y++) {
        for (let x = 0; x < numSubvolumesX; x++) {
          // Check for cancellation
          if (abortSignal?.aborted) {
            outputTensor.dispose()
            weightsTensor.dispose()
            throw new Error('Inference cancelled by user')
          }

          // Calculate subvolume boundaries
          const startX = x * strideSize
          const startY = y * strideSize
          const startZ = z * strideSize

          const endX = Math.min(startX + subvolumeSize, width)
          const endY = Math.min(startY + subvolumeSize, height)
          const endZ = Math.min(startZ + subvolumeSize, depth)

          const sizeX = endX - startX
          const sizeY = endY - startY
          const sizeZ = endZ - startZ

          // Extract subvolume
          const subvolume = tf.tidy(() => {
            const sliced = tf.slice4d(inputTensor, [0, startX, startY, startZ], [1, sizeX, sizeY, sizeZ])

            // Pad to subvolumeSize if needed
            if (sizeX < subvolumeSize || sizeY < subvolumeSize || sizeZ < subvolumeSize) {
              const paddings: Array<[number, number]> = [
                [0, 0],
                [0, subvolumeSize - sizeX],
                [0, subvolumeSize - sizeY],
                [0, subvolumeSize - sizeZ]
              ]
              return tf.pad(sliced, paddings)
            }

            return sliced
          })

          // Run inference on subvolume
          const prediction = tf.tidy(() => {
            // Add channel dimension if model expects 5D input
            let modelInput = subvolume
            const inputShape = model.inputs[0].shape
            if (inputShape && inputShape.length === 5 && subvolume.shape.length === 4) {
              modelInput = tf.expandDims(subvolume, -1) as any
            }

            const pred = model.predict(modelInput) as tf.Tensor

            // Handle different output formats
            let processed: tf.Tensor4D
            if (pred.shape.length === 5) {
              // argMax already preserves the batch dimension, so result is [batch, width, height, depth]
              processed = tf.argMax(pred, -1) as tf.Tensor4D
            } else {
              processed = pred as tf.Tensor4D
            }

            // Crop back to actual size
            if (sizeX < subvolumeSize || sizeY < subvolumeSize || sizeZ < subvolumeSize) {
              return tf.slice4d(processed, [0, 0, 0, 0], [1, sizeX, sizeY, sizeZ])
            }

            return processed
          })

          // Create weight tensor for blending (higher weight in center)
          const weights = this.createBlendingWeights(sizeX, sizeY, sizeZ)

          // Add prediction to output with blending
          outputTensor = tf.tidy(() => {
            const oldOutput = outputTensor

            // Pad prediction and weights to full size
            const predPaddings: Array<[number, number]> = [
              [0, 0],
              [startX, width - endX],
              [startY, height - endY],
              [startZ, depth - endZ]
            ]

            const paddedPred = tf.pad(prediction, predPaddings)
            const paddedWeights = tf.pad(weights, predPaddings)

            // Weighted sum
            const weightedPred = tf.mul(paddedPred, paddedWeights)
            const newOutput = tf.add(oldOutput, weightedPred)

            oldOutput.dispose()
            paddedPred.dispose()
            paddedWeights.dispose()
            weightedPred.dispose()

            return newOutput
          })

          // Add to weights
          weightsTensor = tf.tidy(() => {
            const oldWeights = weightsTensor

            const predPaddings: Array<[number, number]> = [
              [0, 0],
              [startX, width - endX],
              [startY, height - endY],
              [startZ, depth - endZ]
            ]

            const paddedWeights = tf.pad(weights, predPaddings)
            const newWeights = tf.add(oldWeights, paddedWeights)

            oldWeights.dispose()
            paddedWeights.dispose()

            return newWeights
          })

          // Clean up
          subvolume.dispose()
          prediction.dispose()
          weights.dispose()

          // Update progress
          processedCount++
          const progress = 5 + Math.floor((processedCount / totalSubvolumes) * 90)
          onProgress?.(progress, `Processed ${processedCount}/${totalSubvolumes} subvolumes`)
        }
      }
    }

    // Normalize by weights (weighted average)
    const finalOutput = tf.tidy(() => {
      // Avoid division by zero
      const safeWeights = tf.maximum(weightsTensor, tf.scalar(1e-8))
      const result = tf.div(outputTensor, safeWeights) as tf.Tensor4D

      outputTensor.dispose()
      weightsTensor.dispose()

      return result
    })

    if (session) {
      session.tensors.push(finalOutput)
    }

    return finalOutput
  }

  /**
   * Create blending weights for smooth transitions between subvolumes
   * Higher weights in the center, lower at edges
   */
  private createBlendingWeights(sizeX: number, sizeY: number, sizeZ: number): tf.Tensor4D {
    return tf.tidy(() => {
      // Create 1D weight arrays using cosine window
      const createWindow = (size: number): Float32Array => {
        const window = new Float32Array(size)
        for (let i = 0; i < size; i++) {
          // Cosine window (Hann window)
          window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
        }
        return window
      }

      const windowX = createWindow(sizeX)
      const windowY = createWindow(sizeY)
      const windowZ = createWindow(sizeZ)

      // Create 3D weight tensor by outer product
      const weights = new Float32Array(sizeX * sizeY * sizeZ)

      for (let z = 0; z < sizeZ; z++) {
        for (let y = 0; y < sizeY; y++) {
          for (let x = 0; x < sizeX; x++) {
            const idx = z * sizeX * sizeY + y * sizeX + x
            weights[idx] = windowX[x] * windowY[y] * windowZ[z]
          }
        }
      }

      return tf.tensor4d(Array.from(weights), [1, sizeX, sizeY, sizeZ])
    })
  }

  /**
   * Create a tensor session for memory tracking
   */
  private createSession(): TensorSession {
    const session: TensorSession = {
      tensors: [],
      dispose: () => {
        for (const tensor of session.tensors) {
          if (!tensor.isDisposed) {
            tensor.dispose()
          }
        }
        session.tensors = []
        this.activeSessions.delete(session)
      }
    }

    this.activeSessions.add(session)
    return session
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    numTensors: number
    numBytes: number
    numActiveSessions: number
  } {
    const memory = tf.memory()
    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
      numActiveSessions: this.activeSessions.size
    }
  }

  /**
   * Dispose all active sessions and cleanup
   */
  dispose(): void {
    for (const session of this.activeSessions) {
      session.dispose()
    }
    this.activeSessions.clear()
  }
}

// Export singleton instance
export const inferenceEngine = new InferenceEngine()
