import fs from 'node:fs'
import path from 'node:path'

export interface RenameSubjectResult {
  success: boolean
  /** Files renamed inside the subject directory (not counting the dir itself). */
  renamedFiles: number
  /** True if participants.tsv had a row updated. */
  participantsUpdated: boolean
  error?: string
}

const LABEL_RE = /^[a-zA-Z0-9]+$/

/**
 * Rename a subject inside a written BIDS dataset. Moves `sub-<old>/` to
 * `sub-<new>/`, then walks the renamed directory and rewrites every file
 * whose basename starts with `sub-<old>_` or `sub-<old>.`. Updates the
 * participant_id column in participants.tsv if present.
 *
 * Refuses to overwrite an existing sub-<new> dir — the caller has to
 * resolve the collision first.
 *
 * Intentionally NOT handled here (left to a follow-up):
 *   - scans.tsv filename rewrites
 *   - IntendedFor / B0Field references in other subjects' sidecars
 *   - phenotype/ and dataset-level _bold.json inheritance files
 * These are rarer in the desktop's per-subject conversion flow; surface
 * them through the validator output rather than auto-rewriting blindly.
 */
export function renameSubject(
  bidsDir: string,
  oldLabel: string,
  newLabel: string
): RenameSubjectResult {
  if (!LABEL_RE.test(newLabel)) {
    return {
      success: false,
      renamedFiles: 0,
      participantsUpdated: false,
      error: 'Subject label must be alphanumeric (no underscores or dashes).'
    }
  }
  if (oldLabel === newLabel) {
    return { success: true, renamedFiles: 0, participantsUpdated: false }
  }

  const oldDir = path.join(bidsDir, `sub-${oldLabel}`)
  const newDir = path.join(bidsDir, `sub-${newLabel}`)
  if (!fs.existsSync(oldDir) || !fs.statSync(oldDir).isDirectory()) {
    return {
      success: false,
      renamedFiles: 0,
      participantsUpdated: false,
      error: `Subject directory sub-${oldLabel} not found in ${bidsDir}.`
    }
  }
  if (fs.existsSync(newDir)) {
    return {
      success: false,
      renamedFiles: 0,
      participantsUpdated: false,
      error: `sub-${newLabel} already exists — pick another label or remove the existing directory first.`
    }
  }

  // Move the subject directory first. If anything below fails the dir is
  // already at its new location — we keep going rather than rolling back
  // because the alternative (renaming files first inside the old dir)
  // leaves a half-renamed mess that's harder to recover from.
  fs.renameSync(oldDir, newDir)

  const oldPrefix = `sub-${oldLabel}`
  const newPrefix = `sub-${newLabel}`
  let renamedFiles = 0

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const current = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(current)
        continue
      }
      if (
        entry.name.startsWith(oldPrefix + '_') ||
        entry.name.startsWith(oldPrefix + '.')
      ) {
        const newName = newPrefix + entry.name.slice(oldPrefix.length)
        fs.renameSync(current, path.join(dir, newName))
        renamedFiles++
      }
    }
  }
  walk(newDir)

  // participants.tsv: rewrite the participant_id column. We assume column 0
  // is participant_id (BIDS convention); if not, the caller can fix it
  // manually — there's no safe way to guess which column holds IDs.
  let participantsUpdated = false
  const participantsTsv = path.join(bidsDir, 'participants.tsv')
  if (fs.existsSync(participantsTsv)) {
    const original = fs.readFileSync(participantsTsv, 'utf-8')
    const lines = original.split('\n')
    let changed = false
    const rewritten = lines.map((line, idx) => {
      if (idx === 0) return line
      if (!line) return line
      const cols = line.split('\t')
      if (cols[0] === oldPrefix) {
        cols[0] = newPrefix
        changed = true
      }
      return cols.join('\t')
    })
    if (changed) {
      fs.writeFileSync(participantsTsv, rewritten.join('\n'))
      participantsUpdated = true
    }
  }

  return { success: true, renamedFiles, participantsUpdated }
}
