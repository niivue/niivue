import * as tf from '@tensorflow/tfjs'
import type { ModelInfo, ModelType, ModelCategory } from './types.js'

// Default colors for auto-generated colormaps (distinguishable, colorblind-friendly subset)
const DEFAULT_COLORS: [number, number, number][] = [
  [0, 0, 0],       // background (always black/transparent)
  [255, 0, 0],     // red
  [0, 128, 0],     // green
  [0, 0, 255],     // blue
  [255, 165, 0],   // orange
  [128, 0, 128],   // purple
  [0, 200, 200],   // cyan
  [255, 255, 0],   // yellow
  [255, 105, 180], // pink
  [139, 69, 19],   // brown
  [0, 255, 127],   // spring green
  [70, 130, 180],  // steel blue
]

/**
 * Parsed .bcmodel header
 */
export interface BcmodelHeader {
  bcmodel_version: string
  metadata: {
    name: string
    description?: string
    type: string
    source_framework?: string
  }
  input: {
    shape: number[]
    dtype: string
    data_layout: string
  }
  output: {
    num_classes: number
    data_layout: string
  }
  graph: Array<{
    id: string
    op: string
    params: Record<string, unknown>
    inputs: string[]
  }>
  tensors: Record<string, {
    dtype: string
    shape: number[]
    data_offsets: [number, number]
  }>
  inference?: {
    enable_seq_conv?: boolean
    crop_padding?: number
    auto_threshold?: number
    enable_quantile_norm?: boolean
    enable_transpose?: boolean
  }
  performance?: {
    estimated_time_seconds?: number
    memory_requirement_mb?: number
  }
  labels?: Array<{
    index: number
    name: string
    color: [number, number, number]
  }>
}

/**
 * Parsed tensor data from .bcmodel
 */
export interface BcmodelTensors {
  [name: string]: { data: Float32Array; shape: number[] }
}

/**
 * NiiVue ColorMap format: parallel arrays for R, G, B + label strings.
 */
export interface ColormapData {
  R: number[]
  G: number[]
  B: number[]
  labels: string[]
}

/**
 * Static label cache — stores extracted labels when a .bcmodel is loaded.
 * Keyed by model path so segmentation handler can retrieve them.
 */
const labelCache = new Map<string, ColormapData>()

export function getCachedLabels(modelPath: string): ColormapData | undefined {
  return labelCache.get(modelPath)
}

export function clearLabelCache(): void {
  labelCache.clear()
}

/**
 * Custom TF.js layer: GroupNorm (affine=false)
 *
 * When num_groups == num_channels, this is instance normalization:
 * each channel is normalized independently over spatial dims [D, H, W].
 * No learnable parameters (affine=false).
 */
class GroupNormLayer extends tf.layers.Layer {
  static readonly className = 'GroupNorm'
  private numGroups: number

  constructor(config: Record<string, unknown>) {
    super(config as unknown as tf.serialization.ConfigDict)
    this.numGroups = (config.numGroups as number) || 1
  }

  call(inputs: tf.Tensor | tf.Tensor[]): tf.Tensor {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs
      // shape: [B, D, H, W, C] channels-last
      // Normalize each channel over spatial dims [1, 2, 3]
      const { mean, variance } = tf.moments(x, [1, 2, 3], true)
      return tf.mul(tf.sub(x, mean), tf.rsqrt(tf.add(variance, 1e-5)))
    })
  }

  computeOutputShape(inputShape: tf.Shape): tf.Shape {
    return inputShape
  }

  getConfig(): tf.serialization.ConfigDict {
    return { ...super.getConfig(), numGroups: this.numGroups }
  }
}
tf.serialization.registerClass(GroupNormLayer)

/**
 * Custom TF.js layer: BatchNorm3d (affine=false, no running stats)
 *
 * At inference without stored running stats, computes normalization
 * on-the-fly per sample over spatial dims — equivalent to instance norm.
 * No learnable parameters.
 */
