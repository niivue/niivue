import type * as tf from '@tensorflow/tfjs'

/**
 * Native MeshNet model specification from neuroneural/brainchop-models.
 * This is a compact format describing the network architecture with a
 * separate model.bin file containing raw weight data.
 */
export interface NativeMeshNetSpec {
  header?: string
  bnorm?: boolean
  elu?: boolean
  gelu?: boolean
  dropout_p?: number
  bias?: boolean
  layers: Array<{
    in_channels: number
    out_channels: number
    kernel_size: number
    padding: number
    stride: number
    dilation: number
  }>
}

/**
 * Check if a parsed model.json is in the native MeshNet format
 * (has a layers array) rather than TF.js layers-model format.
 */
export function isNativeMeshNetFormat(
  modelJson: Record<string, unknown>
): modelJson is NativeMeshNetSpec {
  return Array.isArray(modelJson.layers) && modelJson.format !== 'layers-model'
}

/**
 * Convert a native MeshNet spec + raw weight data into TF.js ModelArtifacts.
 * The resulting artifacts can be loaded via tf.loadLayersModel(tf.io.fromMemory(artifacts))
 * identically to models from tf.loadLayersModel().
 */
export function nativeSpecToArtifacts(
  spec: NativeMeshNetSpec,
  weightData: ArrayBuffer
): tf.io.ModelArtifacts {
  if (spec.bnorm) {
    throw new Error('Batch normalization in native MeshNet models is not yet supported')
  }
  if (spec.dropout_p && spec.dropout_p > 0) {
    throw new Error('Dropout in native MeshNet models is not yet supported')
  }

  const weightSpecs = buildWeightSpecs(spec)
  validateWeightData(weightSpecs, weightData)

  return {
    modelTopology: buildKerasTopology(spec),
    weightSpecs,
    weightData,
    format: 'layers-model',
    generatedBy: 'NativeMeshNetModelBuilder',
    convertedBy: 'niivue-desktop'
  }
}

/**
 * Determine the activation function from model-level flags.
 */
function getActivationType(spec: NativeMeshNetSpec): string {
  if (spec.elu) return 'elu'
  if (spec.gelu) return 'gelu'
  return 'relu'
}

/**
 * Build a Keras-compatible model topology JSON from the native layer specs.
 * Creates a Functional model with alternating Conv3D + Activation layers,
 * where the last Conv3D (output) has no activation.
 */
function buildKerasTopology(spec: NativeMeshNetSpec): Record<string, unknown> {
  const activationType = getActivationType(spec)
  const useBias = spec.bias !== false
  const kerasLayers: Record<string, unknown>[] = []

  // Input layer
  kerasLayers.push({
    class_name: 'InputLayer',
    config: {
      batch_input_shape: [null, 256, 256, 256, 1],
      dtype: 'float32',
      sparse: false,
      ragged: false,
      name: 'input'
    },
    name: 'input',
    inbound_nodes: []
  })

  let prevLayerName = 'input'

  for (let i = 0; i < spec.layers.length; i++) {
    const layer = spec.layers[i]
    const isLastLayer = i === spec.layers.length - 1
    const convName = isLastLayer ? 'output' : `conv3d_${i}`

    kerasLayers.push({
      class_name: 'Conv3D',
      config: {
        name: convName,
        trainable: false,
        dtype: 'float32',
        filters: layer.out_channels,
        kernel_size: [layer.kernel_size, layer.kernel_size, layer.kernel_size],
        strides: [1, 1, 1],
        padding: 'same',
        data_format: 'channels_last',
        dilation_rate: [layer.dilation, layer.dilation, layer.dilation],
        groups: 1,
        activation: 'linear',
        use_bias: useBias,
        kernel_initializer: { class_name: 'Zeros', config: {} },
        bias_initializer: { class_name: 'Zeros', config: {} },
        kernel_regularizer: null,
        bias_regularizer: null,
        activity_regularizer: null,
        kernel_constraint: null,
        bias_constraint: null
      },
      name: convName,
      inbound_nodes: [[[prevLayerName, 0, 0, {}]]]
    })

    prevLayerName = convName

    // Add activation after each conv layer except the last (output classification layer)
    if (!isLastLayer) {
      const actName = `activation_${i}`
      kerasLayers.push({
        class_name: 'Activation',
        config: {
          name: actName,
          trainable: false,
          dtype: 'float32',
          activation: activationType
        },
        name: actName,
        inbound_nodes: [[[prevLayerName, 0, 0, {}]]]
      })
      prevLayerName = actName
    }
  }

  return {
    keras_version: '2.7.0',
    backend: 'tensorflow',
    model_config: {
      class_name: 'Functional',
      config: {
        name: 'model',
        layers: kerasLayers,
        input_layers: [['input', 0, 0]],
        output_layers: [['output', 0, 0]]
      }
    }
  }
}

/**
 * Build weight spec entries matching the native layer order.
 * For each layer: kernel [K,K,K,in_ch,out_ch] then bias [out_ch] (if bias=true).
 */
function buildWeightSpecs(spec: NativeMeshNetSpec): tf.io.WeightsManifestEntry[] {
  const useBias = spec.bias !== false
  const specs: tf.io.WeightsManifestEntry[] = []

  for (let i = 0; i < spec.layers.length; i++) {
    const layer = spec.layers[i]
    const isLastLayer = i === spec.layers.length - 1
    const name = isLastLayer ? 'output' : `conv3d_${i}`

    specs.push({
      name: `${name}/kernel`,
      shape: [
        layer.kernel_size,
        layer.kernel_size,
        layer.kernel_size,
        layer.in_channels,
        layer.out_channels
      ],
      dtype: 'float32'
    })

    if (useBias) {
      specs.push({
        name: `${name}/bias`,
        shape: [layer.out_channels],
        dtype: 'float32'
      })
    }
  }

  return specs
}

/**
 * Validate that the weight data buffer has the expected byte count.
 */
function validateWeightData(specs: tf.io.WeightsManifestEntry[], weightData: ArrayBuffer): void {
  let expectedBytes = 0
  for (const spec of specs) {
    const elements = spec.shape.reduce((a, b) => a * b, 1)
    expectedBytes += elements * 4 // float32
  }

  if (weightData.byteLength !== expectedBytes) {
    throw new Error(
      `Weight data size mismatch: expected ${expectedBytes} bytes but got ${weightData.byteLength} bytes. ` +
        `Model format may be incompatible.`
    )
  }
}
