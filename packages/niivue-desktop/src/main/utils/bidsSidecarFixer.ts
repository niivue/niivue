import fs from 'node:fs'
import path from 'node:path'
import type {
  BidsValidationIssue,
  BidsValidationResult,
  SidecarFieldSuggestion,
  SidecarFixProposal,
  SidecarUpdateResult
} from '../../common/bidsTypes.js'

/**
 * Heuristic rules that map a validator issue to a specific JSON field
 * plus a reason the user can read. Rules are tried in order; the first
 * match wins per field (duplicates collapse their issueCodes).
 */
interface FixRule {
  field: string
  kind: SidecarFieldSuggestion['kind']
  reason: string
  options?: string[]
  match: (issue: BidsValidationIssue) => boolean
  /** Optional derivation — runs against the current sidecar value */
  suggest?: (current: unknown, issue: BidsValidationIssue) => unknown
}

const textOf = (i: BidsValidationIssue): string =>
  `${i.code || ''} ${i.message || ''}`.toLowerCase()

const RULES: FixRule[] = [
  {
    field: 'TaskName',
    kind: 'string',
    reason:
      'BIDS requires TaskName for functional runs (and it must match the task label in the filename).',
    match: (i) => /task.?name|task_name|\btaskname\b/i.test(textOf(i))
  },
  {
    field: 'RepetitionTime',
    kind: 'number',
    reason: 'RepetitionTime (TR) must be a positive number in seconds.',
    match: (i) => /repetition.?time|\brepetitiontime\b|\btr\b/.test(textOf(i))
  },
  {
    field: 'EchoTime',
    kind: 'number',
    reason: 'EchoTime (TE) must be a positive number in seconds.',
    match: (i) => /\bechotime\b|echo.?time/.test(textOf(i)) && !/effective|spacing/.test(textOf(i))
  },
  {
    field: 'EffectiveEchoSpacing',
    kind: 'number',
    reason: 'EffectiveEchoSpacing must be a positive number (seconds).',
    match: (i) => /effective.?echo.?spacing|effectiveechospacing/.test(textOf(i))
  },
  {
    field: 'PhaseEncodingDirection',
    kind: 'enum',
    options: ['i', 'i-', 'j', 'j-', 'k', 'k-'],
    reason: 'PhaseEncodingDirection must be one of i, i-, j, j-, k, k-.',
    match: (i) => /phase.?encoding.?direction|phaseencodingdirection/.test(textOf(i))
  },
  {
    field: 'TotalReadoutTime',
    kind: 'number',
    reason: 'TotalReadoutTime must be a positive number (seconds).',
    match: (i) => /total.?readout.?time|totalreadouttime/.test(textOf(i))
  },
  {
    field: 'SliceTiming',
    kind: 'array-number',
    reason: 'SliceTiming must be an array of numbers (seconds) within [0, TR).',
    match: (i) => /slice.?timing|slicetiming/.test(textOf(i))
  },
  {
    field: 'IntendedFor',
    kind: 'array-string',
    reason: 'IntendedFor must list BIDS paths (relative to the subject) for each target run.',
    match: (i) => /intended.?for|intendedfor/.test(textOf(i))
  },
  {
    field: 'FlipAngle',
    kind: 'number',
    reason: 'FlipAngle must be a number in degrees.',
    match: (i) => /flip.?angle|flipangle/.test(textOf(i))
  },
  {
    field: 'MagneticFieldStrength',
    kind: 'number',
    reason: 'MagneticFieldStrength must be a positive number in Tesla.',
    match: (i) => /magnetic.?field.?strength|magneticfieldstrength/.test(textOf(i))
  },
  {
    field: 'Manufacturer',
    kind: 'string',
    reason: 'Manufacturer is a recommended string.',
    match: (i) => /\bmanufacturer\b/.test(textOf(i))
  },
  {
    field: 'Units',
    kind: 'string',
    reason: 'Units describes the measurement units.',
    match: (i) => /\bunits\b/.test(textOf(i))
  }
]

