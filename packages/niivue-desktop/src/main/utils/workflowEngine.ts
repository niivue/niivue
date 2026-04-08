import { randomUUID } from 'node:crypto'
import type {
  WorkflowDefinition,
  WorkflowRunState,
  StepDef,
  Binding
} from '../../common/workflowTypes.js'
import { getWorkflowDefinitions, getToolDefinitions } from './workflowLoader.js'
import { getToolExecutor } from './toolRegistry.js'
import { inferFormSections } from '../../common/bindingAnalyzer.js'
import { getHeuristic } from './heuristicRegistry.js'
import {
  computeInputHash,
  getCachedOutput,
  setCachedOutput,
  invalidateDownstream,
  clearRunCache
} from './workflowCache.js'

const activeRuns = new Map<string, WorkflowRunState>()

/**
 * Safely resolve a dot-path expression against the workflow run state.
 * Returns the value at the path, or undefined if any segment is missing.
 * Supports paths like "context.skull_strip_config.enabled" or "inputs.dicom_dir".
 */
function resolveDotPath(expr: string, state: WorkflowRunState): unknown {
  const parts = expr.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = state
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

/**
 * Evaluate a condition expression against the run state.
 * The expression is a dot-path (e.g. "context.skull_strip_config.enabled")
 * that is resolved and checked for truthiness.
 */
function evaluateCondition(expr: string, state: WorkflowRunState): boolean {
  return !!resolveDotPath(expr, state)
}

/**
 * Apply outputMappings from a step definition, writing tool outputs into the context.
 */
function applyOutputMappings(
  step: StepDef,
  outputs: Record<string, unknown>,
  state: WorkflowRunState
): void {
  if (!step.outputMappings) return
  for (const [outputKey, contextField] of Object.entries(step.outputMappings)) {
    if (outputs[outputKey] !== undefined) {
      state.context[contextField] = outputs[outputKey]
    }
  }
}

import * as path from 'node:path'

/**
 * Apply smart defaults for context fields that have no explicit default.
 * - For directory-type fields (output_dir, etc.): suggest a sibling of the first directory input
 * - For number fields with min but no default: use the min value
 */
function applySmartDefaults(
  definition: WorkflowDefinition,
  inputs: Record<string, unknown>,
  context: Record<string, unknown>
): void {
  if (!definition.context?.fields) return

  // Find a directory-like input to derive output paths from
  let inputDir: string | undefined
  for (const [, inputDef] of Object.entries(definition.inputs)) {
    if (inputDef.type === 'dicom-folder' || inputDef.type === 'directory') {
      const val = Object.values(inputs).find((v) => typeof v === 'string' && v.length > 0) as string | undefined
      if (val) {
        inputDir = val
        break
      }
    }
  }

  for (const [key, field] of Object.entries(definition.context.fields)) {
    // Skip if already has a value
    if (context[key] !== undefined) continue

    // Smart default for directory/output_dir fields
    if ((field.type === 'directory' || key.includes('output_dir') || key.includes('out_dir')) && inputDir) {
      const parentDir = path.dirname(inputDir)
      context[key] = path.join(parentDir, `${definition.name}_output`)
      continue
    }

    // Smart default for numbers with min defined
    if (field.type === 'number' && field.min !== undefined && field.default === undefined) {
      context[key] = field.min
    }
  }
}

export function startWorkflow(
  name: string,
  inputs: Record<string, unknown>
): { runId: string; runState: WorkflowRunState; definition: WorkflowDefinition } {
  const definition = getWorkflowDefinitions().get(name)
  if (!definition) {
    throw new Error(`Unknown workflow: ${name}`)
  }

  // Infer form sections if the workflow has no explicit form definition
  if (!definition.form) {
    const tools = getToolDefinitions()
    const { sections, extraContextFields } = inferFormSections(definition, tools)

    if (sections.length > 0) {
      definition.form = { sections }
    }

    // Merge any discovered unbound-input fields into context
    if (Object.keys(extraContextFields).length > 0) {
      if (!definition.context) {
        definition.context = { fields: {} }
      }
      Object.assign(definition.context.fields, extraContextFields)
    }
  }

  // Initialize context from field defaults
  const context: Record<string, unknown> = {}
  if (definition.context?.fields) {
    for (const [key, field] of Object.entries(definition.context.fields)) {
      if (field.default !== undefined) {
        context[key] = field.default
      }
    }
  }

  // Apply smart defaults for fields without explicit defaults
  applySmartDefaults(definition, inputs, context)

  const runState: WorkflowRunState = {
    workflowName: name,
    inputs,
    context,
    stepOutputs: {},
    status: 'paused-for-form'
  }

  const runId = randomUUID()
  activeRuns.set(runId, runState)

  return { runId, runState, definition }
}

export function getRunState(runId: string): WorkflowRunState | undefined {
  return activeRuns.get(runId)
}

export function getDefinitionForRun(runId: string): WorkflowDefinition | undefined {
  const state = activeRuns.get(runId)
  if (!state) return undefined
  return getWorkflowDefinitions().get(state.workflowName)
}

/**
 * Determine which steps can run immediately (before the form).
 * A step is auto-runnable if all its input bindings reference only
 * `inputs.*` or use `constant` values — no `context.*` or `steps.*` refs.
 */
export function getAutoRunnableSteps(definition: WorkflowDefinition): string[] {
  const autoRunnable: string[] = []
  const resolved = new Set<string>()

  // Multi-pass: a step depending on another auto-runnable step is also auto-runnable
  let changed = true
  while (changed) {
    changed = false
    for (const [stepName, step] of Object.entries(definition.steps)) {
      if (resolved.has(stepName)) continue

      const canRun = Object.values(step.inputs).every((binding) => {
        if ('constant' in binding) return true
        const ref = (binding as { ref: string }).ref
        if (ref.startsWith('inputs.')) return true
        if (ref.startsWith('steps.')) {
          const depStep = ref.split('.')[1]
          return resolved.has(depStep)
        }
        return false
      })

      if (canRun) {
        autoRunnable.push(stepName)
        resolved.add(stepName)
        changed = true
      }
    }
  }

  return autoRunnable
}

export async function runHeuristic(
  runId: string,
  fieldName: string
): Promise<unknown> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition?.context?.fields[fieldName]) {
    throw new Error(`No context field: ${fieldName}`)
  }

  const field = definition.context.fields[fieldName]
  if (!field.heuristic) {
    throw new Error(`No heuristic for field: ${fieldName}`)
  }

  const heuristic = getHeuristic(field.heuristic)
  if (!heuristic) {
    throw new Error(`Unknown heuristic: ${field.heuristic}`)
  }

  const value = await heuristic(state.inputs, state.context)
  state.context[fieldName] = value
  return value
}

