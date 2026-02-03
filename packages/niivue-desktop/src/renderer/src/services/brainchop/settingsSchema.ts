import type { ModelType, ModelCategory } from './types.js'

/**
 * Schema for settings.json files that accompany brainchop models.
 * This enables self-describing models that can be loaded without manual configuration.
 */
export interface ModelSettings {
  name: string
  description: string
  type: ModelType
  outputClasses: number
  expectedInputShape: [number, number, number, number] // [batch, depth, height, width]
  inference: {
    enableSeqConv: boolean
    cropPadding: number
    autoThreshold: number
    enableQuantileNorm: boolean
    enableTranspose: boolean
  }
  performance: {
    estimatedTimeSeconds: number
    memoryRequirementMB: number
  }
  files?: {
    labels?: string // relative path to labels.json
  }
}

/**
 * Map model type to category
 */
const typeToCategory: Record<ModelType, ModelCategory> = {
  'tissue-segmentation': 'Tissue Segmentation',
  'brain-extraction': 'Brain Extraction',
  parcellation: 'Regional Parcellation'
}

/**
 * Validate and parse a settings.json object
 */
export function parseModelSettings(json: unknown): ModelSettings | null {
  if (!json || typeof json !== 'object') {
    return null
  }

  const obj = json as Record<string, unknown>

  // Required fields
  if (typeof obj.name !== 'string') return null
  if (typeof obj.type !== 'string') return null
  if (!['tissue-segmentation', 'brain-extraction', 'parcellation'].includes(obj.type)) return null
  if (typeof obj.outputClasses !== 'number') return null
  if (!Array.isArray(obj.expectedInputShape) || obj.expectedInputShape.length !== 4) return null

  // Inference settings
  const inference = obj.inference as Record<string, unknown> | undefined
  if (!inference || typeof inference !== 'object') return null

  // Performance settings
  const performance = obj.performance as Record<string, unknown> | undefined
  if (!performance || typeof performance !== 'object') return null

  return {
    name: obj.name as string,
    description: (obj.description as string) || '',
    type: obj.type as ModelType,
    outputClasses: obj.outputClasses as number,
    expectedInputShape: obj.expectedInputShape as [number, number, number, number],
    inference: {
      enableSeqConv: Boolean(inference.enableSeqConv),
      cropPadding: typeof inference.cropPadding === 'number' ? inference.cropPadding : 18,
      autoThreshold: typeof inference.autoThreshold === 'number' ? inference.autoThreshold : 0.02,
      enableQuantileNorm: Boolean(inference.enableQuantileNorm),
      enableTranspose: inference.enableTranspose !== false // default true
    },
    performance: {
      estimatedTimeSeconds:
        typeof performance.estimatedTimeSeconds === 'number' ? performance.estimatedTimeSeconds : 10,
      memoryRequirementMB:
        typeof performance.memoryRequirementMB === 'number' ? performance.memoryRequirementMB : 800
    },
    files: obj.files as { labels?: string } | undefined
  }
}

/**
 * Get the category for a model type
 */
export function getCategoryForType(type: ModelType): ModelCategory {
  return typeToCategory[type]
}
