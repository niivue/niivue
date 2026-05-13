import fs from 'node:fs'
import path from 'node:path'
import type { BidsDiskFile } from '../../common/bidsTypes.js'

const NIFTI_EXTS = ['.nii.gz', '.nii']

function stripNiftiExt(filename: string): { stem: string; ext: string } {
  for (const ext of NIFTI_EXTS) {
    if (filename.endsWith(ext)) return { stem: filename.slice(0, -ext.length), ext }
  }
  return { stem: filename, ext: '' }
}

function loadJson(p: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/**
 * Walk a BIDS dataset root and return one row per NIfTI. `sourcedata/` and
 * `derivatives/` are skipped — Prep-side rules say only the canonical tree
 * is editable through the tree editor.
 *
 * Parses subject / session / datatype from the directory layout rather than
 * filename entities, because the directory layout is authoritative in BIDS
 * (filenames may be missing _ses- when there's no session).
 */
export function readBidsTree(root: string): BidsDiskFile[] {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return []

  const results: BidsDiskFile[] = []

  const subjects = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('sub-'))

  for (const subDir of subjects) {
    const subject = subDir.name.slice(4)
    const subPath = path.join(root, subDir.name)

    // Subjects may or may not have sessions. If a `ses-*` dir exists at the
    // top level we recurse into it; otherwise datatype dirs sit directly
    // under the subject.
    const subEntries = fs.readdirSync(subPath, { withFileTypes: true })
    const sessionDirs = subEntries.filter((e) => e.isDirectory() && e.name.startsWith('ses-'))

    if (sessionDirs.length > 0) {
      for (const sesDir of sessionDirs) {
        const session = sesDir.name.slice(4)
        collectDatatypes(path.join(subPath, sesDir.name), subject, session, root, results)
      }
    } else {
      collectDatatypes(subPath, subject, '', root, results)
    }
  }

  return results
}

function collectDatatypes(
  parentDir: string,
  subject: string,
  session: string,
  root: string,
  results: BidsDiskFile[]
): void {
  for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const datatype = entry.name
    if (datatype === 'sourcedata' || datatype === 'derivatives') continue
    const datatypeDir = path.join(parentDir, datatype)

    for (const fileEntry of fs.readdirSync(datatypeDir, { withFileTypes: true })) {
      if (!fileEntry.isFile()) continue
      const { stem, ext } = stripNiftiExt(fileEntry.name)
      if (ext === '') continue

      const niftiPath = path.join(datatypeDir, fileEntry.name)
      const sidecarCandidate = path.join(datatypeDir, `${stem}.json`)
      const hasSidecar = fs.existsSync(sidecarCandidate)
      const sidecar = hasSidecar ? loadJson(sidecarCandidate) : {}
      const bidsPath = path.relative(root, niftiPath).split(path.sep).join('/')

      results.push({
        niftiPath,
        sidecarPath: hasSidecar ? sidecarCandidate : null,
        bidsPath,
        subject,
        session,
        datatype,
        filename: fileEntry.name,
        sidecar
      })
    }
  }
}