class BatchNorm3dLayer extends tf.layers.Layer {
  static readonly className = 'BatchNorm3d'

  constructor(config: Record<string, unknown>) {
    super(config as unknown as tf.serialization.ConfigDict)
  }

  call(inputs: tf.Tensor | tf.Tensor[]): tf.Tensor {
    return tf.tidy(() => {
      const x = Array.isArray(inputs) ? inputs[0] : inputs
      // shape: [B, D, H, W, C] channels-last
      // Normalize each channel over spatial dims [1, 2, 3]
      const { mean, variance } = tf.moments(x, [1, 2, 3], true)
      return tf.mul(tf.sub(x, mean), tf.rsqrt(tf.add(variance, 1e-5)))
    })
  }

  computeOutputShape(inputShape: tf.Shape): tf.Shape {
    return inputShape
  }
}
tf.serialization.registerClass(BatchNorm3dLayer)

/**
 * Check if a model path points to a .bcmodel file.
 */
export function isBcmodelPath(modelPath: string): boolean {
  return modelPath.endsWith('.bcmodel')
}

/**
 * Parse a .bcmodel ArrayBuffer into header and tensors.
 */
export function parseBcmodelBuffer(buffer: ArrayBuffer): { header: BcmodelHeader; tensors: BcmodelTensors } {
  const view = new DataView(buffer)

  // Read header size (uint64 LE — use lower 32 bits)
  const headerSize = view.getUint32(0, true)
  if (view.getUint32(4, true) !== 0) {
    throw new Error('.bcmodel header size exceeds 4GB — unsupported')
  }

  // Parse JSON header
  const headerBytes = new Uint8Array(buffer, 8, headerSize)
  const headerString = new TextDecoder().decode(headerBytes)
  const header: BcmodelHeader = JSON.parse(headerString)

  if (!header.bcmodel_version) {
    throw new Error('Not a valid .bcmodel file: missing bcmodel_version')
  }

  // Extract tensors from binary data section
  // Note: dataOffset may not be 4-byte aligned (JSON header can have any length),
  // so we copy tensor bytes to aligned buffers instead of creating views
  const dataOffset = 8 + headerSize
  const tensors: BcmodelTensors = {}

  for (const [name, info] of Object.entries(header.tensors)) {
    const [begin, end] = info.data_offsets
    const byteLength = end - begin
    const src = new Uint8Array(buffer, dataOffset + begin, byteLength)
    const aligned = new ArrayBuffer(byteLength)
    new Uint8Array(aligned).set(src)
    tensors[name] = { data: new Float32Array(aligned), shape: info.shape }
  }

  return { header, tensors }
}

/**
 * Transpose a 5D conv kernel from channels-first to channels-last.
 * [O, I, D, H, W] → [D, H, W, I, O]
 */
function transposeConvKernel(data: Float32Array, shape: number[]): { data: Float32Array; shape: number[] } {
  const [O, I, D, H, W] = shape
  const newShape = [D, H, W, I, O]
  const result = new Float32Array(data.length)

  for (let o = 0; o < O; o++) {
    for (let i = 0; i < I; i++) {
      for (let d = 0; d < D; d++) {
        for (let h = 0; h < H; h++) {
          for (let w = 0; w < W; w++) {
            const srcIdx = ((((o * I + i) * D + d) * H + h) * W + w)
            const dstIdx = ((((d * H + h) * W + w) * I + i) * O + o)
            result[dstIdx] = data[srcIdx]
          }
        }
      }
    }
  }

  return { data: result, shape: newShape }
}

/**
 * Convert .bcmodel graph + tensors to TF.js ModelArtifacts.
 *
 * Builds a Keras Functional model topology from the .bcmodel graph,
 * transposes weight data from channels-first to channels-last,
 * and returns artifacts compatible with tf.loadLayersModel().
 */
