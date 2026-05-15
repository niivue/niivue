import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathsafety-userdata-'))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (k: string) => {
      if (k === 'userData') return userDataDir
      return os.tmpdir()
    }
  }
}))

import {
  isPathUnderAllowedRoot,
  registerAllowedRoot,
  _resetPathSafetyForTests
} from '../../src/main/utils/pathSafety.js'

describe('pathSafety', () => {
  beforeEach(() => {
    _resetPathSafetyForTests()
  })

  it('returns true for a file under userData', () => {
    const inside = path.join(userDataDir, 'sub.txt')
    fs.writeFileSync(inside, 'x')
    expect(isPathUnderAllowedRoot(inside)).toBe(true)
  })

  it('returns false for a path outside any allowed root', () => {
    // /etc is not under any default allowed root (userData/temp/documents/home).
    // It's also a path that exists, demonstrating that confinement supersedes
    // actual existence.
    expect(isPathUnderAllowedRoot('/etc/hosts')).toBe(false)
  })

  it('rejects ..-traversing paths that resolve outside an allowed root', () => {
    const traversal = path.join(userDataDir, '..', '..', '..', '..', 'etc', 'passwd')
    expect(isPathUnderAllowedRoot(traversal)).toBe(false)
  })

  it('returns true for a registered dynamic root and false for siblings', () => {
    const fakeRoot = path.resolve('/private/var/synthetic-pathsafety-root')
    expect(isPathUnderAllowedRoot(path.join(fakeRoot, 'inside.txt'))).toBe(false)
    registerAllowedRoot(fakeRoot)
    expect(isPathUnderAllowedRoot(path.join(fakeRoot, 'inside.txt'))).toBe(true)
    expect(isPathUnderAllowedRoot('/private/var/synthetic-other')).toBe(false)
  })

  it('returns false for empty or non-string inputs', () => {
    expect(isPathUnderAllowedRoot('')).toBe(false)
    // @ts-expect-error: testing runtime guard
    expect(isPathUnderAllowedRoot(null)).toBe(false)
    // @ts-expect-error: testing runtime guard
    expect(isPathUnderAllowedRoot(undefined)).toBe(false)
  })
})
