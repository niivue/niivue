import * as tf from '@tensorflow/tfjs'
import type { InferenceOptions, ModelInfo } from './types.js'

/**
 * Inference engine following brainchop's reference implementation.
 * Key features:
 * - Crops volume to brain bounding box before inference (reduces tensor size)
 * - Runs layer-by-layer instead of model.predict() (allows intermediate disposal)
 * - Uses SequentialConvLayer for final layer of large models (avoids texture limits)
 * - Restores output to 256^3 after inference
 */
export class InferenceEngine {
  /**
   * Run inference on a preprocessed 3D volume tensor (256^3).
   * Following brainchop's runFullVolumeInference pattern.
   */
  async runInference(
    slices3d: tf.Tensor3D,
    model: tf.LayersModel,
    options: InferenceOptions
  ): Promise<tf.Tensor3D> {
    const { modelInfo, onProgress, abortSignal } = options

    onProgress?.(0, 'Starting inference')

    if (abortSignal?.aborted) {
      throw new Error('Inference cancelled by user')
    }

    // 1. Create brain mask and crop
    onProgress?.(5, 'Cropping to brain region')
    let mask3d: tf.Tensor3D
    if (modelInfo.autoThreshold > 0) {
      mask3d = await applyMriThreshold(slices3d, modelInfo.autoThreshold)
    } else {
      mask3d = slices3d.greater([0]).asType('bool') as tf.Tensor3D
    }

    const { cropped, corner } = await cropAndGetCorner(slices3d, mask3d, modelInfo.cropPadding)
    mask3d.dispose()

    let croppedInput = cropped
    if (modelInfo.enableTranspose) {
      croppedInput = cropped.transpose() as tf.Tensor3D
      cropped.dispose()
      console.log('[InferenceEngine] Input transposed for pre-model')
    }

    console.log('[InferenceEngine] Cropped shape:', croppedInput.shape)

    // 2. Determine channel ordering
    const isChannelLast = await isModelChnlLast(model)
    console.log('[InferenceEngine] Model is channel-last:', isChannelLast)

    // 3. Adjust model input shape to match cropped volume
    if (isChannelLast) {
      model.layers[0].batchInputShape[1] = croppedInput.shape[0]
      model.layers[0].batchInputShape[2] = croppedInput.shape[1]
      model.layers[0].batchInputShape[3] = croppedInput.shape[2]
    } else {
      model.layers[0].batchInputShape[2] = croppedInput.shape[0]
      model.layers[0].batchInputShape[3] = croppedInput.shape[1]
      model.layers[0].batchInputShape[4] = croppedInput.shape[2]
    }

    // 4. Reshape to 5D [batch, D, H, W, channels] or [batch, channels, D, H, W]
    let inputShape: number[]
    if (isChannelLast) {
      inputShape = [1, croppedInput.shape[0], croppedInput.shape[1], croppedInput.shape[2], 1]
    } else {
      inputShape = [1, 1, croppedInput.shape[0], croppedInput.shape[1], croppedInput.shape[2]]
    }
    let currentTensor: tf.Tensor = croppedInput.reshape(inputShape)
    croppedInput.dispose()

    // 5. Layer-by-layer inference
    const layersLength = model.layers.length
    const loopEnd = modelInfo.enableSeqConv ? layersLength - 2 : layersLength - 1
    const syncEvery = modelInfo.enableSeqConv ? 1 : 15

    console.log(`[InferenceEngine] Running ${layersLength} layers (loopEnd=${loopEnd}, seqConv=${modelInfo.enableSeqConv})`)

    for (let i = 1; i <= loopEnd; i++) {
      if (abortSignal?.aborted) {
        currentTensor.dispose()
        throw new Error('Inference cancelled by user')
      }

      try {
        let nextTensor: tf.Tensor
        const layer = model.layers[i]

        if (modelInfo.enableSeqConv && layer.activation?.getClassName() === 'linear') {
          const weights = layer.getWeights()
          const convFn = layer.name.endsWith('_gn')
            ? gnConvByOutputChannelAndInputSlicing
            : convByOutputChannelAndInputSlicing
          nextTensor = await convFn(
            currentTensor,
            weights[0],
            weights[1],
            (layer as any).strides,
            (layer as any).padding,
            (layer as any).dilationRate,
            3
          )
        } else {
          nextTensor = tf.tidy(() => {
            let result = layer.apply(currentTensor) as tf.Tensor
            if (layer.name.endsWith('_gn')) {
              result = layerNormInPlace(result)
            }
            return result
          })
        }

        currentTensor.dispose()
        currentTensor = nextTensor
      } catch (err) {
        currentTensor.dispose()
        throw new Error(`Inference failed at layer ${i}: ${err instanceof Error ? err.message : String(err)}`)
      }

      // Sync GPU periodically to prevent timeout and update progress
      if (i % syncEvery === 0) {
        const firstEl = currentTensor.slice(
          Array(currentTensor.shape.length).fill(0),
          Array(currentTensor.shape.length).fill(1)
        )
        await firstEl.data()
        firstEl.dispose()
      }

      const progress = 10 + Math.floor((i / loopEnd) * 70)
      onProgress?.(progress, `Layer ${i}/${loopEnd}`)
      // Yield to event loop so React can render progress updates
      await new Promise(resolve => setTimeout(resolve, 0))
      console.log(`[InferenceEngine] Layer ${i} output shape:`, currentTensor.shape)
    }

    // 6. Final layer processing
    onProgress?.(85, 'Processing final layer')
    let outLabelVolume: tf.Tensor3D

    if (modelInfo.enableSeqConv) {
      console.log('[InferenceEngine] Using SequentialConvLayer for final layer')
      outLabelVolume = await sequentialConvLayerApply(currentTensor, model, isChannelLast, onProgress)
      currentTensor.dispose()
    } else {
      console.log('[InferenceEngine] Using argMax for final layer')
      outLabelVolume = tf.tidy(() => {
        const axis = isChannelLast ? -1 : 1
        const argmax = tf.argMax(currentTensor, axis)
        return tf.squeeze(argmax) as tf.Tensor3D
      })
      currentTensor.dispose()
    }

    console.log('[InferenceEngine] Output label shape:', outLabelVolume.shape)

    // 7. Transpose back if needed
    if (modelInfo.enableTranspose) {
      const transposed = outLabelVolume.transpose() as tf.Tensor3D
      outLabelVolume.dispose()
      outLabelVolume = transposed
      console.log('[InferenceEngine] Output transposed back')
    }

    // 8. Restore to 256^3
    onProgress?.(95, 'Restoring to full volume')
    const restored = await restoreTo256Cube(outLabelVolume, corner)
    outLabelVolume.dispose()

    console.log('[InferenceEngine] Restored shape:', restored.shape)
    onProgress?.(100, 'Inference complete')

    return restored
  }