export function bcmodelToArtifacts(
  header: BcmodelHeader,
  tensors: BcmodelTensors
): tf.io.ModelArtifacts {
  const { kerasLayers, outputLayerName } = buildKerasTopology(header)
  const { weightSpecs, weightData } = buildWeights(header, tensors)

  const modelTopology = {
    keras_version: '2.7.0',
    backend: 'tensorflow',
    model_config: {
      class_name: 'Functional',
      config: {
        name: 'model',
        layers: kerasLayers,
        input_layers: [['input', 0, 0]],
        output_layers: [[outputLayerName, 0, 0]]
      }
    }
  }

  return {
    modelTopology,
    weightSpecs,
    weightData,
    format: 'layers-model',
    generatedBy: 'BcmodelBuilder',
    convertedBy: 'niivue-desktop'
  }
}

/**
 * Build Keras-compatible layer topology from .bcmodel graph.
 */
function buildKerasTopology(header: BcmodelHeader): {
  kerasLayers: Record<string, unknown>[]
  outputLayerName: string
} {
  const graph = header.graph
  const inputShape = header.input.shape // [N, C, D, H, W] channels-first
  const kerasLayers: Record<string, unknown>[] = []

  // Input layer — channels-last: [N, D, H, W, C]
  kerasLayers.push({
    class_name: 'InputLayer',
    config: {
      batch_input_shape: [null, inputShape[2], inputShape[3], inputShape[4], inputShape[1]],
      dtype: 'float32',
      sparse: false,
      ragged: false,
      name: 'input'
    },
    name: 'input',
    inbound_nodes: []
  })

  // Map .bcmodel node IDs to Keras layer names
  // (some ops like dropout are skipped, so we need to track the pass-through)
  const nodeToKerasName: Record<string, string> = {}

  // The first graph node takes input from the InputLayer
  // For nodes with inputs: [], their Keras input is 'input'

  let outputLayerName = 'input'

  for (const node of graph) {
    const { id, op, params, inputs } = node

    // Resolve Keras input layer name(s)
    const kerasInputs = inputs.length === 0
      ? ['input']
      : inputs.map(inp => nodeToKerasName[inp] || inp)

    if (op === 'conv3d') {
      const p = params as {
        in_channels: number
        out_channels: number
        kernel_size: number
        padding: number
        dilation: number
        stride: number
        bias: boolean
      }

      kerasLayers.push({
        class_name: 'Conv3D',
        config: {
          name: id,
          trainable: false,
          dtype: 'float32',
          filters: p.out_channels,
          kernel_size: [p.kernel_size, p.kernel_size, p.kernel_size],
          strides: [p.stride || 1, p.stride || 1, p.stride || 1],
          padding: 'same',
          data_format: 'channels_last',
          dilation_rate: [p.dilation || 1, p.dilation || 1, p.dilation || 1],
          groups: 1,
          activation: 'linear',
          use_bias: p.bias !== false,
          kernel_initializer: { class_name: 'Zeros', config: {} },
          bias_initializer: { class_name: 'Zeros', config: {} },
          kernel_regularizer: null,
          bias_regularizer: null,
          activity_regularizer: null,
          kernel_constraint: null,
          bias_constraint: null
        },
        name: id,
        inbound_nodes: [[[kerasInputs[0], 0, 0, {}]]]
      })

      nodeToKerasName[id] = id
      outputLayerName = id

    } else if (op === 'relu' || op === 'elu' || op === 'gelu' || op === 'sigmoid') {
      kerasLayers.push({
        class_name: 'Activation',
        config: {
          name: id,
          trainable: false,
          dtype: 'float32',
          activation: op
        },
        name: id,
        inbound_nodes: [[[kerasInputs[0], 0, 0, {}]]]
      })

      nodeToKerasName[id] = id
      outputLayerName = id

    } else if (op === 'group_norm') {
      const p = params as { num_groups?: number }
      kerasLayers.push({
        class_name: 'GroupNorm',
        config: {
          name: id,
          trainable: false,
          dtype: 'float32',
          numGroups: p.num_groups || 1
        },
        name: id,
        inbound_nodes: [[[kerasInputs[0], 0, 0, {}]]]
      })

      nodeToKerasName[id] = id
      outputLayerName = id

    } else if (op === 'batch_norm3d') {
      kerasLayers.push({
        class_name: 'BatchNorm3d',
        config: {
          name: id,
          trainable: false,
          dtype: 'float32'
        },
        name: id,
        inbound_nodes: [[[kerasInputs[0], 0, 0, {}]]]
      })

      nodeToKerasName[id] = id
      outputLayerName = id

    } else if (op === 'dropout') {
      // Dropout is a no-op at inference — pass through to previous layer
      nodeToKerasName[id] = kerasInputs[0]

    } else if (op === 'softmax') {
      kerasLayers.push({
        class_name: 'Activation',
        config: {
          name: id,
          trainable: false,
          dtype: 'float32',
          activation: 'softmax'
        },
        name: id,
        inbound_nodes: [[[kerasInputs[0], 0, 0, {}]]]
      })

      nodeToKerasName[id] = id
      outputLayerName = id

    } else {
      throw new Error(
        `Unsupported .bcmodel op "${op}" (node "${id}"). ` +
        `Supported ops: conv3d, relu, elu, gelu, sigmoid, softmax, dropout, group_norm, batch_norm3d.`
      )
    }
  }

  return { kerasLayers, outputLayerName }
}

