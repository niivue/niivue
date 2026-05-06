import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: false, getPath: () => '/tmp' } }))

import {
  resolvePath,
  resolveSource,
  compare,
  execFilter,
  execMap,
  execSort,
  execGroupBy,
  execPickFields,
  execSetField,
  execMerge,
  execTemplate,
  applyOperations,
  createDeclarativeHeuristic
} from '../../src/main/utils/declarativeHeuristic.js'
import {
  registerHeuristic,
  getHeuristic,
  getHeuristicNames
} from '../../src/main/utils/heuristicRegistry.js'
import type { HeuristicOperation, HeuristicDefinition } from '../../src/main/utils/declarativeHeuristic.js'

// ── resolvePath ────────────────────────────────────────────────────

describe('resolvePath', () => {
  it('resolves a simple key', () => {
    expect(resolvePath({ a: 1 }, 'a')).toBe(1)
  })

  it('resolves a nested key', () => {
    expect(resolvePath({ a: { b: 2 } }, 'a.b')).toBe(2)
  })

  it('returns undefined for a missing key', () => {
    expect(resolvePath({ a: 1 }, 'b')).toBeUndefined()
  })

  it('returns undefined for a null object', () => {
    expect(resolvePath(null, 'a')).toBeUndefined()
  })

  it('returns undefined for an undefined object', () => {
    expect(resolvePath(undefined, 'a')).toBeUndefined()
  })

  it('resolves deeply nested paths', () => {
    expect(resolvePath({ a: { b: { c: { d: 42 } } } }, 'a.b.c.d')).toBe(42)
  })

  it('returns undefined when intermediate is not an object', () => {
    expect(resolvePath({ a: 'string' }, 'a.b')).toBeUndefined()
  })
})

// ── resolveSource ──────────────────────────────────────────────────

describe('resolveSource', () => {
  const inputs = { dicom_dir: '/data', nested: { val: 10 } }
  const context = { series: [1, 2], deep: { info: 'yes' } }

  it('resolves inputs. prefix', () => {
    expect(resolveSource('inputs.dicom_dir', inputs, context)).toBe('/data')
  })

  it('resolves nested inputs path', () => {
    expect(resolveSource('inputs.nested.val', inputs, context)).toBe(10)
  })

  it('resolves context. prefix', () => {
    expect(resolveSource('context.series', inputs, context)).toEqual([1, 2])
  })

  it('resolves nested context path', () => {
    expect(resolveSource('context.deep.info', inputs, context)).toBe('yes')
  })

  it('resolves bare context field name', () => {
    expect(resolveSource('series', inputs, context)).toEqual([1, 2])
  })
})

// ── compare ────────────────────────────────────────────────────────