  getMemoryStats() {
    const memory = tf.memory()
    return {
      numTensors: memory.numTensors,
      numBytes: memory.numBytes,
      numActiveSessions: 0
    }
  }

  dispose(): void {
    // No persistent state to dispose
  }
}

// --- Utility functions ported from brainchop's tensor-utils.js ---

async function applyMriThreshold(tensor: tf.Tensor3D, percentage: number): Promise<tf.Tensor3D> {
  const maxTensor = tensor.max()
  const thresholdTensor = maxTensor.mul(percentage)
  const threshold = await thresholdTensor.data()
  maxTensor.dispose()
  thresholdTensor.dispose()
  return tf.tidy(() => {
    return tensor.greater(threshold[0]).asType('bool') as tf.Tensor3D
  })
}

async function firstLastNonZero(tensor3D: tf.Tensor3D, dim: number): Promise<[number, number]> {
  let mxs: number[]
  if (dim === 0) {
    mxs = await (tensor3D.max(2).max(1) as tf.Tensor).arraySync() as number[]
  } else if (dim === 1) {
    mxs = await (tensor3D.max(2).max(0) as tf.Tensor).arraySync() as number[]
  } else {
    mxs = await (tensor3D.max(1).max(0) as tf.Tensor).arraySync() as number[]
  }
  let mn = mxs.length
  let mx = 0
  for (let i = 0; i < mxs.length; i++) {
    if (mxs[i] > 0) { mn = i; break }
  }
  for (let i = mxs.length - 1; i >= 0; i--) {
    if (mxs[i] > 0) { mx = i; break }
  }
  return [mn, mx]
}

