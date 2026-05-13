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

function bidsRelative(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/')
}

function maybePushTsv(
  root: string,
  dir: string,
  filename: string,
  subject: string,
  session: string,
  datatype: string,
  results: BidsDiskFile[]
): void {
  if (!filename.endsWith('.tsv')) return
  const abs = path.join(dir, filename)
  const stem = filename.slice(0, -'.tsv'.length)
  const sidecarCandidate = path.join(dir, `${stem}.json`)
  const hasSidecar = fs.existsSync(sidecarCandidate)
  results.push({
    kind: 'tsv',
    niftiPath: abs,
    sidecarPath: hasSidecar ? sidecarCandidate : null,
    bidsPath: bidsRelative(root, abs),
    subject,
    session,
    datatype,
    filename,
    sidecar: hasSidecar ? loadJson(sidecarCandidate) : {}
  })
}

/**
 * Walk a BIDS dataset root and return one row per NIfTI or TSV. `sourcedata/`
 * and `derivatives/` are skipped — Prep-side rules say only the canonical tree
 * is editable through the tree editor.
 *
 * NIfTI rows are editable (paired with their JSON sidecar); TSV rows
 * (participants.tsv, sessions.tsv, scans.tsv, events.tsv) are surfaced read-only
 * so validator errors about them have a navigable home in the tree.
 *
 * Parses subject / session / datatype from the directory layout rather than
 * filename entities, because the directory layout is authoritative in BIDS
 * (filenames may be missing _ses- when there's no session).
 */
export function readBidsTree(root: string): BidsDiskFile[] {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return []

  const results: BidsDiskFile[] = []

  // Dataset-level TSV (participants.tsv and any other .tsv that lives at the
  // root). subject/session/datatype all empty → "Dataset" group in the tree.
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    maybePushTsv(root, root, entry.name, '', '', '', results)
  }

  const subjects = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('sub-'))

  for (const subDir of subjects) {
    const subject = subDir.name.slice(4)
    const subPath = path.join(root, subDir.name)

    // Subject-level TSV (e.g. sub-01_sessions.tsv) lives directly under the
    // subject dir.
    for (const entry of fs.readdirSync(subPath, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      maybePushTsv(root, subPath, entry.name, subject, '', '', results)
    }

    // Subjects may or may not have sessions. If a `ses-*` dir exists at the
    // top level we recurse into it; otherwise datatype dirs sit directly
    // under the subject.
    const subEntries = fs.readdirSync(subPath, { withFileTypes: true })
    const sessionDirs = subEntries.filter((e) => e.isDirectory() && e.name.startsWith('ses-'))

    if (sessionDirs.length > 0) {
      for (const sesDir of sessionDirs) {
        const session = sesDir.name.slice(4)
        const sesPath = path.join(subPath, sesDir.name)
        // Session-level TSV (e.g. sub-01_ses-pre_scans.tsv).
        for (const entry of fs.readdirSync(sesPath, { withFileTypes: true })) {
          if (!entry.isFile()) continue
          maybePushTsv(root, sesPath, entry.name, subject, session, '', results)
        }
        collectDatatypes(sesPath, subject, session, root, results)
      }
    } else {
      // No session dirs: scans.tsv sits at the subject level.
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

      // Datatype-level TSV (e.g. events.tsv) — emit as its own tsv row.
      maybePushTsv(root, datatypeDir, fileEntry.name, subject, session, datatype, results)

      const { stem, ext } = stripNiftiExt(fileEntry.name)
      if (ext === '') continue

      const niftiPath = path.join(datatypeDir, fileEntry.name)
      const sidecarCandidate = path.join(datatypeDir, `${stem}.json`)
      const hasSidecar = fs.existsSync(sidecarCandidate)
      const sidecar = hasSidecar ? loadJson(sidecarCandidate) : {}
      const bidsPath = bidsRelative(root, niftiPath)

      results.push({
        kind: 'nifti',
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
