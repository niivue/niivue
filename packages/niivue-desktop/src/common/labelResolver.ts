/**
 * Label resolver utility for parsing label.json files and resolving
 * label names to numeric values.
 */

/**
 * A single label entry with value and name
 */
export interface LabelEntry {
  value: number
  name: string
}

/**
 * Label index for fast lookups by name or value
 */
export interface LabelIndex {
  /** Map from lowercase label name to numeric value */
  byName: Map<string, number>
  /** Map from numeric value to label name */
  byValue: Map<number, string>
  /** All label entries */
  entries: LabelEntry[]
}

/**
 * Result of resolving label names
 */
export interface LabelResolutionResult {
  /** Label values that were found */
  found: number[]
  /** Label names that were not found in the index */
  notFound: string[]
}

/**
 * Format 1: Object-based labels (tissue-seg, brain-extract)
 * { "labels": [{"value": 0, "name": "Background"}, ...] }
 */
interface ObjectLabelFormat {
  labels: Array<{
    value: number
    name: string
    color?: number[]
  }>
}

/**
 * Format 2: Array-based labels (parcellation, ColorMap)
 * { "labels": ["BG", "WM", "GM", ...], "R": [...], "G": [...], "B": [...] }
 */
interface ArrayLabelFormat {
  labels: string[]
  R?: number[]
  G?: number[]
  B?: number[]
}

/**
 * Check if the JSON matches Format 1 (object-based)
 */
function isObjectLabelFormat(json: unknown): json is ObjectLabelFormat {
  if (typeof json !== 'object' || json === null) return false
  const obj = json as Record<string, unknown>
  if (!Array.isArray(obj.labels)) return false
  if (obj.labels.length === 0) return true
  const firstLabel = obj.labels[0]
  return typeof firstLabel === 'object' && firstLabel !== null && 'value' in firstLabel
}

/**
 * Check if the JSON matches Format 2 (array-based)
 */
function isArrayLabelFormat(json: unknown): json is ArrayLabelFormat {
  if (typeof json !== 'object' || json === null) return false
  const obj = json as Record<string, unknown>
  if (!Array.isArray(obj.labels)) return false
  if (obj.labels.length === 0) return true
  return typeof obj.labels[0] === 'string'
}

/**
 * Parse a label.json file and build a lookup index.
 * Supports both Format 1 (object array) and Format 2 (ColorMap/string array).
 *
 * @param json - The parsed JSON content from a label.json file
 * @returns A LabelIndex for looking up labels by name or value
 * @throws Error if the JSON format is unrecognized
 */
export function parseLabelJson(json: unknown): LabelIndex {
  const index: LabelIndex = {
    byName: new Map(),
    byValue: new Map(),
    entries: []
  }

  // Format 1: { labels: [{value, name}, ...] }
  if (isObjectLabelFormat(json)) {
    for (const entry of json.labels) {
      const value = entry.value
      const name = entry.name
      index.byName.set(name.toLowerCase(), value)
      index.byValue.set(value, name)
      index.entries.push({ value, name })
    }
    return index
  }

  // Format 2: { labels: ["name1", "name2", ...], R: [...], G: [...], B: [...] }
  if (isArrayLabelFormat(json)) {
    const labels = json.labels
    for (let i = 0; i < labels.length; i++) {
      const name = labels[i]
      index.byName.set(name.toLowerCase(), i)
      index.byValue.set(i, name)
      index.entries.push({ value: i, name })
    }
    return index
  }

  throw new Error('Invalid label.json: unrecognized format. Expected either array of {value, name} objects or array of strings.')
}

/**
 * Resolve label names to their numeric values using a label index.
 *
 * @param names - Array of label names to resolve
 * @param index - The label index to use for lookups
 * @returns Object containing found values and not-found names
 */
export function resolveLabels(names: string[], index: LabelIndex): LabelResolutionResult {
  const found: number[] = []
  const notFound: string[] = []

  for (const name of names) {
    const trimmedName = name.trim()
    const value = index.byName.get(trimmedName.toLowerCase())
    if (value !== undefined) {
      found.push(value)
    } else {
      notFound.push(trimmedName)
    }
  }

  return { found, notFound }
}

/**
 * Get all available label names from a label index.
 *
 * @param index - The label index
 * @returns Array of all label names
 */
export function getAvailableLabelNames(index: LabelIndex): string[] {
  return index.entries.map((e) => e.name)
}

/**
 * Get a label name by its numeric value.
 *
 * @param value - The numeric label value
 * @param index - The label index
 * @returns The label name, or undefined if not found
 */
export function getLabelName(value: number, index: LabelIndex): string | undefined {
  return index.byValue.get(value)
}
