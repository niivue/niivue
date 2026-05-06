import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

// Roots the renderer is allowed to probe / write under, populated lazily so
// tests can mock electron.app.getPath without forcing a module-load order.
let cachedStaticRoots: string[] | null = null
const dynamicRoots = new Set<string>()

function realOrAbsolute(p: string): string {
  try {
    return fs.realpathSync.native(p)
  } catch {
    return path.resolve(p)
  }
}

function getStaticRoots(): string[] {
  if (cachedStaticRoots !== null) return cachedStaticRoots
  const candidates: string[] = []
  for (const key of ['userData', 'temp', 'documents', 'downloads', 'home'] as const) {
    try {
      const p = app.getPath(key)
      if (p) candidates.push(p)
    } catch {
      // some paths may not be available on every platform
    }
  }
  try {
    if (typeof process.resourcesPath === 'string' && process.resourcesPath) {
      candidates.push(process.resourcesPath)
    }
  } catch {
    // ignore
  }
  cachedStaticRoots = candidates.map((p) => realOrAbsolute(p))
  return cachedStaticRoots
}

/**
 * Register a directory the user has selected (e.g. BIDS output dir, DICOM
 * source dir) so that subsequent file-exists / save IPCs can probe inside it.
 */
export function registerAllowedRoot(dir: string): void {
  if (!dir) return
  dynamicRoots.add(realOrAbsolute(dir))
}

export function getAllowedRoots(): string[] {
  return [...getStaticRoots(), ...Array.from(dynamicRoots).map(realOrAbsolute)]
}

/**
 * Returns true if `target` resolves to a path strictly inside one of the
 * configured allowed roots, with `..` traversal collapsed. The check uses
 * `realpath` on the deepest existing ancestor so that platform-specific
 * symlinks (e.g. macOS `/var` → `/private/var`) don't cause false negatives.
 */
export function isPathUnderAllowedRoot(target: string): boolean {
  if (typeof target !== 'string' || target.length === 0) return false
  const resolved = realOrAbsolute(path.resolve(target))
  // realOrAbsolute only resolves what exists on disk; for non-existent leaves
  // we walk upward to the nearest existing ancestor and substitute its real
  // path, then re-join the remaining (non-existent) tail.
  let candidate = resolved
  if (!fs.existsSync(candidate)) {
    let cursor = path.dirname(resolved)
    let tail = path.basename(resolved)
    while (cursor !== path.dirname(cursor) && !fs.existsSync(cursor)) {
      tail = path.join(path.basename(cursor), tail)
      cursor = path.dirname(cursor)
    }
    if (fs.existsSync(cursor)) {
      candidate = path.join(realOrAbsolute(cursor), tail)
    }
  }
  for (const root of getAllowedRoots()) {
    const rel = path.relative(root, candidate)
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      return true
    }
  }
  return false
}

// Test-only reset hook
export function _resetPathSafetyForTests(): void {
  cachedStaticRoots = null
  dynamicRoots.clear()
}
