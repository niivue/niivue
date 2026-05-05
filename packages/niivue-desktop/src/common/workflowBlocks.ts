// ── Workflow block definitions ───────────────────────────────────────
//
// Blocks are a UI-only abstraction that maps friendly names and sensible
// defaults to the underlying tool definitions. The workflow engine never
// sees blocks — they produce the same StepDraft / ContextFieldDraft objects
// that the workflow JSON serializer writes out.
//
// Block metadata lives inside each tool's JSON (under the `block` key), so
// adding a new tool requires touching one file. This module derives the
// runtime block list from the loaded tool definitions.

import type { Binding, BlockDef, ToolDefinition } from './workflowTypes.js'
import { isTypeCompatible } from './typeCompatibility.js'
import { generateContextFieldFromParam } from './bindingAnalyzer.js'

// ── Types ─────────────────────────────────────────────────────────────

export type BlockCategory = 'Import' | 'Processing' | 'Quality' | 'Output'

/** A WorkflowBlock is a BlockDef enriched with the tool name it came from. */
export interface WorkflowBlock extends BlockDef {
  /** Underlying tool name — derived from the tool JSON that declared the block. */
  tool: string
}

/** Draft types mirrored from the designer for interop */
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
  /** Optional enum values, preserved when an inline block contextField declares them. */
  enum?: unknown[]
  optional?: boolean
  min?: number
  max?: number
  /** Other context field names whose changes should refire this field's heuristic. */
  dependsOn?: string[]
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

// ── Block derivation ──────────────────────────────────────────────────

/**
 * Derive the runtime list of workflow blocks from loaded tool definitions.
 * Each tool's optional `block` field (single object or array of objects)
 * produces one or more palette entries. Tools without a `block` field are
 * hidden from the palette but still callable via workflow JSON.
 */
export function getWorkflowBlocks(tools: Map<string, ToolDefinition>): WorkflowBlock[] {
  const blocks: WorkflowBlock[] = []
  for (const tool of tools.values()) {
    if (!tool.block) continue
    const blockDefs = Array.isArray(tool.block) ? tool.block : [tool.block]
    for (const def of blockDefs) {
      blocks.push({ ...def, tool: tool.name })
    }
  }
  return blocks
}

/**
 * Convert a value from a block's `defaults` map into a runtime Binding.
 * Raw scalars become `{ constant }` bindings; pre-shaped Binding objects
 * (`{ ref }` or `{ constant }`) are passed through.
 */
function defaultToBinding(value: unknown): Binding {
  if (value && typeof value === 'object') {
    if ('ref' in value && typeof (value as { ref: unknown }).ref === 'string') {
      return { ref: (value as { ref: string }).ref }
    }
    if ('constant' in value) {
      return { constant: (value as { constant: unknown }).constant }
    }
  }
  return { constant: value }
}

/**
 * Get a block by id. Searches the blocks derived from the given tool map.
 */
export function getBlockById(
  tools: Map<string, ToolDefinition>,
  id: string
): WorkflowBlock | undefined {
  return getWorkflowBlocks(tools).find((b) => b.id === id)
}

/**
 * Get blocks by category.
 */
export function getBlocksByCategory(
  tools: Map<string, ToolDefinition>,
  category: BlockCategory
): WorkflowBlock[] {
  return getWorkflowBlocks(tools).filter((b) => b.category === category)
}

/**
 * Convert a WorkflowBlock into a StepDraft with auto-wired bindings.
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
  if (block.defaults) {
    for (const [key, value] of Object.entries(block.defaults)) {
      const binding = defaultToBinding(value)
      if ('ref' in binding) {
        inputs[key] = { mode: 'ref', value: binding.ref }
      } else {
        inputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
      }
    }
  }

  // For remaining tool inputs, try auto-wiring from previous steps
  if (tool) {
    const exposed = new Set(block.exposedFields)
    for (const [inputName, paramDef] of Object.entries(tool.inputs)) {
      if (inputs[inputName]) continue // already set by defaults

      // Exposed fields are user-edited form fields; bind to context.<name>
      // rather than picking up a same-typed step output (which would silently
      // ignore the user's input — e.g. wiring bids-write.output_dir to
      // dcm2niix's temp outDir).
      if (exposed.has(inputName)) {
        inputs[inputName] = { mode: 'ref', value: `context.${inputName}` }
        continue
      }

      const source = findCompatibleSource(
        inputName,
        paramDef.type,
        existingSteps,
        tools,
        workflowInputs
      )
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
    outputMappings: {},
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
 * Decide whether a saved binding for a hidden-field input should be replaced
 * by the block's default. We force-replace whenever the block declares a
 * ref-typed default for a hidden field — hidden fields are not user-editable,
 * so the block's declared wiring is authoritative. Any saved binding pointing
 * elsewhere is almost certainly a stale type-based auto-wire from the designer
 * (e.g. wiring a tool's `mappings: series-mapping[]` input to an upstream
 * step's `sidecars: json[]` output, or `config: object` to a `directory`
 * output) and would otherwise silently pass the wrong data downstream.
 */
