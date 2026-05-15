import { createHash } from 'node:crypto'
import type {
  WorkflowDefinition,
  WorkflowRunState,
  StepDef,
  Binding
} from '../../common/workflowTypes.js'

interface CacheEntry {
  inputHash: string
  outputs: Record<string, unknown>
  timestamp: number
}

const runCaches = new Map<string, Map<string, CacheEntry>>()

function getStepCache(runId: string): Map<string, CacheEntry> {
  if (!runCaches.has(runId)) runCaches.set(runId, new Map())
  return runCaches.get(runId)!
}

/**
 * Compute a SHA-256 hash of the resolved inputs for a step.
 * Large binary data (ArrayBuffer, long strings) are truncated before hashing.
 */
export function computeInputHash(
  step: StepDef,
  runState: WorkflowRunState,
  resolveBinding: (b: Binding, s: WorkflowRunState) => unknown
): string {
  const resolved: Record<string, unknown> = {}
  for (const [key, binding] of Object.entries(step.inputs)) {
    resolved[key] = resolveBinding(binding, runState)
  }
  const serialized = JSON.stringify(resolved, (_k, v) => {
    if (v instanceof ArrayBuffer || (typeof v === 'string' && v.length > 10000)) {
      return `__hash:${createHash('sha256').update(String(v).slice(0, 10000)).digest('hex')}`
    }
    return v as unknown
  })
  return createHash('sha256').update(serialized).digest('hex')
}

export function getCachedOutput(
  runId: string,
  stepName: string,
  inputHash: string
): Record<string, unknown> | null {
  const cache = getStepCache(runId)
  const entry = cache.get(stepName)
  if (entry && entry.inputHash === inputHash) return entry.outputs
  return null
}

export function setCachedOutput(
  runId: string,
  stepName: string,
  inputHash: string,
  outputs: Record<string, unknown>
): void {
  const cache = getStepCache(runId)
  cache.set(stepName, { inputHash, outputs, timestamp: Date.now() })
}

/**
 * Invalidate cached outputs for steps that transitively depend on the changed step.
 * Also removes the corresponding stepOutputs entries from the run state.
 * Returns the names of all invalidated steps.
 */
export function invalidateDownstream(
  runId: string,
  changedStepName: string,
  definition: WorkflowDefinition,
  state: WorkflowRunState
): string[] {
  const invalidated: string[] = []
  const cache = getStepCache(runId)
  const stepNames = Object.keys(definition.steps)
  const invalidatedSet = new Set<string>([changedStepName])

  // Remove the changed step's cache entry
  cache.delete(changedStepName)
  delete state.stepOutputs[changedStepName]

  let foundChanged = false
  for (const name of stepNames) {
    if (name === changedStepName) {
      foundChanged = true
      continue
    }
    if (!foundChanged) continue

    const step = definition.steps[name]
    const dependsOnInvalidated = Object.values(step.inputs).some((binding) => {
      if (!('ref' in binding)) return false
      const ref = (binding as { ref: string }).ref
      if (!ref.startsWith('steps.')) return false
      const depStep = ref.split('.')[1]
      return invalidatedSet.has(depStep)
    })

    if (dependsOnInvalidated) {
      cache.delete(name)
      delete state.stepOutputs[name]
      invalidatedSet.add(name)
      invalidated.push(name)
    }
  }
  return invalidated
}

export function clearRunCache(runId: string): void {
  runCaches.delete(runId)
}