/**
 * Build weight specs and concatenated weight data for TF.js.
 * Transposes conv kernels from channels-first to channels-last.
 */
function buildWeights(
  header: BcmodelHeader,
  tensors: BcmodelTensors
): { weightSpecs: tf.io.WeightsManifestEntry[]; weightData: ArrayBuffer } {
  const weightSpecs: tf.io.WeightsManifestEntry[] = []
  const weightArrays: Float32Array[] = []

  // Walk graph nodes in order, emit weight specs for conv3d nodes
  for (const node of header.graph) {
    if (node.op !== 'conv3d') continue

    const p = node.params as {
      in_channels: number
      out_channels: number
      kernel_size: number
      bias: boolean
    }

    // Kernel weight
    const weightKey = `${node.id}.weight`
    const tensor = tensors[weightKey]
    if (!tensor) {
      throw new Error(`Missing weight tensor: ${weightKey}`)
    }

    // Transpose from [O, I, D, H, W] → [D, H, W, I, O]
    const transposed = transposeConvKernel(tensor.data, tensor.shape)

    weightSpecs.push({
      name: `${node.id}/kernel`,
      shape: transposed.shape,
      dtype: 'float32'
    })
    weightArrays.push(transposed.data)

    // Bias weight (if present)
    if (p.bias !== false) {
      const biasKey = `${node.id}.bias`
      const biasTensor = tensors[biasKey]
      if (biasTensor) {
        weightSpecs.push({
          name: `${node.id}/bias`,
          shape: [p.out_channels],
          dtype: 'float32'
        })
        weightArrays.push(biasTensor.data)
      }
    }
  }

  // Concatenate all weight arrays into a single ArrayBuffer
  const totalBytes = weightArrays.reduce((sum, arr) => sum + arr.byteLength, 0)
  const weightData = new ArrayBuffer(totalBytes)
  const view = new Float32Array(weightData)

  let offset = 0
  for (const arr of weightArrays) {
    view.set(arr, offset)
    offset += arr.length
  }

  return { weightSpecs, weightData }
}

/**
 * Extract ModelInfo from a .bcmodel header.
 */
