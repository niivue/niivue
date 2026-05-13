import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { generateBidsPath } from './bidsTreeUtil.js'

/** Per-file row consumed by the BidsTreeEditor tree + inspector. */
export interface TreeFile {
  /** Stable key for selection state. Caller decides the key namespace:
   *  the Prep adapter uses `mapping.index`; the View adapter will use the
   *  on-disk absolute path. */
  key: string
  subject: string
  session: string
  datatype: string
  /** Basename of the file as it will appear in the BIDS tree, including
   *  the extension (e.g. sub-01_T1w.nii.gz). */
  filename: string
  /** The full BIDS-relative path under the dataset root. */
  bidsPath: string
  /** Snapshot of the sidecar key/value pairs the inspector edits. For Prep
   *  this is original + overrides merged; for View it will be the on-disk
   *  JSON merged with staged ops. */
  sidecar: Record<string, unknown>
  /** Absolute disk path to the JSON sidecar this row was built from. For
   *  Prep this is the dcm2niix scratch JSON in /tmp/bids-convert-*; for
   *  View it's the in-dataset sidecar. Surfaced in the inspector so users
   *  know which on-disk file backs the row. */
  sidecarPath?: string
}

/** Hierarchical grouping the tree component renders: subject → session → datatype → files. */
export interface TreeGroup {
  subject: string
  sessions: {
    session: string
    datatypes: {
      datatype: string
      files: TreeFile[]
    }[]
  }[]
}

/**
 * Build TreeFile rows from in-memory mappings (BIDS Prep). Excluded series
 * are dropped — they end up in sourcedata/ which is not editable through
 * the tree. The sidecar snapshot merges DICOM-origin fields with any
 * overrides the user has staged so the inspector always shows the value
 * that WILL be written.
 */
export function mappingsToTreeFiles(mappings: BidsSeriesMapping[]): TreeFile[] {
  const files: TreeFile[] = []
  for (const m of mappings) {
    if (m.excluded) continue
    const bidsBase = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    const bidsPath = `${bidsBase}${ext}`
    const original = (m.sidecarData?.original as Record<string, unknown>) ?? {}
    const overrides = (m.sidecarData?.overrides as Record<string, unknown>) ?? {}
    // BidsGuess is dcm2niix-internal scratch — never useful to edit.
    const { BidsGuess: _ignored, ...originalUserVisible } = original as Record<string, unknown>
    files.push({
      key: String(m.index),
      subject: m.subject,
      session: m.session ?? '',
      datatype: m.datatype,
      filename: bidsPath.split('/').pop() ?? bidsPath,
      bidsPath,
      sidecar: { ...originalUserVisible, ...overrides },
      sidecarPath: m.sidecarPath
    })
  }
  return files
}

