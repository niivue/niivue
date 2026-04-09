import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  analyzeValidatorIssues,
  autoFixUnambiguous,
  readSidecar,
  resolveSidecarPath,
  updateSidecar
} from '../../src/main/utils/bidsSidecarFixer.js'
import type { BidsValidationResult } from '../../src/common/bidsTypes.js'

// ---------------------------------------------------------------------------
// Disk helpers — every test gets its own isolated temp dataset
// ---------------------------------------------------------------------------

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bids-fixer-'))
})

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* best effort */
  }
})

function writeFile(rel: string, content: string): string {
  const full = path.join(tmpDir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

function writeSidecar(rel: string, obj: Record<string, unknown>): string {
  return writeFile(rel, JSON.stringify(obj, null, 2) + '\n')
}

// ---------------------------------------------------------------------------
// resolveSidecarPath
// ---------------------------------------------------------------------------

describe('resolveSidecarPath', () => {
  it('maps dataset-relative .nii.gz paths to .json sidecars', () => {
    const out = resolveSidecarPath('/data/bids', '/sub-01/func/sub-01_task-rest_bold.nii.gz')
    expect(out).toBe('/data/bids/sub-01/func/sub-01_task-rest_bold.json')
  })

  it('handles plain .nii extension', () => {
    const out = resolveSidecarPath('/data/bids', 'sub-01/anat/sub-01_T1w.nii')
    expect(out).toBe('/data/bids/sub-01/anat/sub-01_T1w.json')
  })

  it('swaps _events.tsv for its sidecar', () => {
    const out = resolveSidecarPath('/data/bids', '/sub-01/func/sub-01_task-rest_events.tsv')
    expect(out).toBe('/data/bids/sub-01/func/sub-01_task-rest.json')
  })

  it('returns null for empty input', () => {
    expect(resolveSidecarPath('/data/bids', '')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// analyzeValidatorIssues
// ---------------------------------------------------------------------------

describe('analyzeValidatorIssues', () => {
  it('proposes a TaskName fix when validator complains about task name', () => {
    writeSidecar('sub-01/func/sub-01_task-rest_bold.json', {
      RepetitionTime: 2.0
    })
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'TaskName must be defined in the sidecar',
          code: 'TASK_NAME_MUST_DEFINE',
          file: '/sub-01/func/sub-01_task-rest_bold.nii.gz'
        }
      ],
      warnings: []
    }
    const proposals = analyzeValidatorIssues(tmpDir, result)
    expect(proposals).toHaveLength(1)
    expect(proposals[0].relativePath).toBe(
      path.join('sub-01', 'func', 'sub-01_task-rest_bold.json')
    )
    expect(proposals[0].suggestions.map((s) => s.field)).toContain('TaskName')
    const tn = proposals[0].suggestions.find((s) => s.field === 'TaskName')
    expect(tn?.kind).toBe('string')
    expect(tn?.issueCodes).toContain('TASK_NAME_MUST_DEFINE')
  })

  it('collapses duplicate rules across multiple issues on the same file', () => {
    writeSidecar('sub-01/func/sub-01_task-rest_bold.json', {})
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'RepetitionTime missing',
          code: 'NO_REPETITION_TIME',
          file: '/sub-01/func/sub-01_task-rest_bold.nii.gz'
        },
        {
          severity: 'error',
          message: 'RepetitionTime must be a number',
          code: 'REPETITION_TIME_MUST_BE_NUMBER',
          file: '/sub-01/func/sub-01_task-rest_bold.nii.gz'
        }
      ],
      warnings: []
    }
    const proposals = analyzeValidatorIssues(tmpDir, result)
    expect(proposals).toHaveLength(1)
    const rt = proposals[0].suggestions.find((s) => s.field === 'RepetitionTime')
    expect(rt).toBeDefined()
    expect(rt?.issueCodes).toEqual(
      expect.arrayContaining(['NO_REPETITION_TIME', 'REPETITION_TIME_MUST_BE_NUMBER'])
    )
  })

  it('exposes enum options for PhaseEncodingDirection', () => {
    writeSidecar('sub-01/fmap/sub-01_dir-AP_epi.json', {})
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'PhaseEncodingDirection is required',
          code: 'PHASE_ENCODING_DIRECTION_MUST_DEFINE',
          file: '/sub-01/fmap/sub-01_dir-AP_epi.nii.gz'
        }
      ],
      warnings: []
    }
    const [p] = analyzeValidatorIssues(tmpDir, result)
    const ped = p.suggestions.find((s) => s.field === 'PhaseEncodingDirection')
    expect(ped?.kind).toBe('enum')
    expect(ped?.options).toEqual(['i', 'i-', 'j', 'j-', 'k', 'k-'])
  })

  it('falls back to dataset_description.json for dataset-level Authors issues', () => {
    writeSidecar('dataset_description.json', { Name: 'demo', BIDSVersion: '1.9.0' })
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'Authors must contain at least one entry',
          code: 'NO_AUTHORS'
        }
      ],
      warnings: []
    }
    const [p] = analyzeValidatorIssues(tmpDir, result)
    expect(p.relativePath).toBe('dataset_description.json')
    expect(p.suggestions.map((s) => s.field)).toContain('Authors')
  })

  it('drops proposals with no editable suggestions', () => {
    writeSidecar('sub-01/func/sub-01_task-rest_bold.json', {})
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'Some unrecognised problem',
          code: 'UNKNOWN_XYZ',
          file: '/sub-01/func/sub-01_task-rest_bold.nii.gz'
        }
      ],
      warnings: []
    }
    expect(analyzeValidatorIssues(tmpDir, result)).toEqual([])
  })

  it('skips issues when the referenced sidecar does not exist on disk', () => {
    const result: BidsValidationResult = {
      valid: false,
      errors: [
        {
          severity: 'error',
          message: 'TaskName missing',
          code: 'TASK_NAME_MUST_DEFINE',
          file: '/sub-99/func/sub-99_task-rest_bold.nii.gz'
        }
      ],
      warnings: []
    }
    expect(analyzeValidatorIssues(tmpDir, result)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// readSidecar / updateSidecar
// ---------------------------------------------------------------------------

describe('updateSidecar', () => {
  it('merges string and number updates into the sidecar', () => {
    const p = writeSidecar('s.json', { RepetitionTime: 1.5 })
    const res = updateSidecar(p, { TaskName: 'rest', RepetitionTime: 2.0 })
    expect(res.ok).toBe(true)
    const read = readSidecar(p)
    expect(read).toEqual({ RepetitionTime: 2.0, TaskName: 'rest' })
  })

  it('deletes keys when value is empty string, null, or empty array', () => {
    const p = writeSidecar('s.json', { TaskName: 'rest', IntendedFor: ['x'], FlipAngle: 9 })
    const res = updateSidecar(p, { TaskName: '', IntendedFor: [], FlipAngle: null })
    expect(res.ok).toBe(true)
    expect(readSidecar(p)).toEqual({})
  })

  it('reports an error for a missing sidecar path', () => {
    const res = updateSidecar(path.join(tmpDir, 'missing.json'), { Foo: 1 })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found/i)
  })
})

// ---------------------------------------------------------------------------
// autoFixUnambiguous
// ---------------------------------------------------------------------------

describe('autoFixUnambiguous', () => {
  it('derives TaskName from the _task- segment in the filename', () => {
    const p = writeSidecar('sub-01/func/sub-01_task-rest_bold.json', {
      RepetitionTime: 2.0
    })
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toHaveLength(1)
    expect(res.fixes[0].field).toBe('TaskName')
    expect(res.fixes[0].newValue).toBe('rest')
    expect(res.fixes[0].oldValue).toBeUndefined()
    expect(readSidecar(p)).toEqual({ RepetitionTime: 2.0, TaskName: 'rest' })
  })

  it('overwrites an empty-string TaskName', () => {
    const p = writeSidecar('sub-02/func/sub-02_task-nback_bold.json', {
      TaskName: ''
    })
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toHaveLength(1)
    expect(res.fixes[0].newValue).toBe('nback')
    expect(readSidecar(p)).toEqual({ TaskName: 'nback' })
  })

  it('leaves a pre-existing non-empty TaskName alone', () => {
    writeSidecar('sub-03/func/sub-03_task-rest_bold.json', {
      TaskName: 'MyCustomName'
    })
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toEqual([])
  })

  it('skips top-level files like dataset_description.json', () => {
    writeSidecar('dataset_description.json', { Name: 'x', BIDSVersion: '1.9.0' })
    writeSidecar('participants.json', {})
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toEqual([])
  })

  it('skips sidecars without a _task- segment', () => {
    writeSidecar('sub-01/anat/sub-01_T1w.json', {})
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toEqual([])
  })

  it('skips files under sourcedata/ and derivatives/', () => {
    writeSidecar('sourcedata/sub-01/func/sub-01_task-rest_bold.json', {})
    writeSidecar('derivatives/pipe/sub-01/func/sub-01_task-rest_bold.json', {})
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toEqual([])
  })

  it('handles multiple subjects and sessions in a single pass', () => {
    writeSidecar('sub-01/ses-01/func/sub-01_ses-01_task-rest_bold.json', {})
    writeSidecar('sub-01/ses-02/func/sub-01_ses-02_task-rest_bold.json', {})
    writeSidecar('sub-02/func/sub-02_task-nback_bold.json', {})
    const res = autoFixUnambiguous(tmpDir)
    expect(res.fixes).toHaveLength(3)
    const tasks = res.fixes.map((f) => f.newValue).sort()
    expect(tasks).toEqual(['nback', 'rest', 'rest'])
  })

  it('returns an empty result for a nonexistent directory', () => {
    const res = autoFixUnambiguous(path.join(tmpDir, 'does-not-exist'))
    expect(res.fixes).toEqual([])
  })
})
