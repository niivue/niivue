/**
 * Brainchop Web Worker
 *
 * Runs TensorFlow.js inference off the main thread so the UI stays responsive.
 * The main thread sends volume data + model artifacts; this worker reconstructs
 * the model, runs the full inference pipeline, and returns label data.
 */

import * as tf from '@tensorflow/tfjs'
import type { ModelInfo } from './types.js'
import { keepLargestClusterPerClass } from './postprocess.js'

// ── Message protocol ────────────────────────────────────────────────────────

interface InitMessage {
  type: 'init'
}

interface RunMessage {
  type: 'run'
  volumeData: Float32Array
  modelTopology: object
  weightSpecs: tf.io.WeightsManifestEntry[]
  weightData: ArrayBuffer
  modelInfo: ModelInfo
}

type IncomingMessage = InitMessage | RunMessage

interface ReadyMessage {
  type: 'ready'
  backend: string
}

interface ProgressMessage {
  type: 'progress'
  progress: number
  status: string
}

interface ResultMessage {
  type: 'result'
  labelData: Float32Array
}

interface ErrorMessage {
  type: 'error'
  message: string
}

type OutgoingMessage = ReadyMessage | ProgressMessage | ResultMessage | ErrorMessage

function post(msg: OutgoingMessage, transfer?: Transferable[]): void {
  if (transfer) {
    ;(self as unknown as Worker).postMessage(msg, transfer)
  } else {
    ;(self as unknown as Worker).postMessage(msg)
  }
}

function progress(pct: number, status: string): void {
  post({ type: 'progress', progress: pct, status })
}

// ── TF.js initialization ────────────────────────────────────────────────────

async function initBackend(): Promise<string> {
  // Try WebGL first (works in workers via OffscreenCanvas in Chromium)
  try {
    await tf.setBackend('webgl')
    await tf.ready()
    tf.env().set('WEBGL_PACK', true)
    tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0)
    console.log('[Worker] WebGL backend initialized')
    return 'webgl'
  } catch (e) {
    console.warn('[Worker] WebGL not available in worker:', e)
  }

  // Fallback to CPU
  await tf.setBackend('cpu')
  await tf.ready()
  console.log('[Worker] CPU backend initialized')
  return 'cpu'
}

// ── Inference pipeline (ported from InferenceEngine.ts) ─────────────────────