function shouldForceHiddenDefault(
  block: WorkflowBlock,
  inputName: string,
  defaultBinding: Binding
): boolean {
  if (!block.hiddenFields?.includes(inputName)) return false
  return 'ref' in defaultBinding && typeof defaultBinding.ref === 'string'
}

/**
 * Apply block-default bindings to any *missing or empty* inputs on existing
 * steps. This repairs drafts that were built or saved before a block declared
 * new defaults (most often `{ ref: "context" }` for whole-context inputs).
 *
 * Non-destructive in the general case: existing non-empty bindings are preserved.
 * Exception: when a block's default is `{ ref: "context" }` for a hidden-field
 * input, the default is forced even over an existing binding (see
 * `shouldForceHiddenDefault`).
 */
export function repairBlockDefaults(
  draft: WorkflowDraft,
  tools: Map<string, ToolDefinition>
): WorkflowDraft {
  const blocks = getWorkflowBlocks(tools)
  let changed = false
  const repairedSteps = draft.steps.map((step) => {
    const matchingBlocks = blocks.filter((b) => b.tool === step.tool)
    if (matchingBlocks.length === 0) return step

    const updatedInputs = { ...step.inputs }
    let stepChanged = false
    for (const block of matchingBlocks) {
      if (!block.defaults) continue
      for (const [key, value] of Object.entries(block.defaults)) {
        const binding = defaultToBinding(value)
        const existing = updatedInputs[key]
        const force = shouldForceHiddenDefault(block, key, binding)
        if (!force && existing && existing.value && existing.value.trim() !== '') continue
        if ('ref' in binding) {
          updatedInputs[key] = { mode: 'ref', value: binding.ref }
        } else {
          updatedInputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
        }
        stepChanged = true
      }
    }
    if (stepChanged) {
      changed = true
      return { ...step, inputs: updatedInputs }
    }
    return step
  })

  // Also fill in any context fields that blocks declare as required. Looks at
  // each step's matching blocks and merges in their context fields for any
  // names not already defined on the draft.
  const updatedContextFields = { ...draft.contextFields }
  let fieldsChanged = false
  for (const step of draft.steps) {
    const tool = tools.get(step.tool)
    if (!tool) continue
    const matchingBlocks = blocks.filter((b) => b.tool === step.tool)
    for (const block of matchingBlocks) {
      const newFields = blockToContextFields(block, tool)
      for (const [name, field] of Object.entries(newFields)) {
        if (!(name in updatedContextFields)) {
          updatedContextFields[name] = field
          fieldsChanged = true
        }
      }
    }
  }

  // Prune sections that would render as blank in the wizard: no fields and
  // no custom component. Headless steps (e.g. backend-only validators) should
  // not surface to the user as empty wizard pages.
  const prunedSections = draft.sections.filter(
    (s) => s.fields.length > 0 || (s.component && s.component.trim() !== '')
  )
  const sectionsChanged = prunedSections.length !== draft.sections.length

  if (!changed && !fieldsChanged && !sectionsChanged) return draft
  return {
    ...draft,
    steps: repairedSteps,
    contextFields: updatedContextFields,
    sections: prunedSections
  }
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

    const source = findCompatibleSource(
      inputName,
      paramDef.type,
      allSteps.slice(0, stepIndex),
      tools,
      workflowInputs
    )
    if (source) {
      updatedInputs[inputName] = { mode: 'ref', value: source }
    }
  }

  return { ...step, inputs: updatedInputs }
}

/**
 * Generate context fields for a block's exposed fields.
 *
 * Exposed fields usually map to tool inputs the user fills in, but some
 * blocks expose other things:
 *  - tool *outputs* — when a heuristic populates the field and the form
 *    lets the user review the result before downstream steps consume it
 *    (e.g. bids-classify's `subjects`).
 *  - *synthetic* context fields that have no direct counterpart on the
 *    tool — when the block's `defaults` re-bind a tool input to
 *    `context.<exposedField>`, the field name acts as a renamed/editable
 *    proxy for that input. We pick up the type from that input
 *    (e.g. bids-classify exposes `series_list`, which is the editable
 *    form of the `overrides: series-mapping[]` input).
 */
