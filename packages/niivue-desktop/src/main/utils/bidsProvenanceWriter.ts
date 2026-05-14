import fs from 'node:fs'
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
