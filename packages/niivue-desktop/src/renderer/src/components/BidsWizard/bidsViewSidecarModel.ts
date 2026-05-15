// Schema-aware sidecar inspector model for the BIDS View step.
//
// Combines three sources into a single per-file list of rows the inspector
// renders:
//   1. The BIDS schema's `objects.metadata` catalog — provides display_name,
//      description, type, and enum options for each known field.
//   2. The validator output for the file — tells us which fields are missing
//      at "recommended" or "required" status (via SIDECAR_KEY_RECOMMENDED /
//      SIDECAR_KEY_REQUIRED issues whose `subCode` is the field name) and
//      which existing values failed schema validation (JSON_SCHEMA_*).
//   3. The sidecar JSON itself — provides current values.
//
// The rows are pure data; the inspector component just renders them.

import type { BidsValidationIssue } from '../../../../common/bidsTypes.js'

export interface BidsMetadataDef {
  name: string
  display_name?: string
  description?: string
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  enum?: string[]
  items?: { type?: string; enum?: string[] }
  unit?: string
  anyOf?: unknown[]
  [key: string]: unknown
}

export type FieldStatus = 'required' | 'recommended' | 'optional' | 'present' | 'invalid'

export interface SidecarFieldRow {
  /** JSON field name, e.g. `RepetitionTime`. */
  field: string
  /** Schema definition (display_name, description, type, enum). May be missing
   *  for unknown fields. */
  def?: BidsMetadataDef
  /** Current value on disk (or staged); undefined when the key is absent. */
  value: unknown
  /** Whether the field already has a value present in the sidecar. */
  hasValue: boolean
  /** Highest severity from validator issues touching this field. */
  status: FieldStatus
  /** Validator issues that name this field via `subCode`. */
  issues: BidsValidationIssue[]
  /** True when the validator wouldn't fire for this field — i.e. it's just
   *  the user adding an arbitrary key. Drives a `may not apply` chip. */
  unknownToSchema: boolean
  /** Sort key: required > invalid > recommended > present-set > optional/unknown. */
  sortRank: number
}

const RECOMMENDED_CODES = new Set(['SIDECAR_KEY_RECOMMENDED', 'JSON_KEY_RECOMMENDED'])
const REQUIRED_CODES = new Set(['SIDECAR_KEY_REQUIRED', 'JSON_KEY_REQUIRED'])
const INVALID_CODES = new Set(['JSON_SCHEMA_VALIDATION_ERROR', 'JSON_VALUE_INVALID'])

function rankFor(status: FieldStatus, hasValue: boolean): number {
  if (status === 'required') return 0
  if (status === 'invalid') return 1
  if (status === 'recommended') return 2
  if (status === 'present') return 3
  if (hasValue) return 3
  return 4
}

/**
 * Build inspector rows for a single file. Issues should already be filtered
 * down to those that affect the file (matching by `affects`/`file` upstream
 * — see `partitionIssuesByFile`).
 */
export function buildSidecarFieldRows(
  sidecar: Record<string, unknown>,
  issues: BidsValidationIssue[],
  defsByName: Record<string, BidsMetadataDef> | null
): SidecarFieldRow[] {
  const fieldNames = new Set<string>()
  for (const k of Object.keys(sidecar)) fieldNames.add(k)
  for (const i of issues) if (i.subCode) fieldNames.add(i.subCode)

  const rows: SidecarFieldRow[] = []
  for (const field of fieldNames) {
    const fieldIssues = issues.filter((i) => i.subCode === field)
    const def = defsByName ? defsByName[field] : undefined
    const value = sidecar[field]
    const hasValue = field in sidecar

    let status: FieldStatus = hasValue ? 'present' : 'optional'
    for (const i of fieldIssues) {
      if (!i.code) continue
      if (REQUIRED_CODES.has(i.code)) status = 'required'
      else if (INVALID_CODES.has(i.code) && status !== 'required') status = 'invalid'
      else if (RECOMMENDED_CODES.has(i.code) && status !== 'required' && status !== 'invalid') {
        status = 'recommended'
      }
    }

    rows.push({
      field,
      def,
      value,
      hasValue,
      status,
      issues: fieldIssues,
      unknownToSchema: !def,
      sortRank: rankFor(status, hasValue)
    })
  }

  rows.sort((a, b) => {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank
    return a.field.localeCompare(b.field)
  })
  return rows
}

/**
 * Split a flat issue list into per-file buckets keyed by the dataset-relative
 * path (always leading `/`). Issues with no file get bucketed under the
 * empty key so the caller can surface them as dataset-level.
 */
export function partitionIssuesByFile(
  issues: BidsValidationIssue[]
): Map<string, BidsValidationIssue[]> {
  const out = new Map<string, BidsValidationIssue[]>()
  for (const i of issues) {
    const key = (i.file ?? '').trim()
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(i)
  }
  return out
}

/**
 * Normalise the path a validator issue points at to dataset-relative form
 * starting with `/`. The validator emits paths like `/sub-01/anat/...` but
 * we accept both that and bare relative paths.
 */
export function normalizeIssuePath(p: string): string {
  if (!p) return ''
  if (p.startsWith('/')) return p
  return `/${p}`
}

/**
 * Pull issues that touch a given file. Matches both the issue's primary
 * `file` and any companion sidecar/nifti permutation — when the validator
 * reports a SIDECAR_KEY_* issue against a JSON path, the affected NIfTI
 * shares the same stem.
 */
export function issuesForFile(
  allIssues: BidsValidationIssue[],
  niftiBidsPath: string,
  sidecarBidsPath?: string
): BidsValidationIssue[] {
  const targets = new Set<string>()
  targets.add(normalizeIssuePath(niftiBidsPath))
  if (sidecarBidsPath) targets.add(normalizeIssuePath(sidecarBidsPath))
  return allIssues.filter((i) => i.file && targets.has(normalizeIssuePath(i.file)))
}

/**
 * Group rows by their status bucket for sectioned rendering. Sections preserve
 * the priority order: required > invalid > recommended > present > optional.
 *
 * Generic over the row type so callers can attach extra annotations (e.g.
 * `varies`) without losing the typing through this grouping pass.
 */
export interface FieldRowSection<R extends SidecarFieldRow = SidecarFieldRow> {
  label: string
  status: FieldStatus | 'all-present'
  rows: R[]
}

export function groupRowsByStatus<R extends SidecarFieldRow>(rows: R[]): FieldRowSection<R>[] {
  const sections: FieldRowSection<R>[] = [
    { label: 'Required', status: 'required', rows: [] },
    { label: 'Invalid', status: 'invalid', rows: [] },
    { label: 'Recommended', status: 'recommended', rows: [] },
    { label: 'Present', status: 'present', rows: [] },
    { label: 'Other', status: 'optional', rows: [] }
  ]
  for (const row of rows) {
    if (row.status === 'required') sections[0].rows.push(row)
    else if (row.status === 'invalid') sections[1].rows.push(row)
    else if (row.status === 'recommended') sections[2].rows.push(row)
    else if (row.hasValue) sections[3].rows.push(row)
    else sections[4].rows.push(row)
  }
  return sections.filter((s) => s.rows.length > 0)
}
