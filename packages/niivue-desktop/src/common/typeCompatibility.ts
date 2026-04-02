// ── Type compatibility utilities for workflow builder ────────────────

import type { ToolDefinition } from './workflowTypes.js'

/**
 * Coercion rules: output type → set of compatible input types.
 * If a pair is not listed here, only exact matches are allowed.
 */
const COERCION_RULES: Record<string, string[]> = {
  volume: ['string'],
  'volume[]': ['string[]'],
  'json[]': ['string[]'],
  string: ['directory'],
  mask: ['volume', 'string'],
}

/**
 * Check whether an output of `outputType` can feed into an input of `inputType`.
 * Exact matches always return true. Otherwise, checks the coercion table
 * and array-element compatibility.
 */
export function isTypeCompatible(outputType: string, inputType: string): boolean {
  if (outputType === inputType) return true

  // Direct coercion lookup
  const allowed = COERCION_RULES[outputType]
  if (allowed && allowed.includes(inputType)) return true

  // Array element compatibility: X[] → Y[] if X → Y
  const outElem = arrayElementType(outputType)
  const inElem = arrayElementType(inputType)
  if (outElem && inElem) {
    return isTypeCompatible(outElem, inElem)
  }

  return false
}

/** Extract the element type from an array type string, e.g. "volume[]" → "volume". */
function arrayElementType(type: string): string | null {
  return type.endsWith('[]') ? type.slice(0, -2) : null
}

// ── Source suggestions ──────────────────────────────────────────────

/** A candidate source that can be wired to an input. */
export interface SourceSuggestion {
  /** Reference string, e.g. "inputs.dicom_dir" or "steps.convert.outputs.volumes" */
  ref: string
  /** The source's declared type */
  type: string
  /** Human-readable label, e.g. "convert → volumes (volume[])" */
  label: string
  /** True if the type is an exact match (not just coercion-compatible) */
  exact: boolean
}

/**
 * Minimal step representation that works for both runtime StepDef
 * and design-time StepDraft.
 */
export interface StepInfo {
  name: string
  tool: string
  inputs: Record<string, { mode: 'ref' | 'constant'; value: string } | { ref: string } | { constant: unknown }>
}

/**
 * Collect all compatible sources for a given input on a given step.
 *
 * Scans workflow-level inputs and outputs of all preceding steps,
 * returning them sorted with exact type matches first.
 */
export function getAvailableSources(
  stepIndex: number,
  _inputName: string,
  inputType: string,
  allSteps: StepInfo[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>
): SourceSuggestion[] {
  const suggestions: SourceSuggestion[] = []

  // 1. Workflow-level inputs
  for (const [name, def] of Object.entries(workflowInputs)) {
    if (isTypeCompatible(def.type, inputType)) {
      suggestions.push({
        ref: `inputs.${name}`,
        type: def.type,
        label: `workflow input: ${name} (${def.type})`,
        exact: def.type === inputType,
      })
    }
  }

  // 2. Outputs from preceding steps
  for (let i = 0; i < stepIndex; i++) {
    const step = allSteps[i]
    const tool = tools.get(step.tool)
    if (!tool) continue

    for (const [outputName, outputDef] of Object.entries(tool.outputs)) {
      if (isTypeCompatible(outputDef.type, inputType)) {
        suggestions.push({
          ref: `steps.${step.name}.outputs.${outputName}`,
          type: outputDef.type,
          label: `${step.name} → ${outputName} (${outputDef.type})`,
          exact: outputDef.type === inputType,
        })
      }
    }
  }

  // Sort: exact matches first, then alphabetically by ref
  suggestions.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1
    return a.ref.localeCompare(b.ref)
  })

  return suggestions
}

/**
 * For each required, unbound input on the given step, suggest a wiring
 * if there is exactly one compatible source available.
 *
 * Returns a map of inputName → suggested ref string.
 */
export function getAutoWireSuggestions(
  step: StepInfo,
  stepIndex: number,
  allSteps: StepInfo[],
  tools: Map<string, ToolDefinition>,
  workflowInputs: Record<string, { type: string }>
): Record<string, string> {
  const tool = tools.get(step.tool)
  if (!tool) return {}

  const result: Record<string, string> = {}

  for (const [inputName, paramDef] of Object.entries(tool.inputs)) {
    // Skip optional inputs
    if (paramDef.optional) continue

    // Skip already-bound inputs
    if (step.inputs[inputName] != null) continue

    const sources = getAvailableSources(stepIndex, inputName, paramDef.type, allSteps, tools, workflowInputs)
    if (sources.length === 1) {
      result[inputName] = sources[0].ref
    }
  }

  return result
}