/** Group a flat TreeFile[] into the nested shape the tree component renders. */
export function groupTreeFiles(files: TreeFile[]): TreeGroup[] {
  const bySubject = new Map<string, Map<string, Map<string, TreeFile[]>>>()
  for (const f of files) {
    if (!bySubject.has(f.subject)) bySubject.set(f.subject, new Map())
    const sessionMap = bySubject.get(f.subject)!
    if (!sessionMap.has(f.session)) sessionMap.set(f.session, new Map())
    const datatypeMap = sessionMap.get(f.session)!
    if (!datatypeMap.has(f.datatype)) datatypeMap.set(f.datatype, [])
    datatypeMap.get(f.datatype)!.push(f)
  }
  const groups: TreeGroup[] = []
  for (const [subject, sessionMap] of [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sessions = [...sessionMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([session, datatypeMap]) => ({
        session,
        datatypes: [...datatypeMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([datatype, files]) => ({
            datatype,
            files: [...files].sort((a, b) => a.filename.localeCompare(b.filename))
          }))
      }))
    groups.push({ subject, sessions })
  }
  return groups
}

/**
 * Apply a single sidecar field edit to every mapping whose String(index)
 * is in `keys`. The original `mappings` array is left untouched — the
 * function returns a new array with only the touched entries replaced, so
 * referential equality on unchanged rows is preserved (React reconciliation
 * stays cheap, and StepBidsPreview's thumbnail effect doesn't refire).
 *
 * Setting `value` to `undefined` removes the override for that key — the
 * writer will fall back to the DICOM-origin value, restoring the original
 * sidecar field instead of writing an explicit null.
 */
export function applySidecarOverrideBatch(
  mappings: BidsSeriesMapping[],
  keys: string[],
  field: string,
  value: unknown
): BidsSeriesMapping[] {
  if (keys.length === 0) return mappings
  const keySet = new Set(keys)
  return mappings.map((m) => {
    if (!keySet.has(String(m.index))) return m
    const prevOverrides = (m.sidecarData?.overrides as Record<string, unknown>) ?? {}
    const nextOverrides: Record<string, unknown> = { ...prevOverrides }
    if (value === undefined) delete nextOverrides[field]
    else nextOverrides[field] = value
    const prevOriginal = (m.sidecarData?.original as Record<string, unknown>) ?? {}
    return {
      ...m,
      sidecarData: {
        original: prevOriginal,
        overrides: nextOverrides
      }
    }
  })
}

/** Inspector-side reduction: across `files`, returns one row per sidecar key
 *  containing the common value (or a `varies` flag if values differ). Keys
 *  are the union across the selection so adding a value to one file makes
 *  that key visible on the others when they get selected. */
export interface InspectorRow {
  field: string
  /** When `varies` is true, `value` is undefined; the UI shows "(varies)"
   *  and offers to set all selected files to a single new value. */
  value: unknown
  varies: boolean
}

export function buildInspectorRows(files: TreeFile[]): InspectorRow[] {
  if (files.length === 0) return []
  const fieldSet = new Set<string>()
  for (const f of files) for (const k of Object.keys(f.sidecar)) fieldSet.add(k)
  const rows: InspectorRow[] = []
  for (const field of [...fieldSet].sort()) {
    let first: unknown = undefined
    let firstSeen = false
    let varies = false
    for (const f of files) {
      const v = f.sidecar[field]
      if (!firstSeen) {
        first = v
        firstSeen = true
        continue
      }
      if (!sidecarValuesEqual(first, v)) {
        varies = true
        break
      }
    }
    rows.push({ field, value: varies ? undefined : first, varies })
  }
  return rows
}

// ── "Select all similar" helpers ───────────────────────────────────────

/**
 * Parse the BIDS suffix (last `_<label>` before the .nii/.nii.gz extension)
 * from a filename. Returns null when the name doesn't look BIDS-shaped —
 * the chip bar then just skips that file.
 */
export function parseSuffix(filename: string): string | null {
  const m = filename.match(/_([A-Za-z0-9]+)\.(nii\.gz|nii)$/)
  return m ? m[1] : null
}

export interface SelectChip {
  label: string
  count: number
  keys: string[]
}

/**
 * Build "Select all <datatype>" and "Select all <suffix>" chip data from
 * the current tree. A chip is only emitted if its set is non-trivial
 * (>1 file AND smaller than the whole tree) — otherwise it's either
 * redundant with the subject-level checkbox or matches nothing useful.
 */
export function buildSelectChips(files: TreeFile[]): {
  datatypes: SelectChip[]
  suffixes: SelectChip[]
} {
  const byDatatype = new Map<string, string[]>()
  const bySuffix = new Map<string, string[]>()
  for (const f of files) {
    if (!byDatatype.has(f.datatype)) byDatatype.set(f.datatype, [])
    byDatatype.get(f.datatype)!.push(f.key)
    const suffix = parseSuffix(f.filename)
    if (suffix) {
      if (!bySuffix.has(suffix)) bySuffix.set(suffix, [])
      bySuffix.get(suffix)!.push(f.key)
    }
  }
  const meaningful = (entries: Map<string, string[]>): SelectChip[] =>
    [...entries.entries()]
      .filter(([, keys]) => keys.length > 1 && keys.length < files.length)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, keys]) => ({ label, count: keys.length, keys }))
  return {
    datatypes: meaningful(byDatatype),
    suffixes: meaningful(bySuffix)
  }
}

/** Strict-but-cheap equality for sidecar values. Arrays compare element-wise;
 *  objects compare by JSON stringification (sidecars are leaf-y). */
function sidecarValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!sidecarValuesEqual(a[i], b[i])) return false
    return true
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}