describe('compare', () => {
  // Equality
  it('eq: returns true for equal values', () => {
    expect(compare(5, 'eq', 5)).toBe(true)
    expect(compare('abc', 'eq', 'abc')).toBe(true)
  })

  it('eq: returns false for different values', () => {
    expect(compare(5, 'eq', 6)).toBe(false)
  })

  // Not equal
  it('neq: returns true for different values', () => {
    expect(compare(5, 'neq', 6)).toBe(true)
  })

  it('neq: returns false for equal values', () => {
    expect(compare(5, 'neq', 5)).toBe(false)
  })

  // Numeric comparisons
  it('gt: greater than', () => {
    expect(compare(10, 'gt', 5)).toBe(true)
    expect(compare(5, 'gt', 10)).toBe(false)
    expect(compare(5, 'gt', 5)).toBe(false)
  })

  it('gte: greater than or equal', () => {
    expect(compare(10, 'gte', 5)).toBe(true)
    expect(compare(5, 'gte', 5)).toBe(true)
    expect(compare(4, 'gte', 5)).toBe(false)
  })

  it('lt: less than', () => {
    expect(compare(3, 'lt', 5)).toBe(true)
    expect(compare(5, 'lt', 3)).toBe(false)
    expect(compare(5, 'lt', 5)).toBe(false)
  })

  it('lte: less than or equal', () => {
    expect(compare(3, 'lte', 5)).toBe(true)
    expect(compare(5, 'lte', 5)).toBe(true)
    expect(compare(6, 'lte', 5)).toBe(false)
  })

  // Contains
  it('contains: string contains substring', () => {
    expect(compare('hello world', 'contains', 'world')).toBe(true)
    expect(compare('hello world', 'contains', 'xyz')).toBe(false)
  })

  it('contains: array contains element', () => {
    expect(compare([1, 2, 3], 'contains', 2)).toBe(true)
    expect(compare([1, 2, 3], 'contains', 4)).toBe(false)
  })

  it('contains: returns false for non-string non-array', () => {
    expect(compare(42, 'contains', '4')).toBe(false)
  })

  // Not contains
  it('not-contains: inverse of contains', () => {
    expect(compare('hello', 'not-contains', 'xyz')).toBe(true)
    expect(compare('hello', 'not-contains', 'ell')).toBe(false)
    expect(compare([1, 2], 'not-contains', 3)).toBe(true)
    expect(compare([1, 2], 'not-contains', 1)).toBe(false)
  })

  // Starts/ends with
  it('starts-with: checks string prefix', () => {
    expect(compare('foobar', 'starts-with', 'foo')).toBe(true)
    expect(compare('foobar', 'starts-with', 'bar')).toBe(false)
  })

  it('starts-with: returns false for non-string', () => {
    expect(compare(123, 'starts-with', '1')).toBe(false)
  })

  it('ends-with: checks string suffix', () => {
    expect(compare('foobar', 'ends-with', 'bar')).toBe(true)
    expect(compare('foobar', 'ends-with', 'foo')).toBe(false)
  })

  it('ends-with: returns false for non-string', () => {
    expect(compare(123, 'ends-with', '3')).toBe(false)
  })

  // Matches (regex)
  it('matches: regex matching', () => {
    expect(compare('abc123', 'matches', '^abc\\d+')).toBe(true)
    expect(compare('xyz', 'matches', '^abc')).toBe(false)
  })

  it('matches: returns false for non-string', () => {
    expect(compare(123, 'matches', '\\d+')).toBe(false)
  })

  it('matches: rejects catastrophic patterns with nested unbounded quantifiers', () => {
    expect(() => compare('aaaaaaaaaaaaaaaa!', 'matches', '(a+)+$')).toThrow(
      /nested unbounded quantifiers/
    )
    expect(() => compare('xxxxxxxx', 'matches', '(.*)*')).toThrow(/nested unbounded quantifiers/)
    expect(() => compare('xxxx', 'matches', '(\\w+)*$')).toThrow(/nested unbounded quantifiers/)
    expect(() => compare('xx', 'matches', '(a*){5,}')).toThrow(/nested unbounded quantifiers/)
  })

  it('matches: rejects pattern strings longer than the safety cap', () => {
    const huge = 'a'.repeat(1500)
    expect(() => compare('foo', 'matches', huge)).toThrow(/exceeds/)
  })

  it('matches: returns false for inputs longer than the safety cap', () => {
    // Long input + simple pattern should not throw, just short-circuit
    const longInput = 'a'.repeat(20_000)
    expect(compare(longInput, 'matches', '^a+$')).toBe(false)
  })

  // Exists / not-exists
  it('exists: true when value is present', () => {
    expect(compare(0, 'exists', undefined)).toBe(true)
    expect(compare('', 'exists', undefined)).toBe(true)
    expect(compare(false, 'exists', undefined)).toBe(true)
  })

  it('exists: false when value is null or undefined', () => {
    expect(compare(null, 'exists', undefined)).toBe(false)
    expect(compare(undefined, 'exists', undefined)).toBe(false)
  })

  it('not-exists: true when value is null or undefined', () => {
    expect(compare(null, 'not-exists', undefined)).toBe(true)
    expect(compare(undefined, 'not-exists', undefined)).toBe(true)
  })

  it('not-exists: false when value is present', () => {
    expect(compare(0, 'not-exists', undefined)).toBe(false)
  })

  // In / not-in
  it('in: checks if value is in array', () => {
    expect(compare('a', 'in', ['a', 'b', 'c'])).toBe(true)
    expect(compare('z', 'in', ['a', 'b', 'c'])).toBe(false)
  })

  it('in: returns false if expected is not an array', () => {
    expect(compare('a', 'in', 'abc')).toBe(false)
  })

  it('not-in: checks if value is not in array', () => {
    expect(compare('z', 'not-in', ['a', 'b'])).toBe(true)
    expect(compare('a', 'not-in', ['a', 'b'])).toBe(false)
  })

  it('not-in: returns false if expected is not an array', () => {
    expect(compare('a', 'not-in', 'abc')).toBe(false)
  })

  // Unknown operator
  it('returns false for unknown operator', () => {
    expect(compare(1, 'bogus', 1)).toBe(false)
  })
})