/**
 * Convert an issue.file (which may reference a .nii/.nii.gz/.tsv) into
 * the corresponding .json sidecar path inside the dataset directory.
 */
export function resolveSidecarPath(datasetDir: string, issueFile: string): string | null {
  if (!issueFile) return null
  let rel = issueFile.trim()
  if (path.isAbsolute(rel)) {
    // Validator often emits dataset-relative paths that start with "/"
    if (rel.startsWith('/')) {
      rel = rel.replace(/^\/+/, '')
    } else if (!rel.startsWith(datasetDir)) {
      // Absolute but not under the dataset — cannot resolve
      return null
    }
  }
  let p = path.isAbsolute(rel) ? rel : path.join(datasetDir, rel)
  // Swap typical paired extensions with .json
  p = p
    .replace(/\.nii\.gz$/i, '.json')
    .replace(/\.nii$/i, '.json')
    .replace(/_events\.tsv$/i, '.json')
    .replace(/\.(bval|bvec|tsv)$/i, '.json')
  if (!p.endsWith('.json')) return null
  return p
}

function loadJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Derive fix proposals from validator output + files on disk. */
export function analyzeValidatorIssues(
  datasetDir: string,
  result: BidsValidationResult
): SidecarFixProposal[] {
  const byPath = new Map<string, SidecarFixProposal>()
  const allIssues = [...result.errors, ...result.warnings]

  const getOrCreate = (sidecarPath: string): SidecarFixProposal | null => {
    let existing = byPath.get(sidecarPath)
    if (existing) return existing
    if (!fs.existsSync(sidecarPath)) return null
    const content = loadJson(sidecarPath)
    if (!content) return null
    const relativePath = path.relative(datasetDir, sidecarPath)
    existing = {
      sidecarPath,
      relativePath,
      content,
      suggestions: [],
      issues: []
    }
    byPath.set(sidecarPath, existing)
    return existing
  }

  const applyRules = (proposal: SidecarFixProposal, issue: BidsValidationIssue): void => {
    for (const rule of RULES) {
      if (!rule.match(issue)) continue
      const existing = proposal.suggestions.find((s) => s.field === rule.field)
      if (existing) {
        if (issue.code && !existing.issueCodes.includes(issue.code)) {
          existing.issueCodes.push(issue.code)
        }
        continue
      }
      const current = proposal.content[rule.field]
      const suggested = rule.suggest ? rule.suggest(current, issue) : current
      proposal.suggestions.push({
        field: rule.field,
        currentValue: current,
        suggestedValue: suggested,
        kind: rule.kind,
        options: rule.options,
        reason: rule.reason,
        issueCodes: issue.code ? [issue.code] : []
      })
    }
  }

  for (const issue of allIssues) {
    // Dataset-level issues with no file: point at dataset_description.json
    if (!issue.file) {
      if (/dataset.?description|\bauthors?\b|\bname\b|bids.?version/i.test(textOf(issue))) {
        const ddPath = path.join(datasetDir, 'dataset_description.json')
        const proposal = getOrCreate(ddPath)
        if (proposal) {
          proposal.issues.push(issue)
          // Add dataset-description-specific hints
          const text = textOf(issue)
          if (/\bauthors?\b/.test(text)) {
            if (!proposal.suggestions.find((s) => s.field === 'Authors')) {
              proposal.suggestions.push({
                field: 'Authors',
                currentValue: proposal.content['Authors'],
                suggestedValue: proposal.content['Authors'] ?? [],
                kind: 'array-string',
                reason: 'Authors must be a non-empty list of strings.',
                issueCodes: issue.code ? [issue.code] : []
              })
            }
          }
          if (/\bname\b/.test(text)) {
            if (!proposal.suggestions.find((s) => s.field === 'Name')) {
              proposal.suggestions.push({
                field: 'Name',
                currentValue: proposal.content['Name'],
                suggestedValue: proposal.content['Name'] ?? '',
                kind: 'string',
                reason: 'Name is a required non-empty string in dataset_description.json.',
                issueCodes: issue.code ? [issue.code] : []
              })
            }
          }
        }
      }
      continue
    }

    const sidecarPath = resolveSidecarPath(datasetDir, issue.file)
    if (!sidecarPath) continue
    const proposal = getOrCreate(sidecarPath)
    if (!proposal) continue
    proposal.issues.push(issue)
    applyRules(proposal, issue)
  }

  // Drop proposals with no editable suggestions — nothing the form can help with
  return [...byPath.values()].filter((p) => p.suggestions.length > 0)
}