async function runInferencePipeline(
  volumeData: Float32Array,
  model: tf.LayersModel,
  modelInfo: ModelInfo
): Promise<Float32Array> {
  // 1. Create 3D tensor
  progress(5, 'Creating volume tensor')
  let slices3d: tf.Tensor3D
  if (volumeData.length === 256 * 256 * 256) {
    slices3d = tf.tensor3d(Array.from(volumeData), [256, 256, 256])
  } else {
    throw new Error(`Expected 256^3 volume (${256 ** 3} voxels), got ${volumeData.length}`)
  }

  // 2. Normalize
  progress(8, 'Normalizing')
  let normalized: tf.Tensor3D
  if (modelInfo.enableQuantileNorm) {
    normalized = await quantileNormalize(slices3d)
  } else {
    normalized = await minMaxNormalize(slices3d)
  }
  slices3d.dispose()

  // 3. Create brain mask and crop
  progress(12, 'Cropping to brain region')
  let mask3d: tf.Tensor3D
  if (modelInfo.autoThreshold > 0) {
    mask3d = await applyMriThreshold(normalized, modelInfo.autoThreshold)
  } else {
    mask3d = normalized.greater([0]).asType('bool') as tf.Tensor3D
  }

  const { cropped, corner } = await cropAndGetCorner(normalized, mask3d, modelInfo.cropPadding)
  mask3d.dispose()
  normalized.dispose()

  let croppedInput = cropped
  if (modelInfo.enableTranspose) {
    croppedInput = cropped.transpose() as tf.Tensor3D
    cropped.dispose()
  }
  console.log('[Worker] Cropped shape:', croppedInput.shape)

  // 4. Channel ordering
  const isChannelLast = isModelChnlLast(model)
  console.log('[Worker] Channel-last:', isChannelLast)

  // 5. Adjust model input shape to match cropped volume
  if (isChannelLast) {
    model.layers[0].batchInputShape[1] = croppedInput.shape[0]
    model.layers[0].batchInputShape[2] = croppedInput.shape[1]
    model.layers[0].batchInputShape[3] = croppedInput.shape[2]
  } else {
    model.layers[0].batchInputShape[2] = croppedInput.shape[0]
    model.layers[0].batchInputShape[3] = croppedInput.shape[1]
    model.layers[0].batchInputShape[4] = croppedInput.shape[2]
  }

  // 6. Reshape to 5D
  let inputShape: number[]
  if (isChannelLast) {
    inputShape = [1, croppedInput.shape[0], croppedInput.shape[1], croppedInput.shape[2], 1]
  } else {
    inputShape = [1, 1, croppedInput.shape[0], croppedInput.shape[1], croppedInput.shape[2]]
  }
  let currentTensor: tf.Tensor = croppedInput.reshape(inputShape)
  croppedInput.dispose()

  // 7. Layer-by-layer inference
  const layersLength = model.layers.length
  const loopEnd = modelInfo.enableSeqConv ? layersLength - 2 : layersLength - 1
  const syncEvery = modelInfo.enableSeqConv ? 1 : 15

  console.log(`[Worker] Running ${layersLength} layers (loopEnd=${loopEnd}, seqConv=${modelInfo.enableSeqConv})`)

  for (let i = 1; i <= loopEnd; i++) {
    try {
      let nextTensor: tf.Tensor
      const layer = model.layers[i]

      if (modelInfo.enableSeqConv && (layer as any).activation?.getClassName() === 'linear') {
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

    // Sync GPU periodically
    if (i % syncEvery === 0) {
      const firstEl = currentTensor.slice(
        Array(currentTensor.shape.length).fill(0),
        Array(currentTensor.shape.length).fill(1)
      )
      await firstEl.data()
      firstEl.dispose()
    }

    const pct = 15 + Math.floor((i / loopEnd) * 65)
    progress(pct, `Layer ${i}/${loopEnd}`)
  }

  // 8. Final layer
  progress(82, 'Processing final layer')
  let outLabelVolume: tf.Tensor3D

  if (modelInfo.enableSeqConv) {
    outLabelVolume = await sequentialConvLayerApply(currentTensor, model, isChannelLast)
    currentTensor.dispose()
  } else {
    outLabelVolume = tf.tidy(() => {
      const axis = isChannelLast ? -1 : 1
      const argmax = tf.argMax(currentTensor, axis)
      return tf.squeeze(argmax) as tf.Tensor3D
    })
    currentTensor.dispose()
  }

  // 9. Transpose back
  if (modelInfo.enableTranspose) {
    const transposed = outLabelVolume.transpose() as tf.Tensor3D
    outLabelVolume.dispose()
    outLabelVolume = transposed
  }

  // 10. Restore to 256^3
  progress(94, 'Restoring to full volume')
  const restored = await restoreTo256Cube(outLabelVolume, corner)
  outLabelVolume.dispose()

  const result = new Float32Array(await restored.data())
  restored.dispose()

  // Remove small disconnected clusters (skull fragments, meninges)
  const uint8Labels = new Uint8Array(result.length)
  for (let i = 0; i < result.length; i++) {
    uint8Labels[i] = Math.round(result[i])
  }
  keepLargestClusterPerClass(uint8Labels, [256, 256, 256])
  for (let i = 0; i < result.length; i++) {
    result[i] = uint8Labels[i]
  }

  progress(100, 'Inference complete')
  return result
}

// ── Utility functions (from InferenceEngine.ts) ─────────────────────────────

async function minMaxNormalize(tensor: tf.Tensor3D): Promise<tf.Tensor3D> {
  const max = tensor.max()
  const min = tensor.min()
  const result = tensor.sub(min).div(max.sub(min)) as tf.Tensor3D
  max.dispose()
  min.dispose()
  return result
}

async function quantileNormalize(tensor: tf.Tensor3D, lower = 0.05, upper = 0.95): Promise<tf.Tensor3D> {
  const flatArray = (await tensor.flatten().array()) as number[]
  flatArray.sort((a, b) => a - b)
  const lowIdx = Math.floor(flatArray.length * lower)
  const highIdx = Math.ceil(flatArray.length * upper) - 1
  const qmin = flatArray[lowIdx]
  const qmax = flatArray[highIdx]
  const qminScalar = tf.scalar(qmin)
  const qmaxScalar = tf.scalar(qmax)
  const result = tensor.sub(qminScalar).div(qmaxScalar.sub(qminScalar)) as tf.Tensor3D
  qminScalar.dispose()
  qmaxScalar.dispose()
  return result
}

async function applyMriThreshold(tensor: tf.Tensor3D, percentage: number): Promise<tf.Tensor3D> {
  const maxTensor = tensor.max()
  const thresholdTensor = maxTensor.mul(percentage)
  const threshold = await thresholdTensor.data()
  maxTensor.dispose()
  thresholdTensor.dispose()
  return tf.tidy(() => tensor.greater(threshold[0]).asType('bool') as tf.Tensor3D)
}

async function firstLastNonZero(tensor3D: tf.Tensor3D, dim: number): Promise<[number, number]> {
  let mxs: number[]
  if (dim === 0) {
    mxs = (await (tensor3D.max(2).max(1) as tf.Tensor).arraySync()) as number[]
  } else if (dim === 1) {
    mxs = (await (tensor3D.max(2).max(0) as tf.Tensor).arraySync()) as number[]
  } else {
    mxs = (await (tensor3D.max(1).max(0) as tf.Tensor).arraySync()) as number[]
  }
  let mn = mxs.length
  let mx = 0
  for (let i = 0; i < mxs.length; i++) {
    if (mxs[i] > 0) {
      mn = i
      break
    }
  }
  for (let i = mxs.length - 1; i >= 0; i--) {
    if (mxs[i] > 0) {
      mx = i
      break
    }
  }
  return [mn, mx]
}

async function firstLastNonZero3D(tensor3D: tf.Tensor3D): Promise<number[]> {
  const [row_min, row_max] = await firstLastNonZero(tensor3D, 0)
  const [col_min, col_max] = await firstLastNonZero(tensor3D, 1)
  const [depth_min, depth_max] = await firstLastNonZero(tensor3D, 2)
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

async function restoreTo256Cube(
  tensor3d: tf.Tensor3D,
  corner: [number, number, number]
): Promise<tf.Tensor3D> {
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
  return true
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
          return tf.conv3d(
            inputSlice as tf.Tensor5D,
            filterSlice as tf.Tensor5D,
            stride as any,
            pad as any,
            'NDHWC',
            dilationRate as any
          )
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
          return tf.conv3d(
            inputSlice as tf.Tensor5D,
            filterSlice as tf.Tensor5D,
            stride as any,
            pad as any,
            'NDHWC',
            dilationRate as any
          )
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

function processTensorInChunks(
  inputTensor: tf.Tensor,
  filterWeights: tf.Tensor,
  chunkSize: number
): tf.Tensor {
  const inChannels = inputTensor.shape[4]!
  const numSlices = Math.ceil(inChannels / chunkSize)
  let accumulatedResult: tf.Tensor | null = null

  for (let i = 0; i < numSlices; i++) {
    const startChannel = i * chunkSize
    const endChannel = Math.min((i + 1) * chunkSize, inChannels)
    const channels = endChannel - startChannel

    const inputSlice = tf.tidy(() =>
      inputTensor.slice([0, 0, 0, 0, startChannel], [-1, -1, -1, -1, channels])
    )
    const filterSlice = tf.tidy(() =>
      filterWeights.slice([0, 0, 0, startChannel, 0], [-1, -1, -1, channels, -1])
    )

    const resultSlice = tf.conv3d(
      inputSlice as tf.Tensor5D,
      filterSlice as tf.Tensor5D,
      1,
      'valid',
      'NDHWC',
      1
    )
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
  isChannelLast: boolean
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

    const pct = 82 + Math.floor(((chunk + 1) / chunks) * 10)
    progress(pct, `Final layer chunk ${chunk + 1}/${chunks}`)

    // Allow event loop to process
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const result = outC.clone() as tf.Tensor3D
  tf.dispose([outB, outC])
  return result
}

// ── Message handler ─────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data

  try {
    if (msg.type === 'init') {
      const backend = await initBackend()
      post({ type: 'ready', backend })
    } else if (msg.type === 'run') {
      progress(0, 'Reconstructing model')

      // Reconstruct model from artifacts
      const model = await tf.loadLayersModel(
        tf.io.fromMemory({
          modelTopology: msg.modelTopology,
          weightSpecs: msg.weightSpecs,
          weightData: msg.weightData
        })
      )

      console.log('[Worker] Model reconstructed, input:', model.inputs[0].shape)

      // Run full pipeline
      const labelData = await runInferencePipeline(msg.volumeData, model, msg.modelInfo)

      // Clean up model
      model.dispose()

      // Transfer result (zero-copy)
      post({ type: 'result', labelData }, [labelData.buffer])
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Worker] Error:', message)
    post({ type: 'error', message })
  }
}
