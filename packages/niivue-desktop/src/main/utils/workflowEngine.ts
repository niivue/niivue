import { randomUUID } from 'node:crypto'
import type {
  WorkflowDefinition,
  WorkflowRunState,
  StepDef,
  Binding
} from '../../common/workflowTypes.js'
import { getWorkflowDefinitions } from './workflowLoader.js'
import { getToolExecutor } from './toolRegistry.js'
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

export function startWorkflow(
  name: string,
  inputs: Record<string, unknown>
): { runId: string; runState: WorkflowRunState; definition: WorkflowDefinition } {
  const definition = getWorkflowDefinitions().get(name)
  if (!definition) {
    throw new Error(`Unknown workflow: ${name}`)
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

export function cancelRun(runId: string): void {
  activeRuns.delete(runId)
  clearRunCache(runId)
}
