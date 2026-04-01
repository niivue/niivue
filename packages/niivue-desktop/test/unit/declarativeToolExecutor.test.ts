import { describe, it, expect, vi } from 'vitest'
import path from 'node:path'

// Mock Electron and side-effectful modules before importing the module under test
vi.mock('electron', () => ({ app: { isPackaged: false } }))
vi.mock('../../src/main/utils/spawnBinary.js', () => ({}))
vi.mock('../../src/main/utils/inputResolver.js', () => ({}))
vi.mock('../../src/main/utils/toolRegistry.js', () => ({}))

import {
  interpolate,
  buildArgs,
  resolveOutputFile,
  matchGlob
} from '../../src/main/utils/declarativeToolExecutor.js'
import type { ToolExecDef, ArgDef } from '../../src/common/workflowTypes.js'

// ── interpolate ──────────────────────────────────────────────────────

describe('interpolate', () => {
  it('performs basic substitution', () => {
    expect(interpolate('hello {{name}}', { name: 'world' })).toBe('hello world')
  })

  it('resolves dotted paths', () => {
    const vars = { 'resources.template': '/path/to/template' } as Record<string, string>
    // dotted-path lookup traverses nested objects, but the implementation
    // also stores flattened keys like "resources.template" — however the
    // regex walks the dot parts, so we need a nested structure for that.
    const nested: any = { resources: { template: '/std/MNI152.nii.gz' } }
    expect(interpolate('{{resources.template}}', nested)).toBe('/std/MNI152.nii.gz')
  })

  it('returns empty string for missing keys', () => {
    expect(interpolate('prefix_{{missing}}_suffix', {})).toBe('prefix__suffix')
  })

  it('returns string unchanged when no placeholders present', () => {
    expect(interpolate('no placeholders here', { a: 'b' })).toBe('no placeholders here')
  })

  it('handles multiple substitutions in one template', () => {
    const result = interpolate('{{a}}-{{b}}-{{c}}', { a: '1', b: '2', c: '3' })
    expect(result).toBe('1-2-3')
  })
})

// ── buildArgs ────────────────────────────────────────────────────────

describe('buildArgs', () => {
  it('maps input key to positional arg', () => {
    const defs: ArgDef[] = [{ input: 'inFile' }]
    const result = buildArgs(defs, { inFile: '/data/brain.nii' }, {})
    expect(result).toEqual(['/data/brain.nii'])
  })

  it('maps input key with flag', () => {
    const defs: ArgDef[] = [{ input: 'inFile', flag: '-i' }]
    const result = buildArgs(defs, { inFile: '/data/brain.nii' }, {})
    expect(result).toEqual(['-i', '/data/brain.nii'])
  })

  it('omits arg when input is missing and no default', () => {
    const defs: ArgDef[] = [{ input: 'missing', flag: '-m' }]
    const result = buildArgs(defs, {}, {})
    expect(result).toEqual([])
  })

  it('uses default when input is missing', () => {
    const defs: ArgDef[] = [{ input: 'threshold', flag: '-t', default: '0.5' }]
    const result = buildArgs(defs, {}, {})
    expect(result).toEqual(['-t', '0.5'])
  })

  it('handles literal value without flag', () => {
    const defs: ArgDef[] = [{ value: '-bet' }]
    const result = buildArgs(defs, {}, {})
    expect(result).toEqual(['-bet'])
  })

  it('handles literal value with flag', () => {
    const defs: ArgDef[] = [{ value: '/out/dir', flag: '-o' }]
    const result = buildArgs(defs, {}, {})
    expect(result).toEqual(['-o', '/out/dir'])
  })

  it('interpolates template vars in literal values', () => {
    const defs: ArgDef[] = [{ value: '{{outputDir}}/result.nii' }]
    const result = buildArgs(defs, {}, { outputDir: '/tmp/wf-123' })
    expect(result).toEqual(['/tmp/wf-123/result.nii'])
  })

  it('preserves order of multiple args', () => {
    const defs: ArgDef[] = [
      { input: 'inFile' },
      { value: '-bet' },
      { input: 'outFile', flag: '-o' }
    ]
    const result = buildArgs(
      defs,
      { inFile: '/data/brain.nii', outFile: '/out/brain_bet.nii' },
      {}
    )
    expect(result).toEqual(['/data/brain.nii', '-bet', '-o', '/out/brain_bet.nii'])
  })
})