async function firstLastNonZero3D(tensor3D: tf.Tensor3D): Promise<number[]> {
  const [row_min, row_max] = await firstLastNonZero(tensor3D, 0)
  const [col_min, col_max] = await firstLastNonZero(tensor3D, 1)
  const [depth_min, depth_max] = await firstLastNonZero(tensor3D, 2)
  console.log('[InferenceEngine] Bounding box:', { row_min, row_max, col_min, col_max, depth_min, depth_max })
  return [row_min, row_max, col_min, col_max, depth_min, depth_max]
}

async function cropAndGetCorner(
  tensor3d: tf.Tensor3D,
  mask3d: tf.Tensor3D,
  userPadding: number
): Promise<{ cropped: tf.Tensor3D; corner: [number, number, number] }> {
  const [row_min, row_max, col_min, col_max, depth_min, depth_max] = await firstLastNonZero3D(mask3d)

  const adjustCorner = (min: number, max: number, pad: number): [number, number] => {
    const startPad = Math.min(min, pad)
    const endPad = Math.min(255 - max, pad)
    const newStart = Math.max(0, min - startPad)
    const newEnd = Math.min(255, max + endPad)
    return [newStart, newEnd]
  }

  const [safeRowStart, safeRowEnd] = adjustCorner(row_min, row_max, userPadding)
  const [safeColStart, safeColEnd] = adjustCorner(col_min, col_max, userPadding)
  const [safeDepthStart, safeDepthEnd] = adjustCorner(depth_min, depth_max, userPadding)

  const cropped = tensor3d.slice(
    [safeRowStart, safeColStart, safeDepthStart],
    [safeRowEnd - safeRowStart + 1, safeColEnd - safeColStart + 1, safeDepthEnd - safeDepthStart + 1]
  ) as tf.Tensor3D

  return { cropped, corner: [safeRowStart, safeColStart, safeDepthStart] }
}

async function restoreTo256Cube(tensor3d: tf.Tensor3D, corner: [number, number, number]): Promise<tf.Tensor3D> {
  const [row_min, col_min, depth_min] = corner
  const [height, width, depth] = tensor3d.shape

  const paddings: [number, number][] = [
    [row_min, Math.max(0, 256 - height - row_min)],
    [col_min, Math.max(0, 256 - width - col_min)],
    [depth_min, Math.max(0, 256 - depth - depth_min)]
  ]

  return tensor3d.pad(paddings) as tf.Tensor3D
}

function isModelChnlLast(modelObj: tf.LayersModel): boolean {
  for (let layerIdx = 0; layerIdx < modelObj.layers.length; layerIdx++) {
    const layer = (modelObj as any).layersByDepth?.[layerIdx]?.[0]
    if (layer?.dataFormat) {
      return layer.dataFormat === 'channelsLast'
    }
  }
  return true // default to channels last
}

function layerNormInPlace(x: tf.Tensor, epsilon = 1e-5): tf.Tensor {
  return tf.tidy(() => {
    const { mean, variance } = tf.moments(x, [1, 2, 3], true)
    const invStd = tf.rsqrt(tf.add(variance, epsilon))
    return tf.mul(tf.sub(x, mean), invStd)
  })
}

function instanceNorm(x: tf.Tensor, epsilon = 1e-5): tf.Tensor {
  return tf.tidy(() => {
    const { mean, variance } = tf.moments(x, [1, 2, 3], true)
    const invStd = tf.rsqrt(variance.add(epsilon))
    return x.sub(mean).mul(invStd)
  })
}

