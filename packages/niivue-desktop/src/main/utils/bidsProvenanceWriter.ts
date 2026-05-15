import fs from 'node:fs'
import path from 'node:path'
import type {
  BidsProvenance,
  BidsProvenanceField,
  BidsProvenanceHistoryEntry,
  BidsProvenanceSource
} from '../../common/bidsTypes.js'

/**
 * Build the initial provenance record for a freshly-converted dcm2niix
 * output: every key in the sidecar is attributed to the DICOM source via
 * dcm2niix. Specific DICOM tags aren't tracked at this layer — we only
 * know the value came through dcm2niix from the original DICOMs.
 *
 * The `outputFile` is the BIDS-relative path of the NIfTI (not the JSON),
 * matching the spec: provenance is per-image, not per-sidecar.
 */
export function provenanceFromDcm2niixSidecar(
  outputFile: string,
  sidecar: Record<string, unknown>,
  history: BidsProvenanceHistoryEntry[] = []
): BidsProvenance {
  const fields: Record<string, BidsProvenanceField> = {}
  const source: BidsProvenanceSource = { kind: 'dicom', via: 'dcm2niix' }
  for (const [key, value] of Object.entries(sidecar)) {
    fields[key] = { value, source }
  }
  return { schemaVersion: '1', outputFile, fields, history }
}

/**
 * Overwrite a single field's provenance entry. Used when a downstream
 * step is the actual author of a value (e.g. `SkullStripped: true` from
 * the skull-strip executor) so the autofix layer doesn't think it came
 * from the DICOM.
 */
export function setProvenanceField(
  provenance: BidsProvenance,
  field: string,
  value: unknown,
  source: BidsProvenanceSource
): void {
  provenance.fields[field] = { value, source }
}

/** Append a step-run entry to the provenance history. */
export function appendProvenanceHistory(
  provenance: BidsProvenance,
  entry: BidsProvenanceHistoryEntry
): void {
  provenance.history.push(entry)
}

/** Serialize a provenance record to disk. Pretty-printed for diffability. */
export function writeProvenanceFile(destPath: string, provenance: BidsProvenance): void {
  fs.writeFileSync(destPath, JSON.stringify(provenance, null, 2) + '\n')
}

/**
 * Derive the `.prov.json` sibling path from a NIfTI path. Strips the full
 * `.nii.gz` (not just `.gz`) so the companion sits next to the `.json`
 * sidecar rather than between extensions.
 */
export function provenancePathFor(niftiPath: string): string {
  return niftiPath.replace(/\.nii(\.gz)?$/i, '.prov.json')
}

/**
 * Derive the `.prov.json` sibling path from a JSON sidecar path. Sidecars
 * end in `.json`; the provenance file uses `.prov.json` so the suffix
 * doesn't collide with the BIDS sidecar.
 */
export function provenancePathForSidecar(sidecarPath: string): string {
  return sidecarPath.replace(/\.json$/i, '.prov.json')
}

/**
 * Find the NIfTI that a sidecar describes by checking the conventional
 * `.nii.gz` and `.nii` siblings. Returns the first one that exists on
 * disk, or null if neither does (dataset-level sidecars like
 * `participants.json` have no NIfTI counterpart).
 */
export function findNiftiForSidecar(sidecarPath: string): string | null {
  const base = sidecarPath.replace(/\.json$/i, '')
  for (const ext of ['.nii.gz', '.nii']) {
    const candidate = base + ext
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/** Parse a `.prov.json` file from disk. Returns null when absent or invalid. */
export function readProvenanceFile(provPath: string): BidsProvenance | null {
  if (!fs.existsSync(provPath)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(provPath, 'utf-8')) as BidsProvenance
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.schemaVersion !== '1') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Apply a batch of user-authored sidecar updates to a `.prov.json`
 * sibling: each edited field is rewritten with `kind: "user"`, deletions
 * remove the entry. Missing files are created on the fly so datasets
 * that pre-date provenance still pick up new user attribution. Returns
 * the updated record (or null when there's no NIfTI to anchor the
 * record to, e.g. a dataset-level sidecar).
 */
export function applyUserEditsToProvenanceFile(
  sidecarPath: string,
  updates: Record<string, unknown>,
  actor = 'bids-editor'
): BidsProvenance | null {
  const niftiPath = findNiftiForSidecar(sidecarPath)
  if (!niftiPath) return null
  const provPath = provenancePathForSidecar(sidecarPath)
  const provenance: BidsProvenance = readProvenanceFile(provPath) ?? {
    schemaVersion: '1',
    outputFile: path.basename(niftiPath),
    fields: {},
    history: []
  }
  const ts = new Date().toISOString()
  for (const [field, value] of Object.entries(updates)) {
    // Mirror updateSidecar's delete semantics so the provenance and the
    // sidecar stay in sync on key removals.
    const isDelete =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    if (isDelete) {
      delete provenance.fields[field]
      continue
    }
    setProvenanceField(provenance, field, value, { kind: 'user', actor, ts })
  }
  writeProvenanceFile(provPath, provenance)
  return provenance
}
