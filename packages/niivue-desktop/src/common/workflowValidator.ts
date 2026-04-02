import type { ToolDefinition } from './workflowTypes.js'
import { isTypeCompatible } from './typeCompatibility.js'

// ── Validation result types ─────────────────────────────────────────

export interface ValidationIssue {
  stepName?: string
  field?: string
  message: string
}

export interface ValidationResult {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ── Draft interfaces (local copies to avoid importing from renderer) ─

interface DraftBinding {
  mode: 'ref' | 'constant'
  value: string
}

interface DraftStep {
  name: string
  tool: string
  inputs: Record<string, DraftBinding>
  outputMappings: Record<string, string>
  condition: string
}

interface DraftSection {
  title: string
  fields: string[]
}

interface WorkflowDraft {
  name: string
  version: string
  description: string
  menu: string
  sections: DraftSection[]
  contextFields: Record<string, { type: string; label: string; description: string }>
  steps: DraftStep[]
  workflowInputs: Record<string, { type: string; description: string }>
  workflowOutputs: Record<string, { type: string; ref: string }>
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve a ref string to its source type within a workflow draft.
 *
 * Supported ref formats:
 * - `inputs.X`          → type from `draft.workflowInputs[X]`
 * - `context`           → `"object"`
 * - `context.X`         → type from `draft.contextFields[X]`
 * - `steps.Y.outputs.Z` → type from tool outputs of step Y
 *
 * @returns The resolved type string, or `null` if the ref is invalid.
 */
export function resolveRefType(
  ref: string,
  draft: WorkflowDraft,
  tools: Map<string, ToolDefinition>
): string | null {
  const parts = ref.split('.')

  if (parts[0] === 'inputs' && parts.length === 2) {
    const input = draft.workflowInputs[parts[1]]
    return input ? input.type : null
  }

  if (parts[0] === 'context') {
    if (parts.length === 1) return 'object'
    if (parts.length === 2) {
      const field = draft.contextFields[parts[1]]
      return field ? field.type : null
    }
    return null
  }

  if (parts[0] === 'steps' && parts.length === 4 && parts[2] === 'outputs') {
    const stepName = parts[1]
    const outputName = parts[3]
    const step = draft.steps.find((s) => s.name === stepName)
    if (!step) return null
    const tool = tools.get(step.tool)
    if (!tool) return null
    const output = tool.outputs[outputName]
    return output ? output.type : null
  }

  return null
}

// ── Main validator ──────────────────────────────────────────────────

/**
 * Validate a workflow draft against available tool definitions.
 *
 * Returns a `ValidationResult` containing all detected errors and warnings.
 * Errors indicate problems that would prevent the workflow from running.
 * Warnings indicate potential issues that may cause unexpected behaviour.
 */
export function validateWorkflowDraft(
  draft: WorkflowDraft,
  tools: Map<string, ToolDefinition>
): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const seenNames = new Set<string>()

  for (let i = 0; i < draft.steps.length; i++) {
    const step = draft.steps[i]

    // ── Step name checks ──────────────────────────────────────────
    if (!step.name || step.name.trim() === '') {
      errors.push({ message: `Step at index ${i} has no name` })
      continue
    }

    if (seenNames.has(step.name)) {
      errors.push({ stepName: step.name, message: `Duplicate step name '${step.name}'` })
      continue
    }
    seenNames.add(step.name)

    // ── Tool checks ───────────────────────────────────────────────
    if (!step.tool || step.tool.trim() === '') {
      errors.push({ stepName: step.name, message: `Step '${step.name}' has no tool selected` })
      continue
    }

    const tool = tools.get(step.tool)
    if (!tool) {
      errors.push({
        stepName: step.name,
        message: `Step '${step.name}' references unknown tool '${step.tool}'`
      })
      continue
    }

    // ── Input binding checks ──────────────────────────────────────
    const boundInputs = Object.keys(step.inputs)
    if (boundInputs.length === 0) {
      warnings.push({ stepName: step.name, message: `Step '${step.name}' has no inputs configured` })
    }

    // Check required inputs are bound
    for (const [inputName, inputDef] of Object.entries(tool.inputs)) {
      if (inputDef.optional === true) continue
      const binding = step.inputs[inputName]
      if (!binding || (binding.mode === 'ref' && binding.value.trim() === '') || (binding.mode === 'constant' && binding.value.trim() === '')) {
        errors.push({
          stepName: step.name,
          field: inputName,
          message: `Step '${step.name}': required input '${inputName}' is not bound`
        })
      }
    }

    // Check ref bindings point to valid sources
    for (const [inputName, binding] of Object.entries(step.inputs)) {
      if (binding.mode !== 'ref' || binding.value.trim() === '') continue
      const ref = binding.value
      const parts = ref.split('.')

      if (parts[0] === 'inputs') {
        if (parts.length !== 2 || !(parts[1] in draft.workflowInputs)) {
          errors.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
          })
          continue
        }
      } else if (parts[0] === 'context') {
        // bare `context` is always valid
        if (parts.length === 2 && !(parts[1] in draft.contextFields)) {
          errors.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
          })
          continue
        }
      } else if (parts[0] === 'steps') {
        if (parts.length !== 4 || parts[2] !== 'outputs') {
          errors.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
          })
          continue
        }
        const refStepName = parts[1]
        const refOutputName = parts[3]
        // The referenced step must precede the current step
        const precedingSteps = draft.steps.slice(0, i)
        const refStep = precedingSteps.find((s) => s.name === refStepName)
        if (!refStep) {
          errors.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
          })
          continue
        }
        const refTool = tools.get(refStep.tool)
        if (!refTool || !(refOutputName in refTool.outputs)) {
          errors.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
          })
          continue
        }
      } else {
        errors.push({
          stepName: step.name,
          field: inputName,
          message: `Step '${step.name}': input '${inputName}' references non-existent source '${ref}'`
        })
        continue
      }

      // ── Type compatibility warning ────────────────────────────
      const inputDef = tool.inputs[inputName]
      if (inputDef) {
        const sourceType = resolveRefType(ref, draft, tools)
        if (sourceType && !isTypeCompatible(sourceType, inputDef.type)) {
          warnings.push({
            stepName: step.name,
            field: inputName,
            message: `Step '${step.name}': input '${inputName}' expects '${inputDef.type}' but source provides '${sourceType}'`
          })
        }
      }
    }
  }

  // ── Form section checks ───────────────────────────────────────────
  for (const section of draft.sections) {
    for (const field of section.fields) {
      if (!(field in draft.contextFields)) {
        errors.push({
          field,
          message: `Form section '${section.title}': field '${field}' is not defined in context`
        })
      }
    }
  }

  // ── Workflow output checks ────────────────────────────────────────
  for (const [outputName, outputDef] of Object.entries(draft.workflowOutputs)) {
    const ref = outputDef.ref
    const resolvedType = resolveRefType(ref, draft, tools)
    if (resolvedType === null) {
      errors.push({
        field: outputName,
        message: `Workflow output '${outputName}' references non-existent source '${ref}'`
      })
    }
  }

  return { errors, warnings }
}