// ── execFilter ─────────────────────────────────────────────────────

describe('execFilter', () => {
  const data = [
    { name: 'T1', modality: 'anat' },
    { name: 'BOLD', modality: 'func' },
    { name: 'DWI', modality: 'dwi' }
  ]

  it('filters by field and operator', () => {
    const op: HeuristicOperation = { op: 'filter', field: 'modality', operator: 'eq', value: 'func' }
    expect(execFilter(data, op)).toEqual([{ name: 'BOLD', modality: 'func' }])
  })

  it('returns original data when field is missing', () => {
    const op: HeuristicOperation = { op: 'filter', operator: 'eq', value: 'x' }
    expect(execFilter(data, op)).toEqual(data)
  })

  it('returns original data when operator is missing', () => {
    const op: HeuristicOperation = { op: 'filter', field: 'modality', value: 'x' }
    expect(execFilter(data, op)).toEqual(data)
  })

  it('returns empty array when no items match', () => {
    const op: HeuristicOperation = { op: 'filter', field: 'modality', operator: 'eq', value: 'pet' }
    expect(execFilter(data, op)).toEqual([])
  })
})

// ── execMap ────────────────────────────────────────────────────────

describe('execMap', () => {
  const data = [
    { name: 'T1', val: 10 },
    { name: 'T2', val: 20 }
  ]

  it('projects to field values', () => {
    const op: HeuristicOperation = { op: 'map', field: 'name' }
    expect(execMap(data, op)).toEqual(['T1', 'T2'])
  })

  it('returns original data when field is missing', () => {
    const op: HeuristicOperation = { op: 'map' }
    expect(execMap(data, op)).toEqual(data)
  })
})

// ── execSort ───────────────────────────────────────────────────────

describe('execSort', () => {
  const data = [
    { name: 'C', order: 3 },
    { name: 'A', order: 1 },
    { name: 'B', order: 2 }
  ]

  it('sorts ascending by default', () => {
    const op: HeuristicOperation = { op: 'sort', field: 'order' }
    const result = execSort(data, op) as Array<{ name: string; order: number }>
    expect(result.map((r) => r.name)).toEqual(['A', 'B', 'C'])
  })

  it('sorts descending when specified', () => {
    const op: HeuristicOperation = { op: 'sort', field: 'order', order: 'desc' }
    const result = execSort(data, op) as Array<{ name: string; order: number }>
    expect(result.map((r) => r.name)).toEqual(['C', 'B', 'A'])
  })

  it('returns original data when field is missing', () => {
    const op: HeuristicOperation = { op: 'sort' }
    expect(execSort(data, op)).toEqual(data)
  })

  it('does not mutate the original array', () => {
    const op: HeuristicOperation = { op: 'sort', field: 'order' }
    const copy = [...data]
    execSort(data, op)
    expect(data).toEqual(copy)
  })
})

// ── execGroupBy ────────────────────────────────────────────────────

