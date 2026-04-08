// ── Workflow block definitions ───────────────────────────────────────
//
// Blocks are a UI-only abstraction that maps friendly names and sensible
// defaults to the underlying tool definitions. The workflow engine never
// sees blocks — they produce the same StepDraft / ContextFieldDraft objects
// that the existing designer already serializes into workflow JSON.

import type { Binding, ToolDefinition } from './workflowTypes.js'
import { isTypeCompatible } from './typeCompatibility.js'
import { generateContextFieldFromParam } from './bindingAnalyzer.js'

// ── Types ─────────────────────────────────────────────────────────────

export type BlockCategory = 'Import' | 'Processing' | 'Quality' | 'Output'

export interface WorkflowBlock {
  /** Unique id, e.g. 'import-dicoms' */
  id: string
  /** Friendly label shown in the palette, e.g. 'Import DICOMs' */
  label: string
  /** Plain-language one-liner */
  description: string
  category: BlockCategory
  /** Radix icon component name */
  icon: string
  /** Underlying tool name from the tool registry */
  tool: string
  /** Pre-filled input bindings (hidden from simple mode) */
  defaultInputs: Record<string, Binding>
  /** Pre-filled output mappings */
  defaultOutputMappings: Record<string, string>
  /** Tool input names that appear in the user-facing form */
  exposedFields: string[]
  /** Tool input names that get constant defaults (hidden in simple mode) */
  hiddenFields: string[]
  /** Optional custom component from the COMPONENT_REGISTRY */
  formComponent?: string
  /** Optional default condition expression */
  condition?: string
  /** Heuristic names to assign to exposed context fields */
  heuristics?: Record<string, string>
}

/** Draft types mirrored from WorkflowDesigner for interop */
export interface BindingDraft {
  mode: 'ref' | 'constant'
  value: string
}

export interface ContextFieldDraft {
  type: string
  label: string
  description: string
  heuristic: string
  default: string
}

export interface StepDraft {
  name: string
  tool: string
  inputs: Record<string, BindingDraft>
  outputMappings: Record<string, string>
  condition: string
}

export interface FormSectionDraft {
  title: string
  description: string
  fields: string[]
  component: string
  buttonText: string
}

export interface WorkflowDraft {
  name: string
  version: string
  description: string
  menu: string
  sections: FormSectionDraft[]
  contextFields: Record<string, ContextFieldDraft>
  steps: StepDraft[]
  workflowInputs: Record<string, { type: string; description: string }>
  workflowOutputs: Record<string, { type: string; ref: string }>
}

/** Data flow summary between two pipeline steps */
export interface DataFlowItem {
  type: string
  label: string
  color: string
}

// ── Block registry ────────────────────────────────────────────────────

