/**
 * Engine for executing declarative heuristic definitions (.heuristic.json).
 * Interprets a chain of operations against workflow inputs/context
 * without requiring user-written TypeScript.
 */

import type { HeuristicFn } from '../../common/workflowTypes.js'

// ── Types mirroring heuristic.schema.json ──────────────────────────

export interface HeuristicOperation {
  op: string
  field?: string
  operator?: string
  value?: unknown
  fields?: string[]
  order?: 'asc' | 'desc'
  contextField?: string
  targetField?: string
  template?: string
  description?: string
}

export interface HeuristicDefinition {
  name: string
  version: string
  description: string
  preserveExisting?: boolean
  source: string
  operations: HeuristicOperation[]
  output: string
}

// ── Dot-path resolver ──────────────────────────────────────────────

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function resolveSource(
  source: string,
  inputs: Record<string, unknown>,
  context: Record<string, unknown>
): unknown {
  if (source.startsWith('inputs.')) {
    return resolvePath(inputs, source.slice('inputs.'.length))
  }
  if (source.startsWith('context.')) {
    return resolvePath(context, source.slice('context.'.length))
  }
  // Allow bare context field names for convenience
  return context[source]
}

// ── Comparison helpers ─────────────────────────────────────────────

function compare(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'eq': return actual === expected
    case 'neq': return actual !== expected
    case 'gt': return (actual as number) > (expected as number)
    case 'gte': return (actual as number) >= (expected as number)
    case 'lt': return (actual as number) < (expected as number)
    case 'lte': return (actual as number) <= (expected as number)
    case 'contains':
      if (typeof actual === 'string') return actual.includes(String(expected))
      if (Array.isArray(actual)) return actual.includes(expected)
      return false
    case 'not-contains':
      return !compare(actual, 'contains', expected)
    case 'starts-with':
      return typeof actual === 'string' && actual.startsWith(String(expected))
    case 'ends-with':
      return typeof actual === 'string' && actual.endsWith(String(expected))
    case 'matches':
      return typeof actual === 'string' && new RegExp(String(expected)).test(actual)
    case 'exists':
      return actual !== undefined && actual !== null
    case 'not-exists':
      return actual === undefined || actual === null
    case 'in':
      return Array.isArray(expected) && expected.includes(actual)
    case 'not-in':
      return Array.isArray(expected) && !expected.includes(actual)
    default:
      return false
  }
}

// ── Operation executors ────────────────────────────────────────────

function execFilter(data: unknown[], op: HeuristicOperation): unknown[] {
  if (!op.field || !op.operator) return data
  return data.filter((item) => {
    const val = resolvePath(item, op.field!)
    return compare(val, op.operator!, op.value)
  })
}

function execMap(data: unknown[], op: HeuristicOperation): unknown[] {
  if (!op.field) return data
  return data.map((item) => resolvePath(item, op.field!))
}