async function convByOutputChannelAndInputSlicing(
  input: tf.Tensor,
  filter: tf.Tensor,
  biases: tf.Tensor | undefined,
  stride: number[],
  pad: string,
  dilationRate: number[],
  sliceSize: number
): Promise<tf.Tensor> {
  const inChannels = input.shape[4]!
  const outChannels = filter.shape[4]!
  let outputChannels: tf.Tensor | null = null

  for (let channel = 0; channel < outChannels; channel++) {
    const numSlices = Math.ceil(inChannels / sliceSize)
    let outputChannel: tf.Tensor | null = null

    for (let i = 0; i < numSlices; i++) {
      const startChannel = i * sliceSize
      const endChannel = Math.min((i + 1) * sliceSize, inChannels)
      if (startChannel < inChannels) {
        const resultSlice = tf.tidy(() => {
          const inputSlice = input.slice([0, 0, 0, 0, startChannel], [-1, -1, -1, -1, endChannel - startChannel])
          const filterSlice = filter.slice([0, 0, 0, startChannel, channel], [-1, -1, -1, endChannel - startChannel, 1])
          return tf.conv3d(inputSlice as tf.Tensor5D, filterSlice as tf.Tensor5D, stride as any, pad as any, 'NDHWC', dilationRate as any)
        })
        if (outputChannel === null) {
          outputChannel = resultSlice
        } else {
          const updated = outputChannel.add(resultSlice)
          outputChannel.dispose()
          resultSlice.dispose()
          outputChannel = updated
        }
      }
    }

    let biasedOutputChannel: tf.Tensor
    if (biases) {
      const biasesSlice = biases.slice([channel], [1])
      biasedOutputChannel = outputChannel!.add(biasesSlice)
      outputChannel!.dispose()
      biasesSlice.dispose()
    } else {
      biasedOutputChannel = outputChannel!
    }

    if (outputChannels === null) {
      outputChannels = biasedOutputChannel
    } else {
      const updated = await tf.concat([outputChannels, biasedOutputChannel], 4)
      biasedOutputChannel.dispose()
      outputChannels.dispose()
      outputChannels = updated
    }
  }

  return outputChannels!
}

async function gnConvByOutputChannelAndInputSlicing(
  input: tf.Tensor,
  filter: tf.Tensor,
  biases: tf.Tensor | undefined,
  stride: number[],
  pad: string,
  dilationRate: number[],
  sliceSize: number
): Promise<tf.Tensor> {
  const inChannels = input.shape[4]!
  const outChannels = filter.shape[4]!
  let outputChannels: tf.Tensor | null = null

  for (let channel = 0; channel < outChannels; channel++) {
    const numSlices = Math.ceil(inChannels / sliceSize)
    let outputChannel: tf.Tensor | null = null

    for (let i = 0; i < numSlices; i++) {
      const startChannel = i * sliceSize
      const endChannel = Math.min((i + 1) * sliceSize, inChannels)
      if (startChannel < inChannels) {
        const resultSlice = tf.tidy(() => {
          const inputSlice = input.slice([0, 0, 0, 0, startChannel], [-1, -1, -1, -1, endChannel - startChannel])
          const filterSlice = filter.slice([0, 0, 0, startChannel, channel], [-1, -1, -1, endChannel - startChannel, 1])
          return tf.conv3d(inputSlice as tf.Tensor5D, filterSlice as tf.Tensor5D, stride as any, pad as any, 'NDHWC', dilationRate as any)
        })
        if (outputChannel === null) {
          outputChannel = resultSlice
        } else {
          const updated = outputChannel.add(resultSlice)
          outputChannel.dispose()
          resultSlice.dispose()
          outputChannel = updated
        }
      }
    }

    let biasedOutputChannel: tf.Tensor
    if (biases) {
      const biasesSlice = biases.slice([channel], [1])
      biasedOutputChannel = outputChannel!.add(biasesSlice)
      outputChannel!.dispose()
      biasesSlice.dispose()
    } else {
      biasedOutputChannel = outputChannel!
    }

    const normalizedChannel = instanceNorm(biasedOutputChannel)
    biasedOutputChannel.dispose()

    if (outputChannels === null) {
      outputChannels = normalizedChannel
    } else {
      const updated = await tf.concat([outputChannels, normalizedChannel], 4)
      normalizedChannel.dispose()
      outputChannels.dispose()
      outputChannels = updated
    }
  }

  return outputChannels!
}