export const WORKFLOW_BLOCKS: WorkflowBlock[] = [
  // ── Import ──────────────────────────────────────────────────────────
  {
    id: 'import-dicoms',
    label: 'Import DICOMs',
    description: 'Convert DICOM images to NIfTI format with BIDS sidecars',
    category: 'Import',
    icon: 'UploadIcon',
    tool: 'dcm2niix',
    defaultInputs: {
      bids: { constant: 'y' },
      compress: { constant: 'y' },
      bids_anon: { constant: 'n' }
    },
    defaultOutputMappings: {
      volumes: '_stepOutputs_convert_volumes',
      sidecars: '_stepOutputs_convert_sidecars',
      outDir: '_stepOutputs_convert_outDir',
      detectedSubjects: '_stepOutputs_convert_detectedSubjects'
    },
    exposedFields: ['dicom_dir'],
    hiddenFields: ['bids', 'compress', 'bids_anon', 'pattern', 'merge', 'verbose', 'series']
  },
  {
    id: 'load-nifti',
    label: 'Load NIfTI Files',
    description: 'Load and optionally reorient NIfTI (.nii/.nii.gz) volumes',
    category: 'Import',
    icon: 'FileIcon',
    tool: 'nifti-convert',
    defaultInputs: {
      reorient: { constant: 'RAS' }
    },
    defaultOutputMappings: {},
    exposedFields: ['input_path'],
    hiddenFields: ['reorient', 'resample']
  },

  // ── Processing ──────────────────────────────────────────────────────
  {
    id: 'subject-select',
    label: 'Subject Selection',
    description: 'Select which subjects to include or exclude',
    category: 'Processing',
    icon: 'PersonIcon',
    tool: 'bids-classify',
    defaultInputs: {},
    defaultOutputMappings: {
      subjects: 'subjects'
    },
    exposedFields: ['subjects'],
    hiddenFields: ['sidecars', 'overrides'],
    formComponent: 'subject-select',
    heuristics: { subjects: 'detect-subjects' }
  },
  {
    id: 'participants-sessions',
    label: 'Participants & Sessions',
    description: 'Edit subject labels, session names, and demographics',
    category: 'Processing',
    icon: 'PersonIcon',
    tool: 'bids-classify',
    defaultInputs: {},
    defaultOutputMappings: {},
    exposedFields: ['subjects'],
    hiddenFields: ['sidecars', 'overrides'],
    formComponent: 'subject-session-editor',
    heuristics: { subjects: 'detect-subjects' }
  },
  {
    id: 'classify-bids',
    label: 'Classify for BIDS',
    description: 'Auto-detect and review BIDS datatype/suffix for each series',
    category: 'Processing',
    icon: 'MixerHorizontalIcon',
    tool: 'bids-classify',
    defaultInputs: {
      overrides: { ref: 'context.series_list' }
    },
    defaultOutputMappings: {
      mappings: 'series_list',
      subjects: 'subjects'
    },
    exposedFields: ['series_list'],
    hiddenFields: ['sidecars', 'overrides'],
    formComponent: 'bids-classification-table',
    heuristics: { series_list: 'bids-classify' }
  },
  {
    id: 'preview-images',
    label: 'Preview Images',
    description: 'Review images before proceeding to the next step',
    category: 'Processing',
    icon: 'EyeOpenIcon',
    tool: 'bids-validate',
    defaultInputs: {},
    defaultOutputMappings: {},
    exposedFields: ['series_list'],
    hiddenFields: [],
    formComponent: 'bids-preview'
  },
  {
    id: 'skull-strip',
    label: 'Skull Strip',
    description: 'Remove non-brain tissue using ML-based extraction',
    category: 'Processing',
    icon: 'ScissorsIcon',
    tool: 'brainchop',
    defaultInputs: {
      model: { constant: 'brain-extract-mindgrab' },
      dilation: { constant: 3 }
    },
    defaultOutputMappings: {},
    exposedFields: ['nifti_path'],
    hiddenFields: ['model', 'dilation'],
    formComponent: 'skull-strip-editor'
  },
  {
    id: 'register-template',
    label: 'Register to Template',
    description: 'Align volumes to MNI152 standard space using allineate',
    category: 'Processing',
    icon: 'TransformIcon',
    tool: 'allineate',
    defaultInputs: {
      cost: { constant: 'ls' }
    },
    defaultOutputMappings: {
      output_paths: '_stepOutputs_allineate_output_paths',
      output_dir: '_stepOutputs_allineate_output_dir'
    },
    exposedFields: ['nifti_paths', 'output_dir'],
    hiddenFields: ['cost', 'nifti_path']
  },
  {
    id: 'deface',
    label: 'Deface',
    description: 'Remove facial features from anatomical scans for anonymization',
    category: 'Processing',
    icon: 'EyeNoneIcon',
    tool: 'deface',
    defaultInputs: {
      method: { constant: 'mask' }
    },
    defaultOutputMappings: {},
    exposedFields: ['nifti_path'],
    hiddenFields: ['method', 'output_path']
  },
  {
    id: 'segment-tissue',
    label: 'Segment Tissue',
    description: 'Segment brain into gray matter, white matter, and CSF',
    category: 'Processing',
    icon: 'ComponentInstanceIcon',
    tool: 'tissue-segment',
    defaultInputs: {
      model: { constant: 'tissue-seg-light' }
    },
    defaultOutputMappings: {},
    exposedFields: ['nifti_path'],
    hiddenFields: ['model']
  },
  {
    id: 'atlas-parcellate',
    label: 'Atlas Parcellation',
    description: 'Apply atlas parcellation to a skull-stripped anatomical volume',
    category: 'Processing',
    icon: 'LayoutIcon',
    tool: 'atlas-parcellate',
    defaultInputs: {
      atlas: { constant: 'parcellation-104' }
    },
    defaultOutputMappings: {},
    exposedFields: ['nifti_path', 'atlas'],
    hiddenFields: []
  },
  {
    id: 'niimath',
    label: 'NiiMath',
    description: 'General-purpose image calculator — smoothing, thresholding, masking, and math ops',
    category: 'Processing',
    icon: 'GearIcon',
    tool: 'niimath',
    defaultInputs: {
      operation: { constant: '-s' },
      operand: { constant: '2' }
    },
    defaultOutputMappings: {
      output_paths: '_stepOutputs_niimath_output_paths',
      output_dir: '_stepOutputs_niimath_output_dir'
    },
    exposedFields: ['nifti_paths', 'operation', 'operand', 'output_dir'],
    hiddenFields: ['nifti_path']
  },

  // ── Quality ─────────────────────────────────────────────────────────
  {
    id: 'quality-check',
    label: 'Quality Check',
    description: 'Compute quality metrics (SNR, motion, artifacts) on NIfTI volumes',
    category: 'Quality',
    icon: 'ActivityLogIcon',
    tool: 'quality-check',
    defaultInputs: {},
    defaultOutputMappings: {},
    exposedFields: ['volumes', 'series_list'],
    hiddenFields: []
  },
  {
    id: 'validate-bids',
    label: 'Validate BIDS',
    description: 'Check that the dataset meets BIDS specification requirements',
    category: 'Quality',
    icon: 'CheckCircledIcon',
    tool: 'bids-validate',
    defaultInputs: {},
    defaultOutputMappings: {},
    exposedFields: ['mappings'],
    hiddenFields: ['config']
  },

  // ── Output ──────────────────────────────────────────────────────────
  {
    id: 'write-bids',
    label: 'Write BIDS Dataset',
    description: 'Write classified data to a BIDS-compliant directory structure',
    category: 'Output',
    icon: 'DownloadIcon',
    tool: 'bids-write',
    defaultInputs: {},
    defaultOutputMappings: {
      bids_dir: '_stepOutputs_write_bids_dir'
    },
    exposedFields: ['output_dir'],
    hiddenFields: ['volumes', 'mappings', 'config'],
    formComponent: 'bids-preview'
  },
  {
    id: 'group-stats-setup',
    label: 'Group Statistics Setup',
    description: 'Generate group-level analysis configuration from a BIDS dataset',
    category: 'Output',
    icon: 'BarChartIcon',
    tool: 'group-stats-setup',
    defaultInputs: {},
    defaultOutputMappings: {},
    exposedFields: ['bids_dir', 'analysis_type'],
    hiddenFields: []
  }
]