function execSort(data: unknown[], op: HeuristicOperation): unknown[] {
  if (!op.field) return data
  const dir = op.order === 'desc' ? -1 : 1
  return [...data].sort((a, b) => {
    const va = resolvePath(a, op.field!) as string | number
    const vb = resolvePath(b, op.field!) as string | number
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}

function execGroupBy(data: unknown[], op: HeuristicOperation): Record<string, unknown[]> {
  if (!op.field) return { default: data }
  const groups: Record<string, unknown[]> = {}
  for (const item of data) {
    const key = String(resolvePath(item, op.field!) ?? 'undefined')
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

function execPickFields(data: unknown[], op: HeuristicOperation): unknown[] {
  if (!op.fields || op.fields.length === 0) return data
  return data.map((item) => {
    const picked: Record<string, unknown> = {}
    for (const f of op.fields!) {
      picked[f] = resolvePath(item, f)
    }
    return picked
  })
}

function execSetField(
  data: unknown[],
  op: HeuristicOperation,
  context: Record<string, unknown>
): unknown[] {
  if (!op.targetField) return data
  return data.map((item) => {
    const obj = { ...(item as Record<string, unknown>) }
    if (op.contextField) {
      // Lookup value from context
      obj[op.targetField!] = resolvePath(context, op.contextField)
    } else if (op.template) {
      // Template string with {{field}} placeholders
      obj[op.targetField!] = op.template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
        return String(resolvePath(item, path) ?? '')
      })
    } else {
      obj[op.targetField!] = op.value
    }
    return obj
  })
}

function execMerge(data: unknown[], op: HeuristicOperation, context: Record<string, unknown>): unknown[] {
  if (!op.contextField) return data
  const mergeSource = resolvePath(context, op.contextField) as Record<string, unknown>[] | undefined
  if (!Array.isArray(mergeSource)) return data

  // Merge by index
  return data.map((item, i) => {
    if (i < mergeSource.length && typeof mergeSource[i] === 'object') {
      return { ...(item as Record<string, unknown>), ...(mergeSource[i] as Record<string, unknown>) }
    }
    return item
  })
}

function execTemplate(data: unknown, op: HeuristicOperation): string {
  if (!op.template) return String(data)
  return op.template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
    if (typeof data === 'object' && data !== null) {
      return String(resolvePath(data, path) ?? '')
    }
    return String(data ?? '')
  })
}

// ── Main engine ────────────────────────────────────────────────────

function applyOperations(
  data: unknown,
  operations: HeuristicOperation[],
  context: Record<string, unknown>
): unknown {
  let current = data

  for (const op of operations) {
    switch (op.op) {
      case 'filter':
        if (Array.isArray(current)) current = execFilter(current, op)
        break

      case 'map':
        if (Array.isArray(current)) current = execMap(current, op)
        break

      case 'sort':
        if (Array.isArray(current)) current = execSort(current, op)
        break

      case 'group-by':
        if (Array.isArray(current)) current = execGroupBy(current, op)
        break

      case 'flatten':
        if (Array.isArray(current)) current = current.flat()
        break

      case 'unique':
        if (Array.isArray(current)) {
          if (op.field) {
            const seen = new Set()
            current = current.filter((item) => {
              const val = resolvePath(item, op.field!)
              if (seen.has(val)) return false
              seen.add(val)
              return true
            })
          } else {
            current = [...new Set(current)]
          }
        }
        break

      case 'count':
        current = Array.isArray(current) ? current.length : 0
        break

      case 'first':
        current = Array.isArray(current) ? current[0] : current
        break

      case 'last':
        current = Array.isArray(current) ? current[current.length - 1] : current
        break

      case 'default':
        if (current === undefined || current === null || (Array.isArray(current) && current.length === 0)) {
          current = op.value
        }
        break

      case 'lookup':
        if (op.contextField) {
          current = resolvePath(context, op.contextField)
        }
        break

      case 'set-field':
        if (Array.isArray(current)) current = execSetField(current, op, context)
        break

      case 'merge':
        if (Array.isArray(current)) current = execMerge(current, op, context)
        break

      case 'pick-fields':
        if (Array.isArray(current)) current = execPickFields(current, op)
        break

      case 'template':
        current = execTemplate(current, op)
        break
    }
  }

  return current
}

/**
 * Create a HeuristicFn from a declarative HeuristicDefinition.
 */
export function createDeclarativeHeuristic(def: HeuristicDefinition): HeuristicFn {
  return async (inputs: Record<string, unknown>, context: Record<string, unknown>): Promise<unknown> => {
    // If preserveExisting is set and the target field already has data, return it
    if (def.preserveExisting) {
      // The heuristic doesn't know which field it's writing to, but the engine
      // will store the result. The convention is that if the source field itself
      // has data, preserve it.
      const existing = resolveSource(def.source, inputs, context)
      if (existing !== undefined && existing !== null) {
        if (Array.isArray(existing) && existing.length > 0) return existing
        if (typeof existing === 'object' && Object.keys(existing).length > 0) return existing
        if (typeof existing !== 'object') return existing
      }
    }

    const sourceData = resolveSource(def.source, inputs, context)
    return applyOperations(sourceData, def.operations, context)
  }
}