export function updateContext(
  runId: string,
  fieldName: string,
  value: unknown
): void {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const oldValue = state.context[fieldName]
  state.context[fieldName] = value

  // Invalidate steps that consume this context field (and their downstream)
  if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
    const def = getWorkflowDefinitions().get(state.workflowName)
    if (def) {
      for (const [stepName, step] of Object.entries(def.steps)) {
        const dependsOnField = Object.values(step.inputs).some(
          (b) => 'ref' in b && (b as { ref: string }).ref === `context.${fieldName}`
        )
        if (dependsOnField) {
          invalidateDownstream(runId, stepName, def, state)
        }
      }
    }
  }
}

export function resolveBinding(
  binding: Binding,
  runState: WorkflowRunState
): unknown {
  if ('constant' in binding) {
    return binding.constant
  }

  const ref = binding.ref
  const parts = ref.split('.')

  if (parts[0] === 'inputs') {
    if (parts.length < 2) throw new Error(`Invalid binding ref (missing input name): ${ref}`)
    return runState.inputs[parts[1]]
  }

  if (parts[0] === 'context') {
    if (parts.length === 1) {
      // { ref: "context" } → return the whole context object
      return { ...runState.context }
    }
    return runState.context[parts[1]]
  }

  if (parts[0] === 'steps') {
    // steps.Y.outputs.Z
    if (parts.length < 4) throw new Error(`Invalid binding ref (expected steps.<name>.outputs.<key>): ${ref}`)
    const stepName = parts[1]
    const outputName = parts[3]
    return runState.stepOutputs[stepName]?.[outputName]
  }

  throw new Error(`Cannot resolve binding ref: ${ref}`)
}

export async function executeStep(
  runId: string,
  stepName: string
): Promise<Record<string, unknown>> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition) throw new Error(`Definition not found: ${state.workflowName}`)

  const step = definition.steps[stepName]
  if (!step) throw new Error(`Unknown step: ${stepName}`)

  // Evaluate condition — skip step if condition resolves to falsy
  if (step.condition && !evaluateCondition(step.condition, state)) {
    const emptyOutputs: Record<string, unknown> = {}
    state.stepOutputs[stepName] = emptyOutputs
    return emptyOutputs
  }

  // Check cache — reuse previous outputs if inputs haven't changed
  const inputHash = computeInputHash(step, state, resolveBinding)
  const cached = getCachedOutput(runId, stepName, inputHash)
  if (cached) {
    state.stepOutputs[stepName] = cached
    for (const [outKey, outVal] of Object.entries(cached)) {
      state.context[`_stepOutputs_${stepName}_${outKey}`] = outVal
    }
    applyOutputMappings(step, cached, state)
    return cached
  }

  const executor = getToolExecutor(step.tool)
  if (!executor) throw new Error(`No executor for tool: ${step.tool}`)

  // Resolve input bindings
  const resolvedInputs: Record<string, unknown> = {}
  for (const [key, binding] of Object.entries(step.inputs)) {
    resolvedInputs[key] = resolveBinding(binding, state)
  }

  state.status = 'running'
  try {
    const outputs = await executor(resolvedInputs)
    state.stepOutputs[stepName] = outputs

    // Stash step outputs into context for heuristics that need them
    for (const [outKey, outVal] of Object.entries(outputs)) {
      state.context[`_stepOutputs_${stepName}_${outKey}`] = outVal
    }

    // Apply explicit outputMappings to context
    applyOutputMappings(step, outputs, state)

    // Store in cache
    setCachedOutput(runId, stepName, inputHash, outputs)

    return outputs
  } catch (err) {
    state.status = 'error'
    const msg = err instanceof Error ? err.message : String(err)
    state.error = `Step '${stepName}' (tool: ${step.tool}) failed: ${msg}`
    throw new Error(state.error, { cause: err })
  }
}