// ── Utilities ─────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'volume': 'blue',
  'volume[]': 'blue',
  'mask': 'purple',
  'string': 'gray',
  'string[]': 'gray',
  'json[]': 'yellow',
  'series-mapping[]': 'yellow',
  'subject[]': 'green',
  'bids-dir': 'teal',
  'boolean': 'gray',
  'number': 'gray',
  'dicom-folder': 'orange',
  'object': 'gray'
}

const TYPE_LABELS: Record<string, string> = {
  'volume': 'NIfTI volume',
  'volume[]': 'NIfTI volumes',
  'mask': 'Brain mask',
  'string': 'Path',
  'string[]': 'Paths',
  'json[]': 'Sidecar JSON',
  'series-mapping[]': 'BIDS mappings',
  'subject[]': 'Subjects',
  'bids-dir': 'BIDS dataset',
  'dicom-folder': 'DICOM folder',
  'number': 'Number',
  'boolean': 'Flag'
}

/**
 * Get a block by id.
 */
export function getBlockById(id: string): WorkflowBlock | undefined {
  return WORKFLOW_BLOCKS.find((b) => b.id === id)
}

/**
 * Get blocks by category.
 */
export function getBlocksByCategory(category: BlockCategory): WorkflowBlock[] {
  return WORKFLOW_BLOCKS.filter((b) => b.category === category)
}

/**
 * Convert a WorkflowBlock into a StepDraft with auto-wired bindings.
 *
 * @param block      The block to convert
 * @param stepIndex  Position in the step list (for naming)
 * @param existingSteps  Already-added steps (for auto-wiring from their outputs)
 * @param tools      Tool definition map
 * @param workflowInputs  Workflow-level input definitions
 */
