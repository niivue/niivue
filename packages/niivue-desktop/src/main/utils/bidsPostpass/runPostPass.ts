// Top-level orchestrator for the import post-pass. For every session-
// equivalent directory under the freshly-imported BIDS root, run both
// passes and route every disk write through the supplied writeText
// callback. The caller decides whether to make those writes undoable.
//
// Failure model: per-session try/catch. A failure during one session is
// recorded in the result and the orchestrator moves on.

import { planB0FieldEdits } from './fmapPairing.js'
import type { PostPassFs } from './fs.js'
import { aggregateScansTsv } from './scansTsv.js'
import { walkSessions } from './walkSessions.js'

export interface PostPassWriteMeta {
  kind: 'post-pass-scans-tsv' | 'post-pass-b0-field'
  sessionDir: string
}

export type PostPassWriteText = (
  path: string,
  content: string,
  meta: PostPassWriteMeta
) => Promise<void>

export interface PostPassResult {
  sessionCount: number
  /** Number of `<sub>[_<ses>]_scans.tsv` files written. */
  scansTsvWrites: number
  /** Number of fmap / target JSON sidecars rewritten with B0Field*. */
  b0FieldEdits: number
  failures: ReadonlyArray<{ sessionDir: string; error: string }>
}

export async function runPostPass(
  rootDir: string,
  writeText: PostPassWriteText,
  fs: PostPassFs
): Promise<PostPassResult> {
  const sessions = await walkSessions(rootDir, fs)
  let scansTsvWrites = 0
  let b0FieldEdits = 0
  const failures: Array<{ sessionDir: string; error: string }> = []

  for (const sessionDir of sessions) {
    try {
      const scans = await aggregateScansTsv(sessionDir, fs)
      if (scans !== null) {
        await writeText(scans.path, scans.content, {
          kind: 'post-pass-scans-tsv',
          sessionDir
        })
        scansTsvWrites++
      }
      const edits = await planB0FieldEdits(sessionDir, fs)
      for (const edit of edits) {
        await writeText(edit.path, edit.content, {
          kind: 'post-pass-b0-field',
          sessionDir
        })
        b0FieldEdits++
      }
    } catch (err) {
      failures.push({
        sessionDir,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return {
    sessionCount: sessions.length,
    scansTsvWrites,
    b0FieldEdits,
    failures
  }
}
