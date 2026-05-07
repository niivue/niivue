import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  getHeadlessOutputRoot,
  resolveSafeHeadlessOutput
} from '../../src/main/utils/headlessOutputGuard.js'

const fallback = os.tmpdir()

describe('headlessOutputGuard - getHeadlessOutputRoot', () => {
  it('uses dirname when --output looks like a file', () => {
    const root = getHeadlessOutputRoot({ cliOutput: '/var/data/run.png', fallbackRoot: fallback })
    expect(root).toBe(path.resolve('/var/data'))
  })

  it('uses the path itself when --output looks like a directory (no extension)', () => {
    const root = getHeadlessOutputRoot({ cliOutput: '/var/data/output_dir', fallbackRoot: fallback })
    expect(root).toBe(path.resolve('/var/data/output_dir'))
  })

  it('uses the path itself when --output exists as a real directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'headless-guard-'))
    const root = getHeadlessOutputRoot({ cliOutput: tmp, fallbackRoot: fallback })
    expect(root).toBe(path.resolve(tmp))
  })

  it('falls back to fallbackRoot when --output is missing', () => {
    expect(getHeadlessOutputRoot({ cliOutput: null, fallbackRoot: fallback })).toBe(fallback)
    expect(getHeadlessOutputRoot({ cliOutput: undefined, fallbackRoot: fallback })).toBe(fallback)
  })

  it('falls back when --output is "-" (stdout)', () => {
    expect(getHeadlessOutputRoot({ cliOutput: '-', fallbackRoot: fallback })).toBe(fallback)
  })
})

describe('headlessOutputGuard - resolveSafeHeadlessOutput', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'headless-guard-write-'))
  const cliOutput = path.join(tmp, 'screenshot.png')
  const opts = { cliOutput, fallbackRoot: fallback }

  it('accepts a path under the resolved root', () => {
    const safe = resolveSafeHeadlessOutput(path.join(tmp, 'sub', 'file.png'), opts)
    expect(safe.startsWith(tmp)).toBe(true)
  })

  it('rejects ..-traversing paths that escape the root', () => {
    expect(() =>
      resolveSafeHeadlessOutput(path.join(tmp, '..', '..', 'etc', 'evil'), opts)
    ).toThrow(/escapes allowed root/)
  })

  it('rejects an unrelated absolute path', () => {
    expect(() => resolveSafeHeadlessOutput('/etc/passwd', opts)).toThrow(/escapes allowed root/)
  })

  it('resolves relative paths under the root', () => {
    const safe = resolveSafeHeadlessOutput('subfolder/out.nii.gz', opts)
    expect(safe).toBe(path.resolve(tmp, 'subfolder/out.nii.gz'))
  })

  it('rejects empty or non-string outputPath', () => {
    expect(() => resolveSafeHeadlessOutput('', opts)).toThrow(/required/)
    // @ts-expect-error: testing runtime guard
    expect(() => resolveSafeHeadlessOutput(undefined, opts)).toThrow(/required/)
  })
})