describe('execGroupBy', () => {
  const data = [
    { type: 'anat', name: 'T1' },
    { type: 'func', name: 'BOLD' },
    { type: 'anat', name: 'FLAIR' }
  ]

  it('groups by field', () => {
    const op: HeuristicOperation = { op: 'group-by', field: 'type' }
    const result = execGroupBy(data, op)
    expect(Object.keys(result)).toEqual(['anat', 'func'])
    expect(result['anat']).toHaveLength(2)
    expect(result['func']).toHaveLength(1)
  })

  it('returns default group when field is missing', () => {
    const op: HeuristicOperation = { op: 'group-by' }
    const result = execGroupBy(data, op)
    expect(result).toEqual({ default: data })
  })

  it('groups undefined field values under "undefined"', () => {
    const items = [{ a: 1 }, { a: 2, type: 'x' }]
    const op: HeuristicOperation = { op: 'group-by', field: 'type' }
    const result = execGroupBy(items, op)
    expect(result['undefined']).toHaveLength(1)
    expect(result['x']).toHaveLength(1)
  })
})

// ── execPickFields ─────────────────────────────────────────────────

describe('execPickFields', () => {
  const data = [
    { name: 'T1', modality: 'anat', size: 100 },
    { name: 'BOLD', modality: 'func', size: 200 }
  ]

  it('selects specified fields', () => {
    const op: HeuristicOperation = { op: 'pick-fields', fields: ['name', 'modality'] }
    expect(execPickFields(data, op)).toEqual([
      { name: 'T1', modality: 'anat' },
      { name: 'BOLD', modality: 'func' }
    ])
  })

  it('returns original data when fields is empty', () => {
    const op: HeuristicOperation = { op: 'pick-fields', fields: [] }
    expect(execPickFields(data, op)).toEqual(data)
  })

  it('returns original data when fields is undefined', () => {
    const op: HeuristicOperation = { op: 'pick-fields' }
    expect(execPickFields(data, op)).toEqual(data)
  })
})

// ── execSetField ───────────────────────────────────────────────────

describe('execSetField', () => {
  const data = [
    { name: 'T1', modality: 'anat' },
    { name: 'BOLD', modality: 'func' }
  ]
  const context = { outputDir: '/out', extra: { val: 99 } }

  it('sets field from context', () => {
    const op: HeuristicOperation = { op: 'set-field', targetField: 'dir', contextField: 'outputDir' }
    const result = execSetField(data, op, context) as Array<Record<string, unknown>>
    expect(result[0].dir).toBe('/out')
    expect(result[1].dir).toBe('/out')
  })

  it('sets field from nested context', () => {
    const op: HeuristicOperation = { op: 'set-field', targetField: 'v', contextField: 'extra.val' }
    const result = execSetField(data, op, context) as Array<Record<string, unknown>>
    expect(result[0].v).toBe(99)
  })

  it('sets field from template', () => {
    const op: HeuristicOperation = { op: 'set-field', targetField: 'label', template: '{{name}}_{{modality}}' }
    const result = execSetField(data, op, context) as Array<Record<string, unknown>>
    expect(result[0].label).toBe('T1_anat')
    expect(result[1].label).toBe('BOLD_func')
  })

  it('sets field from literal value', () => {
    const op: HeuristicOperation = { op: 'set-field', targetField: 'flag', value: true }
    const result = execSetField(data, op, context) as Array<Record<string, unknown>>
    expect(result[0].flag).toBe(true)
  })

  it('returns original data when targetField is missing', () => {
    const op: HeuristicOperation = { op: 'set-field', value: 'x' }
    expect(execSetField(data, op, context)).toEqual(data)
  })
})

// ── execMerge ──────────────────────────────────────────────────────

describe('execMerge', () => {
  const data = [
    { name: 'A' },
    { name: 'B' },
    { name: 'C' }
  ]

  it('merges context array by index', () => {
    const context = { extra: [{ score: 1 }, { score: 2 }, { score: 3 }] }
    const op: HeuristicOperation = { op: 'merge', contextField: 'extra' }
    const result = execMerge(data, op, context) as Array<Record<string, unknown>>
    expect(result[0]).toEqual({ name: 'A', score: 1 })
    expect(result[2]).toEqual({ name: 'C', score: 3 })
  })

  it('leaves unmatched items unchanged when merge source is shorter', () => {
    const context = { extra: [{ score: 1 }] }
    const op: HeuristicOperation = { op: 'merge', contextField: 'extra' }
    const result = execMerge(data, op, context) as Array<Record<string, unknown>>
    expect(result[0]).toEqual({ name: 'A', score: 1 })
    expect(result[1]).toEqual({ name: 'B' })
  })

  it('returns original data when contextField is missing', () => {
    const op: HeuristicOperation = { op: 'merge' }
    expect(execMerge(data, op, {})).toEqual(data)
  })

  it('returns original data when context value is not an array', () => {
    const context = { extra: 'not-array' }
    const op: HeuristicOperation = { op: 'merge', contextField: 'extra' }
    expect(execMerge(data, op, context)).toEqual(data)
  })
})

