// Aggregate AcquisitionDateTime from JSON sidecars under one session
// directory into a BIDS `<sub>[_<ses>]_scans.tsv` file. Mirrors
// `_write_scans_tsv` + `_acq_iso` + `_hms_seconds` from reproinx.py.
//
// Pure helpers (`acqIso`, `buildScansTsvContent`, `computeScansTsvPath`)
// are exposed for testing. The `aggregateScansTsv` entry point hits the
// filesystem to walk a session dir's `datatype/*.json` files; it returns
// a content + filename pair the caller then writes through the
// orchestrator's writeText callback.

import { basename, dirname } from 'node:path'
import type { PostPassFs } from './fs.js'

export interface ScansRow {
  /** Path of the NIfTI relative to the session directory (forward slashes). */
  filename: string
  /** ISO 8601 acquisition timestamp, or `'n/a'` when the sidecar lacks it. */
  acqTime: string
}

/**
 * Compute the best-available ISO 8601 acquisition timestamp from a
 * sidecar's parsed JSON, or null when neither AcquisitionDateTime nor
 * the date+time pair are present / well-formed. Mirrors reproinx.py's
 * `_acq_iso`.
 */
export function acqIso(data: Record<string, unknown>): string | null {
  const adt = data.AcquisitionDateTime
  if (typeof adt === 'string' && adt.length > 0) return adt
  const d = data.AcquisitionDate
  const t = data.AcquisitionTime
  if (typeof d === 'string' && typeof t === 'string' && d.length === 8) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t}`
  }
  return null
}

/**
 * Parse an HH:MM:SS[.fff] AcquisitionTime string into seconds-of-day.
 * Returns null on any parse failure; reproinx.py's `_hms_seconds` does
 * the same.
 */
export function hmsSeconds(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const parts = value.split(':')
  if (parts.length !== 3) return null
  const h = Number.parseFloat(parts[0])
  const m = Number.parseFloat(parts[1])
  const s = Number.parseFloat(parts[2])
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return null
  return h * 3600 + m * 60 + s
}

/**
 * Build the TSV body from row data. Sorted with timestamped rows first
 * (chronological), then `n/a` rows last in stable order. The header is
 * always `filename\tacq_time\n`; a trailing newline follows each row.
 */
export function buildScansTsvContent(rows: ReadonlyArray<ScansRow>): string {
  const sorted = rows.slice().sort((a, b) => {
    const aMissing = a.acqTime === 'n/a'
    const bMissing = b.acqTime === 'n/a'
    if (aMissing !== bMissing) return aMissing ? 1 : -1
    if (aMissing && bMissing) return 0
    return a.acqTime < b.acqTime ? -1 : a.acqTime > b.acqTime ? 1 : 0
  })
  let out = 'filename\tacq_time\n'
  for (const r of sorted) out += `${r.filename}\t${r.acqTime}\n`
  return out
}

/**
 * Compute the absolute path of the `<sub>[_<ses>]_scans.tsv` file for a
 * given session-equivalent directory. When the directory's basename is
 * `ses-XX` the file lives under that session dir; when the directory is
 * itself a `sub-XX` (no sessions), the file sits next to the datatype
 * subfolders.
 */
export function computeScansTsvPath(sessionDir: string): string {
  const name = basename(sessionDir)
  const isSession = name.startsWith('ses-')
  if (!isSession) {
    return `${sessionDir}/${name}_scans.tsv`
  }
  const parent = dirname(sessionDir)
  const subName = parent.length === 0 ? '' : basename(parent)
  return `${sessionDir}/${subName}_${name}_scans.tsv`
}

/**
 * Walk a session directory's `datatype/*.json` files, pair each with a
 * sibling `.nii` or `.nii.gz`, and aggregate `AcquisitionDateTime` into
 * a `scans.tsv` body. Returns null when nothing is paired.
 */
export async function aggregateScansTsv(
  sessionDir: string,
  fs: PostPassFs
): Promise<{ path: string; content: string } | null> {
  const datatypes = (await fs.readDir(sessionDir)).filter((e) => e.isDirectory)
  const rows: ScansRow[] = []
  for (const dt of datatypes) {
    const dtDir = `${sessionDir}/${dt.name}`
    let entries: Awaited<ReturnType<PostPassFs['readDir']>>
    try {
      entries = await fs.readDir(dtDir)
    } catch {
      continue
    }
    const jsons = entries
      .filter((e) => e.isFile && e.name.endsWith('.json'))
      .map((e) => e.name)
      .sort()
    for (const j of jsons) {
      const stem = j.slice(0, -'.json'.length)
      const niiGz = `${stem}.nii.gz`
      const nii = `${stem}.nii`
      const candidate = entries.find((e) => e.isFile && (e.name === niiGz || e.name === nii))
      if (candidate === undefined) continue
      let parsed: Record<string, unknown>
      try {
        const text = await fs.readTextFile(`${dtDir}/${j}`)
        parsed = JSON.parse(text) as Record<string, unknown>
      } catch {
        continue
      }
      rows.push({
        filename: `${dt.name}/${candidate.name}`,
        acqTime: acqIso(parsed) ?? 'n/a'
      })
    }
  }
  if (rows.length === 0) return null
  return {
    path: computeScansTsvPath(sessionDir),
    content: buildScansTsvContent(rows)
  }
}