function processTensorInChunks(inputTensor: tf.Tensor, filterWeights: tf.Tensor, chunkSize: number): tf.Tensor {
  const inChannels = inputTensor.shape[4]!
  const numSlices = Math.ceil(inChannels / chunkSize)
  let accumulatedResult: tf.Tensor | null = null

  for (let i = 0; i < numSlices; i++) {
    const startChannel = i * chunkSize
    const endChannel = Math.min((i + 1) * chunkSize, inChannels)
    const channels = endChannel - startChannel

    const inputSlice = tf.tidy(() => inputTensor.slice([0, 0, 0, 0, startChannel], [-1, -1, -1, -1, channels]))
    const filterSlice = tf.tidy(() => filterWeights.slice([0, 0, 0, startChannel, 0], [-1, -1, -1, channels, -1]))

    const resultSlice = tf.conv3d(inputSlice as tf.Tensor5D, filterSlice as tf.Tensor5D, 1, 'valid', 'NDHWC', 1)
    inputSlice.dispose()
    filterSlice.dispose()

    const squeezed = tf.squeeze(resultSlice)
    resultSlice.dispose()

    if (accumulatedResult === null) {
      accumulatedResult = squeezed
    } else {
      const newResult = accumulatedResult.add(squeezed)
      accumulatedResult.dispose()
      squeezed.dispose()
      accumulatedResult = newResult
    }
  }

  return accumulatedResult!
}

async function sequentialConvLayerApply(
  inputTensor: tf.Tensor,
  model: tf.LayersModel,
  isChannelLast: boolean,
  onProgress?: (progress: number, status?: string) => void
): Promise<tf.Tensor3D> {
  const convLayer = model.layers[model.layers.length - 1]
  const weights = convLayer.getWeights()[0]
  const biases = convLayer.getWeights()[1]
  const outChannels = weights.shape[4]!

  const outputShape = isChannelLast
    ? (inputTensor.shape as number[]).slice(1, -1)
    : (inputTensor.shape as number[]).slice(2)

  let outB = tf.mul(tf.ones(outputShape), -10000)
  let outC = tf.zeros(outputShape)

  const CHUNK_SIZE = 3
  const chunks = Math.ceil(outChannels / CHUNK_SIZE)

  for (let chunk = 0; chunk < chunks; chunk++) {
    const startIdx = chunk * CHUNK_SIZE
    const endIdx = Math.min((chunk + 1) * CHUNK_SIZE, outChannels)

    const [newOutB, newOutC] = tf.tidy(() => {
      let currentOutB = outB
      let currentOutC = outC

      for (let chIdx = startIdx; chIdx < endIdx; chIdx++) {
        const filterWeights = weights.slice([0, 0, 0, 0, chIdx], [-1, -1, -1, -1, 1])
        const filterBiases = biases.slice([chIdx], [1])

        const outA = processTensorInChunks(
          inputTensor,
          filterWeights,
          Math.min(10, outChannels)
        ).add(filterBiases) as tf.Tensor

        const greater = tf.greater(outA, currentOutB)
        currentOutB = tf.where(greater, outA, currentOutB)
        currentOutC = tf.where(greater, tf.fill(currentOutC.shape, chIdx), currentOutC)
      }

      return [currentOutB, currentOutC] as [tf.Tensor, tf.Tensor]
    })

    tf.dispose([outB, outC])
    outB = newOutB
    outC = newOutC

    const progress = 85 + Math.floor(((chunk + 1) / chunks) * 10)
    onProgress?.(progress, `Final layer chunk ${chunk + 1}/${chunks}`)

    // Allow UI update
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  const result = outC.clone() as tf.Tensor3D
  tf.dispose([outB, outC])

  return result
}

export const inferenceEngine = new InferenceEngine()