export function blockToContextFields(
  block: WorkflowBlock,
  toolDef: ToolDefinition
): Record<string, ContextFieldDraft> {
  const fields: Record<string, ContextFieldDraft> = {}

  const namesToProcess = [...block.exposedFields, ...(block.requiredContextFields || [])]

  for (const fieldName of namesToProcess) {
    // Inline definition wins: blocks can declare workflow-level fields
    // (e.g. dataset_name) that don't correspond to a tool input/output.
    const inline = block.contextFields?.[fieldName]
    if (inline) {
      const inlineDefault =
        inline.default !== undefined ? JSON.stringify(inline.default) : ''
      fields[fieldName] = {
        type: inline.type,
        label: inline.label || fieldName,
        description: inline.description || '',
        heuristic: inline.heuristic || block.heuristics?.[fieldName] || '',
        default: inlineDefault,
        ...(inline.enum ? { enum: inline.enum } : {}),
        ...(inline.optional !== undefined ? { optional: inline.optional } : {}),
        ...(inline.min !== undefined ? { min: inline.min } : {}),
        ...(inline.max !== undefined ? { max: inline.max } : {}),
        ...(inline.dependsOn ? { dependsOn: inline.dependsOn } : {})
      }
      continue
    }

    let param = toolDef.inputs[fieldName] || toolDef.outputs[fieldName]

    // Fallback 1: find a default like `<input>: { ref: "context.<fieldName>" }`
    // and use that input's type/description. This covers blocks whose
    // exposedFields name a heuristic-populated synthetic context field.
    if (!param && block.defaults) {
      const proxyTarget = `context.${fieldName}`
      for (const [inputName, value] of Object.entries(block.defaults)) {
        if (
          value &&
          typeof value === 'object' &&
          'ref' in value &&
          (value as { ref: unknown }).ref === proxyTarget
        ) {
          const proxied = toolDef.inputs[inputName]
          if (proxied) {
            param = proxied
            break
          }
        }
      }
    }

    if (param) {
      const generated = generateContextFieldFromParam(fieldName, param)
      fields[fieldName] = {
        type: generated.type,
        label: generated.label,
        description: generated.description,
        heuristic: block.heuristics?.[fieldName] || '',
        default: generated.default !== undefined ? JSON.stringify(generated.default) : ''
      }
      continue
    }

    // Fallback 2: pure viewer/editor blocks (e.g. Preview Images) name a
    // context field that is populated entirely by other steps' heuristics
    // and has no link to this tool's inputs/outputs. Generate a generic
    // context entry so the form section validates; the workflow's other
    // blocks will fill in the real type.
    fields[fieldName] = {
      type: 'object',
      label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Shared workflow data — populated by another step.`,
      heuristic: block.heuristics?.[fieldName] || '',
      default: ''
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
export function detectBlockForStep(
  step: StepDraft,
  tools: Map<string, ToolDefinition>
): WorkflowBlock | undefined {
  const blocks = getWorkflowBlocks(tools)

  // First, try matching by step name prefix — step names are generated as
  // `${block.id.replace(/-/g, '_')}_${index}`, so we can match the prefix.
  for (const block of blocks) {
    const prefix = block.id.replace(/-/g, '_')
    if (step.name.startsWith(prefix)) {
      return block
    }
  }

  // Fall back to tool name matching
  const candidates = blocks.filter((b) => b.tool === step.tool)
  if (candidates.length === 0) return undefined
  return candidates[0]
}

/**
 * Get all block categories in display order.
 */
export const BLOCK_CATEGORIES: BlockCategory[] = ['Import', 'Processing', 'Quality', 'Output']

// ── Type color/label tables (shared UI reference) ────────────────────

const TYPE_COLORS: Record<string, string> = {
  volume: 'blue',
  'volume[]': 'blue',
  mask: 'purple',
  string: 'gray',
  'string[]': 'gray',
  'json[]': 'yellow',
  'series-mapping[]': 'yellow',
  'subject[]': 'green',
  'bids-dir': 'teal',
  boolean: 'gray',
  number: 'gray',
  'dicom-folder': 'orange',
  object: 'gray'
}

const TYPE_LABELS: Record<string, string> = {
  volume: 'NIfTI volume',
  'volume[]': 'NIfTI volumes',
  mask: 'Brain mask',
  string: 'Path',
  'string[]': 'Paths',
  'json[]': 'Sidecar JSON',
  'series-mapping[]': 'BIDS mappings',
  'subject[]': 'Subjects',
  'bids-dir': 'BIDS dataset',
  'dicom-folder': 'DICOM folder',
  number: 'Number',
  boolean: 'Flag'
}

export { TYPE_COLORS, TYPE_LABELS }

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

    const block = detectBlockForStep(step, tools)

    for (const [outputName, outputDef] of Object.entries(tool.outputs)) {
      const slotId = `${step.name}.${outputName}`
      const typeLabel = TYPE_LABELS[outputDef.type] || outputDef.type
      const blockLabel = block?.label || step.name

      // Find consumers: steps whose inputs reference this output
      const consumers: number[] = []
      for (let j = 0; j < steps.length; j++) {
        if (j === i) continue
        for (const binding of Object.values(steps[j].inputs)) {
          if (
            binding.mode === 'ref' &&
            binding.value === `steps.${step.name}.outputs.${outputName}`
          ) {
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