/** Merge updates into an on-disk sidecar. Undefined/empty strings delete keys. */
export function updateSidecar(
  sidecarPath: string,
  updates: Record<string, unknown>
): SidecarUpdateResult {
  try {
    if (!fs.existsSync(sidecarPath)) {
      return { ok: false, error: `Sidecar not found: ${sidecarPath}` }
    }
    const current = loadJson(sidecarPath) ?? {}
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === null) {
        delete current[k]
      } else if (typeof v === 'string' && v.trim() === '') {
        delete current[k]
      } else if (Array.isArray(v) && v.length === 0) {
        delete current[k]
      } else {
        current[k] = v
      }
    }
    fs.writeFileSync(sidecarPath, JSON.stringify(current, null, 2) + '\n')
    return { ok: true, content: current }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function readSidecar(sidecarPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(sidecarPath)) return null
  return loadJson(sidecarPath)
}

// ---------------------------------------------------------------------------
// Auto-fix pass — applies only unambiguous fixes that can be derived from
// the dataset on disk (no user input required).
// ---------------------------------------------------------------------------

export interface AutoFixRecord {
  sidecarPath: string
  relativePath: string
  field: string
  oldValue: unknown
  newValue: unknown
  reason: string
}

export interface AutoFixResult {
  fixes: AutoFixRecord[]
}

/** Recursively collect every .json file under a directory, ignoring sourcedata/. */
function collectSidecars(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'sourcedata' || entry.name === 'derivatives') continue
        walk(full)
      } else if (entry.name.endsWith('.json')) {
        out.push(full)
      }
    }
  }
  walk(root)
  return out
}

/**
 * Apply fixes that can be derived without any user input. Currently:
 *   • TaskName — populated from the `_task-<label>_` segment of the filename
 *     whenever the sidecar is missing TaskName or has it blank.
 *
 * Returns a list of the changes that were applied. The caller is responsible
 * for re-running the validator afterwards.
 */
export function autoFixUnambiguous(datasetDir: string): AutoFixResult {
  const fixes: AutoFixRecord[] = []
  if (!fs.existsSync(datasetDir)) return { fixes }

  const sidecars = collectSidecars(datasetDir)
  for (const sidecarPath of sidecars) {
    const base = path.basename(sidecarPath, '.json')
    // Skip top-level files like dataset_description.json, participants.json
    if (!base.startsWith('sub-')) continue

    const content = loadJson(sidecarPath)
    if (!content) continue

    const relativePath = path.relative(datasetDir, sidecarPath)
    let dirty = false

    // TaskName from filename
    const taskMatch = base.match(/_task-([a-zA-Z0-9]+)/)
    if (taskMatch) {
      const existing = content['TaskName']
      if (existing === undefined || existing === '' || existing === null) {
        const newValue = taskMatch[1]
        fixes.push({
          sidecarPath,
          relativePath,
          field: 'TaskName',
          oldValue: existing,
          newValue,
          reason: 'Derived from _task- segment in filename'
        })
        content['TaskName'] = newValue
        dirty = true
      }
    }

    if (dirty) {
      try {
        fs.writeFileSync(sidecarPath, JSON.stringify(content, null, 2) + '\n')
      } catch {
        // If write fails, drop the fix record so we don't report success
        // for something that did not actually land.
        while (fixes.length > 0 && fixes[fixes.length - 1].sidecarPath === sidecarPath) {
          fixes.pop()
        }
      }
    }
  }

  return { fixes }
}