export function blockToStepDraft(
  block: WorkflowBlock,
  stepIndex: number,
  existingSteps: StepDraft[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>
): StepDraft {
  const tool = tools.get(block.tool)
  const stepName = `${block.id.replace(/-/g, '_')}_${stepIndex}`
  const inputs: Record<string, BindingDraft> = {}

  // Apply default (hidden) bindings from the block
  for (const [key, binding] of Object.entries(block.defaultInputs)) {
    if ('ref' in binding) {
      inputs[key] = { mode: 'ref', value: binding.ref }
    } else {
      inputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
    }
  }

  // For remaining tool inputs, try auto-wiring from previous steps
  if (tool) {
    for (const [inputName, paramDef] of Object.entries(tool.inputs)) {
      if (inputs[inputName]) continue // already set by defaults

      // Try to find a compatible source from previous steps
      const source = findCompatibleSource(inputName, paramDef.type, existingSteps, tools, workflowInputs)
      if (source) {
        inputs[inputName] = { mode: 'ref', value: source }
      } else {
        inputs[inputName] = { mode: 'ref', value: '' }
      }
    }
  }

  return {
    name: stepName,
    tool: block.tool,
    inputs,
    outputMappings: { ...block.defaultOutputMappings },
    condition: block.condition || ''
  }
}

/**
 * Find a compatible source reference from existing steps for a given input type.
 */
function findCompatibleSource(
  _inputName: string,
  inputType: string,
  existingSteps: StepDraft[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>
): string | null {
  // Check workflow inputs first
  for (const [name, def] of Object.entries(workflowInputs)) {
    if (isTypeCompatible(def.type, inputType)) {
      return `inputs.${name}`
    }
  }

  // Check outputs of preceding steps (search backwards for most recent match)
  for (let i = existingSteps.length - 1; i >= 0; i--) {
    const step = existingSteps[i]
    const tool = tools.get(step.tool)
    if (!tool) continue

    for (const [outputName, outputDef] of Object.entries(tool.outputs)) {
      if (isTypeCompatible(outputDef.type, inputType)) {
        return `steps.${step.name}.outputs.${outputName}`
      }
    }
  }

  return null
}

/**
 * Re-wire unbound inputs on a step against available sources.
 * Call this after adding a step or when the pipeline changes.
 */
export function autoWireStep(
  step: StepDraft,
  stepIndex: number,
  allSteps: StepDraft[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>
): StepDraft {
  const tool = tools.get(step.tool)
  if (!tool) return step

  const updatedInputs = { ...step.inputs }
  for (const [inputName, paramDef] of Object.entries(tool.inputs)) {
    const existing = updatedInputs[inputName]
    // Skip already-bound inputs (non-empty refs or constants)
    if (existing) {
      if (existing.mode === 'constant' && existing.value) continue
      if (existing.mode === 'ref' && existing.value) continue
    }

    const source = findCompatibleSource(inputName, paramDef.type, allSteps.slice(0, stepIndex), tools, workflowInputs)
    if (source) {
      updatedInputs[inputName] = { mode: 'ref', value: source }
    }
  }

  return { ...step, inputs: updatedInputs }
}

/**
 * Generate context fields for a block's exposed fields.
 */
export function blockToContextFields(
  block: WorkflowBlock,
  toolDef: ToolDefinition
): Record<string, ContextFieldDraft> {
  const fields: Record<string, ContextFieldDraft> = {}

  for (const fieldName of block.exposedFields) {
    const param = toolDef.inputs[fieldName]
    if (!param) continue

    const generated = generateContextFieldFromParam(fieldName, param)
    fields[fieldName] = {
      type: generated.type,
      label: generated.label,
      description: generated.description,
      heuristic: block.heuristics?.[fieldName] || '',
      default: generated.default !== undefined ? JSON.stringify(generated.default) : ''
    }
  }

  return fields
}

/**
 * Generate a form section for a block.
 */
export function blockToFormSection(block: WorkflowBlock): FormSectionDraft {
  return {
    title: block.label,
    description: block.description,
    fields: [...block.exposedFields],
    component: block.formComponent || '',
    buttonText: ''
  }
}

/**
 * Compute a human-readable data flow summary between two adjacent steps.
 */
export function computeDataFlowSummary(
  fromStep: StepDraft,
  toStep: StepDraft,
  tools: Map<string, ToolDefinition>
): DataFlowItem[] {
  const items: DataFlowItem[] = []
  const fromTool = tools.get(fromStep.tool)
  if (!fromTool) return items

  // Check which of toStep's inputs reference fromStep's outputs
  for (const [, binding] of Object.entries(toStep.inputs)) {
    if (binding.mode !== 'ref') continue
    const ref = binding.value
    if (!ref.startsWith(`steps.${fromStep.name}.outputs.`)) continue

    const outputName = ref.split('.').pop() || ''
    const outputDef = fromTool.outputs[outputName]
    if (!outputDef) continue

    // Avoid duplicates
    if (items.some((it) => it.type === outputDef.type)) continue

    items.push({
      type: outputDef.type,
      label: TYPE_LABELS[outputDef.type] || outputDef.type,
      color: TYPE_COLORS[outputDef.type] || 'gray'
    })
  }

  return items
}

/**
 * Try to match an existing StepDraft back to a WorkflowBlock.
 * Returns the matching block or undefined if no match.
 */
export function detectBlockForStep(step: StepDraft): WorkflowBlock | undefined {
  // First, try matching by step name prefix — step names are generated as
  // `${block.id.replace(/-/g, '_')}_${index}`, so we can match the prefix.
  for (const block of WORKFLOW_BLOCKS) {
    const prefix = block.id.replace(/-/g, '_')
    if (step.name.startsWith(prefix)) {
      return block
    }
  }

  // Fall back to tool name matching
  const candidates = WORKFLOW_BLOCKS.filter((b) => b.tool === step.tool)
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]

  // Multiple blocks use the same tool — disambiguate by output mappings
  for (const block of candidates) {
    const defaultKeys = Object.keys(block.defaultOutputMappings)
    const stepKeys = Object.keys(step.outputMappings)
    if (defaultKeys.length > 0 && defaultKeys.every((k) => stepKeys.includes(k))) {
      return block
    }
  }

  return candidates[0]
}

/**
 * Get all block categories in display order.
 */
export const BLOCK_CATEGORIES: BlockCategory[] = ['Import', 'Processing', 'Quality', 'Output']

// ── Context slot utilities ───────────────────────────────────────────

/** A context slot derived from a tool's output. */
export interface ContextSlot {
  /** Unique id, e.g. "skull_strip_0.output_paths" */
  id: string
  /** Friendly label, e.g. "Skull-stripped volumes" */
  label: string
  /** The output type, e.g. "volume[]" */
  type: string
  /** Index of the step that produces this slot */
  sourceStep: number
  /** The tool output key */
  sourceOutput: string
  /** Color from TYPE_COLORS */
  color: string
  /** Indices of steps that read from this slot */
  consumers: number[]
}

/**
 * Derive context slots from the current pipeline steps.
 * Each tool output becomes a slot. Consumer steps are detected
 * by scanning input bindings for refs to the slot's step output.
 */
export function computeContextSlots(
  steps: StepDraft[],
  tools: Map<string, ToolDefinition>
): ContextSlot[] {
  const slots: ContextSlot[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const tool = tools.get(step.tool)
    if (!tool) continue

    const block = detectBlockForStep(step)

    for (const [outputName, outputDef] of Object.entries(tool.outputs)) {
      const slotId = `${step.name}.${outputName}`
      const typeLabel = TYPE_LABELS[outputDef.type] || outputDef.type
      const blockLabel = block?.label || step.name

      // Find consumers: steps whose inputs reference this output
      const consumers: number[] = []
      for (let j = 0; j < steps.length; j++) {
        if (j === i) continue
        for (const binding of Object.values(steps[j].inputs)) {
          if (binding.mode === 'ref' && binding.value === `steps.${step.name}.outputs.${outputName}`) {
            consumers.push(j)
            break
          }
        }
      }

      slots.push({
        id: slotId,
        label: `${blockLabel} → ${typeLabel}`,
        type: outputDef.type,
        sourceStep: i,
        sourceOutput: outputName,
        color: TYPE_COLORS[outputDef.type] || 'gray',
        consumers
      })
    }
  }

  return slots
}

/** Export TYPE_COLORS and TYPE_LABELS for use by the visual designer. */
export { TYPE_COLORS, TYPE_LABELS }