export function extractModelInfo(header: BcmodelHeader, modelPath: string): ModelInfo {
  const meta = header.metadata
  const inf = header.inference || {}
  const perf = header.performance || {}

  const typeToCategory: Record<string, ModelCategory> = {
    'tissue-segmentation': 'Tissue Segmentation',
    'brain-extraction': 'Brain Extraction',
    'parcellation': 'Regional Parcellation'
  }

  return {
    id: `bcmodel-${modelPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
    name: meta.name,
    type: meta.type as ModelType,
    category: typeToCategory[meta.type] || 'Regional Parcellation',
    description: meta.description || '',
    expectedInputShape: [
      header.input.shape[0],
      header.input.shape[2],
      header.input.shape[3],
      header.input.shape[4]
    ] as [number, number, number, number],
    outputClasses: header.output.num_classes,
    modelPath,
    estimatedTimeSeconds: perf.estimated_time_seconds || 10,
    memoryRequirementMB: perf.memory_requirement_mb || 800,
    enableSeqConv: inf.enable_seq_conv || false,
    cropPadding: inf.crop_padding ?? 18,
    autoThreshold: inf.auto_threshold ?? 0,
    enableQuantileNorm: inf.enable_quantile_norm || false,
    enableTranspose: inf.enable_transpose !== false,
    isBundled: false
  }
}

/**
 * Extract labels from .bcmodel header and convert to NiiVue colormap format.
 * Also caches the result for later retrieval by the segmentation handler.
 */
export function extractLabels(header: BcmodelHeader, modelPath: string): ColormapData | null {
  if (!header.labels || header.labels.length === 0) return null

  // Sort by index to ensure correct ordering
  const sorted = [...header.labels].sort((a, b) => a.index - b.index)

  const colormap: ColormapData = {
    R: sorted.map(l => l.color[0]),
    G: sorted.map(l => l.color[1]),
    B: sorted.map(l => l.color[2]),
    labels: sorted.map(l => l.name)
  }

  // Cache for later retrieval
  labelCache.set(modelPath, colormap)

  return colormap
}

/**
 * Generate a default colormap for models that have no embedded labels or external colormap.
 * Uses model type and output class count to produce a reasonable fallback.
 */
export function generateDefaultColormap(modelInfo: ModelInfo): ColormapData {
  const n = modelInfo.outputClasses

  const R: number[] = []
  const G: number[] = []
  const B: number[] = []
  const labels: string[] = []

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      R.push(0); G.push(0); B.push(0)
      labels.push('background')
    } else if (modelInfo.type === 'brain-extraction') {
      R.push(255); G.push(0); B.push(0)
      labels.push('brain')
    } else if (modelInfo.type === 'tissue-segmentation') {
      const tissueLabels = ['background', 'White Matter', 'Grey Matter']
      const tissueColors: [number, number, number][] = [[0, 0, 0], [255, 255, 255], [205, 62, 78]]
      const [r, g, b] = tissueColors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
      R.push(r); G.push(g); B.push(b)
      labels.push(tissueLabels[i] ?? `class-${i}`)
    } else {
      const [r, g, b] = DEFAULT_COLORS[i % DEFAULT_COLORS.length]
      R.push(r); G.push(g); B.push(b)
      labels.push(`region-${i}`)
    }
  }

  return { R, G, B, labels }
}

/**
 * Resolve colormap labels for a model, trying in order:
 * 1. Embedded .bcmodel labels (cached during model load)
 * 2. External colormap file (colormapPath in model info)
 * 3. Auto-generated fallback based on model type
 */
export async function resolveColormapLabels(modelInfo: ModelInfo): Promise<ColormapData> {
  // 1. Check for cached .bcmodel embedded labels
  const cached = getCachedLabels(modelInfo.modelPath)
  if (cached) {
    console.log('[Colormap] Using embedded .bcmodel labels for:', modelInfo.modelPath)
    return cached
  }

  // 2. Try external colormap file
  if (modelInfo.colormapPath) {
    try {
      console.log('[Colormap] Loading colormap labels from:', modelInfo.colormapPath)
      const colormapJson = await window.electron.loadBrainchopLabels(modelInfo.colormapPath)
      return colormapJson as ColormapData
    } catch (err) {
      console.error('[Colormap] Failed to load external colormap:', err)
    }
  }

  // 3. Generate fallback
  console.log('[Colormap] Generating default colormap for:', modelInfo.name, `(${modelInfo.type}, ${modelInfo.outputClasses} classes)`)
  return generateDefaultColormap(modelInfo)
}