// ── execTemplate ───────────────────────────────────────────────────

describe('execTemplate', () => {
  it('substitutes fields from an object', () => {
    const data = { name: 'T1', modality: 'anat' }
    const op: HeuristicOperation = { op: 'template', template: 'sub-01_{{modality}}_{{name}}' }
    expect(execTemplate(data, op)).toBe('sub-01_anat_T1')
  })

  it('replaces missing fields with empty string', () => {
    const data = { name: 'T1' }
    const op: HeuristicOperation = { op: 'template', template: '{{name}}_{{missing}}' }
    expect(execTemplate(data, op)).toBe('T1_')
  })

  it('returns string of data when template is missing', () => {
    const op: HeuristicOperation = { op: 'template' }
    expect(execTemplate(42, op)).toBe('42')
  })

  it('handles non-object data with template', () => {
    const op: HeuristicOperation = { op: 'template', template: 'val={{value}}' }
    expect(execTemplate('hello', op)).toBe('val=hello')
  })

  it('handles null data with template', () => {
    const op: HeuristicOperation = { op: 'template', template: 'val={{x}}' }
    expect(execTemplate(null, op)).toBe('val=')
  })
})

// ── applyOperations ────────────────────────────────────────────────

describe('applyOperations', () => {
  const context: Record<string, unknown> = { outputDir: '/out' }

  it('chains multiple operations', () => {
    const data = [
      { name: 'T1', modality: 'anat', order: 2 },
      { name: 'BOLD', modality: 'func', order: 1 },
      { name: 'FLAIR', modality: 'anat', order: 3 }
    ]
    const ops: HeuristicOperation[] = [
      { op: 'filter', field: 'modality', operator: 'eq', value: 'anat' },
      { op: 'sort', field: 'order' },
      { op: 'map', field: 'name' }
    ]
    expect(applyOperations(data, ops, context)).toEqual(['T1', 'FLAIR'])
  })

  it('handles empty array', () => {
    const ops: HeuristicOperation[] = [
      { op: 'filter', field: 'x', operator: 'eq', value: 'y' }
    ]
    expect(applyOperations([], ops, context)).toEqual([])
  })

  it('flatten flattens nested arrays', () => {
    const data = [[1, 2], [3, 4], [5]]
    const ops: HeuristicOperation[] = [{ op: 'flatten' }]
    expect(applyOperations(data, ops, context)).toEqual([1, 2, 3, 4, 5])
  })

  it('unique removes duplicate primitives', () => {
    const data = [1, 2, 2, 3, 1]
    const ops: HeuristicOperation[] = [{ op: 'unique' }]
    expect(applyOperations(data, ops, context)).toEqual([1, 2, 3])
  })

  it('unique with field removes duplicates by field', () => {
    const data = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 1, name: 'A2' }
    ]
    const ops: HeuristicOperation[] = [{ op: 'unique', field: 'id' }]
    const result = applyOperations(data, ops, context) as Array<{ id: number; name: string }>
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('A')
    expect(result[1].name).toBe('B')
  })

  it('count returns array length', () => {
    const ops: HeuristicOperation[] = [{ op: 'count' }]
    expect(applyOperations([1, 2, 3], ops, context)).toBe(3)
  })

  it('count returns 0 for non-array', () => {
    const ops: HeuristicOperation[] = [{ op: 'count' }]
    expect(applyOperations('string', ops, context)).toBe(0)
  })

  it('first returns first element', () => {
    const ops: HeuristicOperation[] = [{ op: 'first' }]
    expect(applyOperations([10, 20, 30], ops, context)).toBe(10)
  })

  it('first returns non-array data as-is', () => {
    const ops: HeuristicOperation[] = [{ op: 'first' }]
    expect(applyOperations('hello', ops, context)).toBe('hello')
  })

  it('last returns last element', () => {
    const ops: HeuristicOperation[] = [{ op: 'last' }]
    expect(applyOperations([10, 20, 30], ops, context)).toBe(30)
  })

  it('last returns non-array data as-is', () => {
    const ops: HeuristicOperation[] = [{ op: 'last' }]
    expect(applyOperations(42, ops, context)).toBe(42)
  })

  it('default provides fallback for undefined', () => {
    const ops: HeuristicOperation[] = [{ op: 'default', value: 'fallback' }]
    expect(applyOperations(undefined, ops, context)).toBe('fallback')
  })

  it('default provides fallback for null', () => {
    const ops: HeuristicOperation[] = [{ op: 'default', value: 'fallback' }]
    expect(applyOperations(null, ops, context)).toBe('fallback')
  })

  it('default provides fallback for empty array', () => {
    const ops: HeuristicOperation[] = [{ op: 'default', value: [] }]
    expect(applyOperations([], ops, context)).toEqual([])
  })

  it('default does not override existing value', () => {
    const ops: HeuristicOperation[] = [{ op: 'default', value: 'fallback' }]
    expect(applyOperations('actual', ops, context)).toBe('actual')
  })

  it('lookup retrieves value from context', () => {
    const ops: HeuristicOperation[] = [{ op: 'lookup', contextField: 'outputDir' }]
    expect(applyOperations(null, ops, context)).toBe('/out')
  })

  it('set-field adds field to array items', () => {
    const data = [{ name: 'A' }]
    const ops: HeuristicOperation[] = [{ op: 'set-field', targetField: 'tag', value: 'ok' }]
    const result = applyOperations(data, ops, context) as Array<Record<string, unknown>>
    expect(result[0].tag).toBe('ok')
  })

  it('merge merges context array', () => {
    const data = [{ name: 'A' }]
    const ctx = { extra: [{ score: 5 }] }
    const ops: HeuristicOperation[] = [{ op: 'merge', contextField: 'extra' }]
    const result = applyOperations(data, ops, ctx) as Array<Record<string, unknown>>
    expect(result[0]).toEqual({ name: 'A', score: 5 })
  })

  it('pick-fields selects fields', () => {
    const data = [{ name: 'A', x: 1, y: 2 }]
    const ops: HeuristicOperation[] = [{ op: 'pick-fields', fields: ['name'] }]
    const result = applyOperations(data, ops, context) as Array<Record<string, unknown>>
    expect(result[0]).toEqual({ name: 'A' })
  })

  it('template formats data', () => {
    const data = { name: 'T1' }
    const ops: HeuristicOperation[] = [{ op: 'template', template: 'scan_{{name}}' }]
    expect(applyOperations(data, ops, context)).toBe('scan_T1')
  })

  it('group-by groups array items', () => {
    const data = [
      { type: 'a', v: 1 },
      { type: 'b', v: 2 },
      { type: 'a', v: 3 }
    ]
    const ops: HeuristicOperation[] = [{ op: 'group-by', field: 'type' }]
    const result = applyOperations(data, ops, context) as Record<string, unknown[]>
    expect(result['a']).toHaveLength(2)
    expect(result['b']).toHaveLength(1)
  })

  it('skips array operations on non-array data', () => {
    const ops: HeuristicOperation[] = [
      { op: 'filter', field: 'x', operator: 'eq', value: 1 },
      { op: 'map', field: 'x' },
      { op: 'sort', field: 'x' },
      { op: 'flatten' },
      { op: 'unique' },
      { op: 'set-field', targetField: 'y', value: 1 },
      { op: 'merge', contextField: 'z' },
      { op: 'pick-fields', fields: ['x'] },
      { op: 'group-by', field: 'x' }
    ]
    // Non-array data should pass through unchanged
    expect(applyOperations('hello', ops, context)).toBe('hello')
  })
})

