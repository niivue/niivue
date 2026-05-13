import { describe, it, expect } from 'vitest'
import {
  mappingsToTreeFiles,
  groupTreeFiles,
  applySidecarOverrideBatch,
  buildInspectorRows
} from '../../src/renderer/src/components/BidsWizard/bidsTreeEditorModel.js'
import type { BidsSeriesMapping } from '../../src/common/bidsTypes.js'

function mkMapping(overrides: Partial<BidsSeriesMapping> = {}): BidsSeriesMapping {
  return {
    index: 0,
    seriesDescription: 'series',
    sidecarPath: '/tmp/x.json',
    niftiPath: '/tmp/x.nii.gz',
    datatype: 'anat',
    suffix: 'T1w',
    task: '',
    acq: '',
    ce: '',
    rec: '',
    dir: '',
    run: 0,
    echo: 0,
    subject: '01',
    session: '',
    confidence: 'high',
    heuristicReason: '',
    excluded: false,
    ...overrides
  }
}

describe('mappingsToTreeFiles', () => {
  it('drops excluded mappings', () => {
    const out = mappingsToTreeFiles([
      mkMapping({ index: 0 }),
      mkMapping({ index: 1, excluded: true })
    ])
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('0')
  })

  it('merges original + overrides into the sidecar snapshot, overrides win', () => {
    const m = mkMapping({
      sidecarData: {
        original: { RepetitionTime: 2.0, EchoTime: 0.03 },
        overrides: { RepetitionTime: 2.5 }
      }
    })
    const out = mappingsToTreeFiles([m])
    expect(out[0].sidecar).toEqual({ RepetitionTime: 2.5, EchoTime: 0.03 })
  })

  it('strips BidsGuess (dcm2niix-internal scratch)', () => {
    const m = mkMapping({
      sidecarData: {
        original: { BidsGuess: ['anat', 'T1w'], RepetitionTime: 2.0 },
        overrides: {}
      }
    })
    const out = mappingsToTreeFiles([m])
    expect(out[0].sidecar).not.toHaveProperty('BidsGuess')
    expect(out[0].sidecar).toHaveProperty('RepetitionTime', 2.0)
  })
})

describe('groupTreeFiles', () => {
  it('groups subject → session → datatype and sorts each level', () => {
    const files = mappingsToTreeFiles([
      mkMapping({ index: 0, subject: '02', datatype: 'func', suffix: 'bold' }),
      mkMapping({ index: 1, subject: '01', datatype: 'anat' }),
      mkMapping({ index: 2, subject: '01', session: 'pre', datatype: 'anat' })
    ])
    const groups = groupTreeFiles(files)
    expect(groups.map((g) => g.subject)).toEqual(['01', '02'])
    const sub01 = groups[0]
    expect(sub01.sessions.map((s) => s.session)).toEqual(['', 'pre'])
  })
})

describe('applySidecarOverrideBatch', () => {
  it('updates only mappings whose index is in keys', () => {
    const a = mkMapping({ index: 0 })
    const b = mkMapping({ index: 1 })
    const next = applySidecarOverrideBatch([a, b], ['0'], 'RepetitionTime', 2.5)
    expect(next[0]).not.toBe(a)
    expect(next[1]).toBe(b) // referential equality preserved for untouched rows
    expect(next[0].sidecarData?.overrides).toEqual({ RepetitionTime: 2.5 })
  })

  it('returns the same array reference when keys is empty', () => {
    const a = mkMapping({ index: 0 })
    const input = [a]
    const out = applySidecarOverrideBatch(input, [], 'X', 1)
    expect(out).toBe(input)
  })

  it('value=undefined removes the override (falls back to original)', () => {
    const a = mkMapping({
      index: 0,
      sidecarData: {
        original: { RepetitionTime: 2.0 },
        overrides: { RepetitionTime: 2.5 }
      }
    })
    const next = applySidecarOverrideBatch([a], ['0'], 'RepetitionTime', undefined)
    expect(next[0].sidecarData?.overrides).toEqual({})
    expect(next[0].sidecarData?.original).toEqual({ RepetitionTime: 2.0 })
  })

  it('preserves other override fields when editing one', () => {
    const a = mkMapping({
      index: 0,
      sidecarData: { original: {}, overrides: { RepetitionTime: 2.5, EchoTime: 0.03 } }
    })
    const next = applySidecarOverrideBatch([a], ['0'], 'FlipAngle', 90)
    expect(next[0].sidecarData?.overrides).toEqual({
      RepetitionTime: 2.5,
      EchoTime: 0.03,
      FlipAngle: 90
    })
  })
})

describe('buildInspectorRows', () => {
  it('returns one row per union of fields with varies set when values disagree', () => {
    const m1 = mkMapping({
      index: 0,
      sidecarData: { original: { RepetitionTime: 2.0, A: 'x' }, overrides: {} }
    })
    const m2 = mkMapping({
      index: 1,
      sidecarData: { original: { RepetitionTime: 2.5, B: 'y' }, overrides: {} }
    })
    const files = mappingsToTreeFiles([m1, m2])
    const rows = buildInspectorRows(files)
    const byField = Object.fromEntries(rows.map((r) => [r.field, r]))
    expect(byField['RepetitionTime'].varies).toBe(true)
    // A is only on one file → varies (undefined vs 'x')
    expect(byField['A'].varies).toBe(true)
    expect(byField['B'].varies).toBe(true)
  })

  it('non-varies returns the shared value', () => {
    const m1 = mkMapping({
      index: 0,
      sidecarData: { original: { RepetitionTime: 2.0 }, overrides: {} }
    })
    const m2 = mkMapping({
      index: 1,
      sidecarData: { original: { RepetitionTime: 2.0 }, overrides: {} }
    })
    const files = mappingsToTreeFiles([m1, m2])
    const rows = buildInspectorRows(files)
    expect(rows[0]).toEqual({ field: 'RepetitionTime', value: 2.0, varies: false })
  })

  it('returns [] for an empty selection', () => {
    expect(buildInspectorRows([])).toEqual([])
  })
})