export async function executeAllSteps(
  runId: string
): Promise<Record<string, unknown>> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition) throw new Error(`Definition not found: ${state.workflowName}`)

  state.status = 'running'

  const stepNames = Object.keys(definition.steps)
  for (const stepName of stepNames) {
    if (state.stepOutputs[stepName]) continue // already executed
    await executeStep(runId, stepName)
  }

  state.status = 'completed'

  // Resolve workflow outputs
  const outputs: Record<string, unknown> = {}
  for (const [key, outputDef] of Object.entries(definition.outputs)) {
    outputs[key] = resolveBinding({ ref: outputDef.ref }, state)
  }

  // Clean up completed run to prevent memory leaks
  clearRunCache(runId)
  activeRuns.delete(runId)

  return outputs
}

/**
 * Run all auto-runnable steps (steps whose inputs don't depend on context/form).
 * Used when the dialog opens to prepare data for heuristics.
 */
export async function runAutoSteps(
  runId: string
): Promise<string[]> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition) throw new Error(`Definition not found: ${state.workflowName}`)

  const autoSteps = getAutoRunnableSteps(definition)
  const executed: string[] = []

  for (const stepName of autoSteps) {
    if (state.stepOutputs[stepName]) continue
    await executeStep(runId, stepName)
    executed.push(stepName)
  }

  state.status = 'paused-for-form'
  return executed
}

export async function runUpToStep(
  runId: string,
  targetStepName: string
): Promise<void> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition) throw new Error(`Definition not found: ${state.workflowName}`)

  const stepNames = Object.keys(definition.steps)
  for (const stepName of stepNames) {
    if (state.stepOutputs[stepName]) continue
    await executeStep(runId, stepName)
    if (stepName === targetStepName) {
      state.status = 'paused-for-form'
      return
    }
  }
}

/**
 * Run steps whose inputs are currently satisfied, up to a maximum step index.
 * Unlike runAutoSteps which only runs steps with no context dependencies,
 * this runs any step whose bindings now resolve — including steps that
 * depend on context values the user just filled in.
 *
 * @param maxStepIndex  Only consider steps up to this index (inclusive).
 *                      Pass -1 or omit to consider all steps.
 */
export async function runReadySteps(
  runId: string,
  maxStepIndex: number = -1
): Promise<string[]> {
  const state = activeRuns.get(runId)
  if (!state) throw new Error(`No active run: ${runId}`)

  const definition = getWorkflowDefinitions().get(state.workflowName)
  if (!definition) throw new Error(`Definition not found: ${state.workflowName}`)

  const executed: string[] = []

  const toolDefs = getToolDefinitions()
  const stepEntries = Object.entries(definition.steps)

  for (let idx = 0; idx < stepEntries.length; idx++) {
    if (maxStepIndex >= 0 && idx > maxStepIndex) break
    const [stepName, step] = stepEntries[idx]
    if (state.stepOutputs[stepName]) continue // already ran

    const executor = getToolExecutor(step.tool)
    if (!executor) continue

    const toolDef = toolDefs.get(step.tool)

    // Check if all REQUIRED inputs resolve to non-empty values
    let allResolved = true
    for (const [inputName, binding] of Object.entries(step.inputs)) {
      // Skip optional tool inputs
      const paramDef = toolDef?.inputs[inputName]
      if (paramDef?.optional) continue

      const value = resolveBinding(binding, state)
      if (value === undefined || value === null || value === '') {
        allResolved = false
        break
      }
    }

    // Also check required tool inputs that have no binding at all
    if (allResolved && toolDef) {
      for (const [inputName, paramDef] of Object.entries(toolDef.inputs)) {
        if (paramDef.optional) continue
        if (step.inputs[inputName]) continue // has a binding, already checked
        allResolved = false
        break
      }
    }

    // Skip steps whose output mappings write to context fields managed by heuristics.
    // During the form phase, heuristics handle these fields (e.g., subject exclusion).
    // The step will run during the final execute-all.
    if (allResolved && definition.context?.fields) {
      const outputMappingTargets = Object.values(step.outputMappings || {})
      const hasHeuristicTarget = outputMappingTargets.some((ctxField) => {
        const fieldDef = definition.context?.fields[ctxField]
        return fieldDef?.heuristic
      })
      if (hasHeuristicTarget) {
        continue
      }
    }

    if (allResolved) {
      await executeStep(runId, stepName)
      executed.push(stepName)
      // Only run one step per call — let heuristics handle the rest
      break
    }
  }

  if (executed.length > 0) {
    state.status = 'paused-for-form'
  }
  return executed
}

export function cancelRun(runId: string): void {
  activeRuns.delete(runId)
  clearRunCache(runId)
}
