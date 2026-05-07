import * as path from 'node:path'
import * as fs from 'node:fs'

export interface HeadlessOutputGuardOptions {
  /** The user-supplied --output target (file path, directory, or "-" for stdout). */
  cliOutput?: string | null
  /** Fallback root when --output is missing or stdout. */
  fallbackRoot: string
}

/**
 * Resolve the canonical output root for headless writes. Prefer the directory
 * containing the user-supplied --output target; fall back to `fallbackRoot`
 * when no output was given.
 */
export function getHeadlessOutputRoot(opts: HeadlessOutputGuardOptions): string {
  const { cliOutput, fallbackRoot } = opts
  if (cliOutput && cliOutput !== '-') {
    const resolved = path.resolve(cliOutput)
    try {
      const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null
      if (stat?.isDirectory()) return resolved
    } catch {
      /* ignore */
    }
    if (path.extname(resolved) === '') return resolved
    return path.dirname(resolved)
  }
  return fallbackRoot
}

/**
 * Validates a renderer-supplied output path is inside the headless output
 * root, collapsing any `..` traversal. Returns the resolved absolute path.
 * Throws when the requested target escapes the root.
 */
export function resolveSafeHeadlessOutput(
  outputPath: string,
  opts: HeadlessOutputGuardOptions
): string {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('outputPath is required')
  }
  const root = path.resolve(getHeadlessOutputRoot(opts))
  const resolved = path.isAbsolute(outputPath)
    ? path.resolve(outputPath)
    : path.resolve(root, outputPath)
  const rel = path.relative(root, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`outputPath escapes allowed root: ${outputPath}`)
  }
  return resolved
}