// ── resolveOutputFile ────────────────────────────────────────────────

describe('resolveOutputFile', () => {
  const makeExec = (outputFile?: ToolExecDef['outputFile']): ToolExecDef =>
    ({
      binary: { name: 'test', paths: {}, packagedPaths: {} },
      args: [],
      outputs: {},
      outputFile
    }) as ToolExecDef

  it('returns input basename in outDir when no outputFile spec', () => {
    const exec = makeExec(undefined)
    const result = resolveOutputFile(exec, '/data/sub-01/brain.nii.gz', '/tmp/out', {})
    expect(result).toBe(path.join('/tmp/out', 'brain.nii.gz'))
  })

  it('strips extension and applies template', () => {
    const exec = makeExec({
      template: '{{inputBasename}}_brain.nii.gz',
      stripExtensions: ['.nii.gz', '.nii']
    })
    const result = resolveOutputFile(exec, '/data/sub-01/T1w.nii.gz', '/tmp/out', {})
    expect(result).toBe(path.join('/tmp/out', 'T1w_brain.nii.gz'))
  })

  it('strips only the first matching extension', () => {
    const exec = makeExec({
      template: '{{inputBasename}}_processed.nii',
      stripExtensions: ['.nii.gz', '.nii']
    })
    // .nii.gz matches first, so "brain" remains
    const result = resolveOutputFile(exec, '/data/brain.nii.gz', '/tmp/out', {})
    expect(result).toBe(path.join('/tmp/out', 'brain_processed.nii'))
  })

  it('joins result with outDir', () => {
    const exec = makeExec({
      template: '{{inputBasename}}_out.nii.gz',
      stripExtensions: ['.nii.gz']
    })
    const result = resolveOutputFile(exec, '/data/scan.nii.gz', '/output/dir', {})
    expect(result).toBe(path.join('/output/dir', 'scan_out.nii.gz'))
  })

  it('uses template vars in output template', () => {
    const exec = makeExec({
      template: '{{inputBasename}}_to_{{resources.template}}.nii.gz',
      stripExtensions: ['.nii.gz']
    })
    const vars: any = { resources: { template: 'MNI152' } }
    const result = resolveOutputFile(exec, '/data/T1w.nii.gz', '/tmp/out', vars)
    expect(result).toBe(path.join('/tmp/out', 'T1w_to_MNI152.nii.gz'))
  })
})

// ── matchGlob ────────────────────────────────────────────────────────

describe('matchGlob', () => {
  it('matches wildcard extension pattern', () => {
    expect(matchGlob('brain.nii.gz', '*.nii.gz')).toBe(true)
  })

  it('matches simple extension pattern', () => {
    expect(matchGlob('series.json', '*.json')).toBe(true)
  })

  it('handles brace expansion with multiple alternatives', () => {
    expect(matchGlob('brain.nii', '{*.nii,*.nii.gz}')).toBe(true)
    expect(matchGlob('brain.nii.gz', '{*.nii,*.nii.gz}')).toBe(true)
  })

  it('rejects non-matching filenames', () => {
    expect(matchGlob('brain.nii.gz', '*.json')).toBe(false)
  })

  it('matches exact filename', () => {
    expect(matchGlob('output.txt', 'output.txt')).toBe(true)
  })

  it('rejects partial matches', () => {
    expect(matchGlob('brain.nii.gz.bak', '*.nii.gz')).toBe(false)
  })

  it('handles brace expansion that does not match', () => {
    expect(matchGlob('brain.dcm', '{*.nii,*.nii.gz}')).toBe(false)
  })
})
