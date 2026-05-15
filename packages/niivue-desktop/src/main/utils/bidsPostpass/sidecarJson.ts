// JSON sidecar parse/serialize with key-order + literal preservation.
// Ported from bidsui's src/lib/sidecar/parse.ts.
//
// `parseSidecar(text)` calls JSON.parse, then walks the source alongside
// the value tree to record the raw text slice for every path. On
// `serializeSidecar`, sub-trees structurally identical to the parsed
// source re-emit their raw bytes (preserving scientific notation, array
// layout, trailing zeros). Sub-trees containing edits fall through to
// pretty-printed output using the detected indent.

export interface SidecarFormat {
  /** Indent string used by the source (e.g. '  ', '    ', '\t'). null when no indented lines. */
  indent: string | null
  /** True when the source ends with a `\n`. */
  trailingNewline: boolean
  /** Raw source text for every value, keyed by JSON Pointer. */
  rawSlices: Map<string, string>
  /** The parsed value at each path. Used for structural-equality checks during render. */
  originalValues: Map<string, unknown>
}

export interface ParsedSidecar {
  /** The parsed value. For valid BIDS sidecars this is a plain object. */
  value: unknown
  format: SidecarFormat
}

/** Parse a sidecar JSON string and capture formatting + raw-text metadata. */
export function parseSidecar(text: string): ParsedSidecar {
  const value = JSON.parse(text)
  // Independent snapshot for the change-detection map.
  const snapshot = JSON.parse(text)
  const { rawSlices, originalValues } = scanValues(text, snapshot)
  return {
    value,
    format: {
      indent: detectIndent(text),
      trailingNewline: text.endsWith('\n'),
      rawSlices,
      originalValues
    }
  }
}

/** Detect the indent string from the first indented line. */
export function detectIndent(text: string): string | null {
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.length === 0) continue
    const m = line.match(/^([ \t]+)\S/)
    if (m !== null) return m[1]
  }
  return null
}

/**
 * Serialize a sidecar back to a string. Unchanged sub-trees re-emit
 * verbatim; sub-trees with edits use the captured indent.
 */
export function serializeSidecar(value: unknown, format: SidecarFormat): string {
  const indent = format.indent ?? '  '
  const body = renderValue(value, format, '', 0, indent)
  return format.trailingNewline ? `${body}\n` : body
}

function renderValue(
  value: unknown,
  format: SidecarFormat,
  path: string,
  depth: number,
  indent: string
): string {
  const original = format.originalValues.get(path)
  if (format.originalValues.has(path) && structurallyEqual(original, value)) {
    const raw = format.rawSlices.get(path)
    if (raw !== undefined) return raw
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const outerPad = indent.repeat(depth)
    const innerPad = indent.repeat(depth + 1)
    const items = value.map((v, i) => renderValue(v, format, `${path}/${i}`, depth + 1, indent))
    return `[\n${items.map((it) => innerPad + it).join(',\n')}\n${outerPad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const outerPad = indent.repeat(depth)
    const innerPad = indent.repeat(depth + 1)
    const items = entries.map(([k, v]) => {
      const keyEncoded = JSON.stringify(k)
      const child = renderValue(v, format, `${path}/${escapePointer(k)}`, depth + 1, indent)
      return `${innerPad}${keyEncoded}: ${child}`
    })
    return `{\n${items.join(',\n')}\n${outerPad}}`
  }
  return JSON.stringify(value as never)
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!structurallyEqual(a[i], b[i])) return false
    }
    return true
  }
  if (typeof a === 'object') {
    const ak = Object.keys(a as object)
    const bk = Object.keys(b as object)
    if (ak.length !== bk.length) return false
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return false
      if (
        !structurallyEqual(
          (a as Record<string, unknown>)[ak[i]],
          (b as Record<string, unknown>)[bk[i]]
        )
      )
        return false
    }
    return true
  }
  return false
}

function escapePointer(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1')
}

interface ScanResult {
  rawSlices: Map<string, string>
  originalValues: Map<string, unknown>
}

function scanValues(text: string, root: unknown): ScanResult {
  const rawSlices = new Map<string, string>()
  const originalValues = new Map<string, unknown>()
  const cursor = { i: 0 }
  walk(text, cursor, root, '', rawSlices, originalValues)
  return { rawSlices, originalValues }
}

function walk(
  text: string,
  cursor: { i: number },
  value: unknown,
  path: string,
  rawSlices: Map<string, string>,
  originalValues: Map<string, unknown>
): void {
  skipWhitespace(text, cursor)
  const start = cursor.i
  const ch = text[start]

  if (ch === '"') {
    consumeString(text, cursor)
    rawSlices.set(path, text.slice(start, cursor.i))
    originalValues.set(path, value)
    return
  }

  if (ch === '{') {
    cursor.i++ // skip {
    const obj = value as Record<string, unknown>
    skipWhitespace(text, cursor)
    if (text[cursor.i] === '}') {
      cursor.i++
      rawSlices.set(path, text.slice(start, cursor.i))
      originalValues.set(path, value)
      return
    }
    while (cursor.i < text.length) {
      skipWhitespace(text, cursor)
      const keyStart = cursor.i
      consumeString(text, cursor)
      const key = JSON.parse(text.slice(keyStart, cursor.i)) as string
      skipWhitespace(text, cursor)
      cursor.i++ // ':'
      walk(text, cursor, obj[key], `${path}/${escapePointer(key)}`, rawSlices, originalValues)
      skipWhitespace(text, cursor)
      if (text[cursor.i] === ',') {
        cursor.i++
        continue
      }
      if (text[cursor.i] === '}') {
        cursor.i++
        rawSlices.set(path, text.slice(start, cursor.i))
        originalValues.set(path, value)
        return
      }
    }
    return
  }

  if (ch === '[') {
    cursor.i++ // skip [
    const arr = value as unknown[]
    skipWhitespace(text, cursor)
    if (text[cursor.i] === ']') {
      cursor.i++
      rawSlices.set(path, text.slice(start, cursor.i))
      originalValues.set(path, value)
      return
    }
    let idx = 0
    while (cursor.i < text.length) {
      walk(text, cursor, arr[idx], `${path}/${idx}`, rawSlices, originalValues)
      idx++
      skipWhitespace(text, cursor)
      if (text[cursor.i] === ',') {
        cursor.i++
        continue
      }
      if (text[cursor.i] === ']') {
        cursor.i++
        rawSlices.set(path, text.slice(start, cursor.i))
        originalValues.set(path, value)
        return
      }
    }
    return
  }

  // number / true / false / null
  while (cursor.i < text.length) {
    const c = text[cursor.i]
    if (
      c === ',' ||
      c === '}' ||
      c === ']' ||
      c === ' ' ||
      c === '\n' ||
      c === '\r' ||
      c === '\t'
    ) {
      break
    }
    cursor.i++
  }
  rawSlices.set(path, text.slice(start, cursor.i))
  originalValues.set(path, value)
}

function consumeString(text: string, cursor: { i: number }): void {
  cursor.i++ // opening quote
  while (cursor.i < text.length) {
    const c = text[cursor.i]
    if (c === '\\') {
      cursor.i = Math.min(cursor.i + 2, text.length)
      continue
    }
    if (c === '"') {
      cursor.i++
      return
    }
    cursor.i++
  }
}

function skipWhitespace(text: string, cursor: { i: number }): void {
  while (cursor.i < text.length) {
    const c = text[cursor.i]
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
      cursor.i++
      continue
    }
    return
  }
}