// ── createDeclarativeHeuristic ─────────────────────────────────────

describe('createDeclarativeHeuristic', () => {
  it('creates a heuristic function from a definition', async () => {
    const def: HeuristicDefinition = {
      name: 'test-heuristic',
      version: '1.0',
      description: 'Test',
      source: 'context.items',
      operations: [
        { op: 'filter', field: 'active', operator: 'eq', value: true },
        { op: 'map', field: 'name' }
      ],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const inputs = {}
    const context = {
      items: [
        { name: 'A', active: true },
        { name: 'B', active: false },
        { name: 'C', active: true }
      ]
    }

    const result = await fn(inputs, context)
    expect(result).toEqual(['A', 'C'])
  })

  it('preserveExisting returns existing array data', async () => {
    const def: HeuristicDefinition = {
      name: 'preserve-test',
      version: '1.0',
      description: 'Test preserve',
      preserveExisting: true,
      source: 'context.items',
      operations: [{ op: 'map', field: 'name' }],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const context = { items: [{ name: 'A' }, { name: 'B' }] }

    const result = await fn({}, context)
    // Source has data, so preserveExisting returns it as-is
    expect(result).toEqual([{ name: 'A' }, { name: 'B' }])
  })

  it('preserveExisting returns existing non-object data', async () => {
    const def: HeuristicDefinition = {
      name: 'preserve-primitive',
      version: '1.0',
      description: 'Test preserve primitive',
      preserveExisting: true,
      source: 'context.value',
      operations: [],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const result = await fn({}, { value: 42 })
    expect(result).toBe(42)
  })

  it('preserveExisting falls through when source is empty', async () => {
    const def: HeuristicDefinition = {
      name: 'preserve-empty',
      version: '1.0',
      description: 'Test preserve empty',
      preserveExisting: true,
      source: 'context.items',
      operations: [{ op: 'default', value: 'fallback' }],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const result = await fn({}, { items: [] })
    expect(result).toBe('fallback')
  })

  it('preserveExisting falls through when source is null', async () => {
    const def: HeuristicDefinition = {
      name: 'preserve-null',
      version: '1.0',
      description: 'Test preserve null',
      preserveExisting: true,
      source: 'context.items',
      operations: [{ op: 'default', value: 'fallback' }],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const result = await fn({}, { items: null })
    expect(result).toBe('fallback')
  })

  it('resolves source from inputs', async () => {
    const def: HeuristicDefinition = {
      name: 'inputs-test',
      version: '1.0',
      description: 'Test inputs source',
      source: 'inputs.files',
      operations: [{ op: 'count' }],
      output: 'result'
    }

    const fn = createDeclarativeHeuristic(def)
    const result = await fn({ files: ['a.nii', 'b.nii', 'c.nii'] }, {})
    expect(result).toBe(3)
  })
})

// ── heuristicRegistry ──────────────────────────────────────────────

describe('heuristicRegistry', () => {
  it('registers and retrieves a heuristic', () => {
    const fn = async () => 'test-result'
    registerHeuristic('test-heuristic', fn)
    expect(getHeuristic('test-heuristic')).toBe(fn)
  })

  it('returns undefined for unregistered heuristic', () => {
    expect(getHeuristic('nonexistent-heuristic-xyz')).toBeUndefined()
  })

  it('getHeuristicNames returns registered names', () => {
    const names = getHeuristicNames()
    expect(Array.isArray(names)).toBe(true)
    // Should include the one we just registered
    expect(names).toContain('test-heuristic')
  })

  it('default heuristics are registered', () => {
    const names = getHeuristicNames()
    expect(names).toContain('list-dicom-series')
    expect(names).toContain('bids-classify')
    expect(names).toContain('detect-subjects')
  })

  it('overwrites existing heuristic on re-register', () => {
    const fn1 = async () => 'v1'
    const fn2 = async () => 'v2'
    registerHeuristic('overwrite-test', fn1)
    registerHeuristic('overwrite-test', fn2)
    expect(getHeuristic('overwrite-test')).toBe(fn2)
  })
})
