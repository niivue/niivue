import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readBidsTree } from '../../src/main/utils/bidsTreeReader.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bids-tree-reader-'))
})

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* */
  }
})

function touch(rel: string, content = ''): string {
  const full = path.join(tmpDir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

function writeJson(rel: string, obj: Record<string, unknown>): string {
  return touch(rel, JSON.stringify(obj))
}

describe('readBidsTree', () => {
  it('returns [] for a non-existent root', () => {
    expect(readBidsTree(path.join(tmpDir, 'nope'))).toEqual([])
  })

  it('walks subject → datatype layout (no sessions)', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    writeJson('sub-01/anat/sub-01_T1w.json', { RepetitionTime: 2.3 })
    const rows = readBidsTree(tmpDir)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      subject: '01',
      session: '',
      datatype: 'anat',
      filename: 'sub-01_T1w.nii.gz',
      bidsPath: 'sub-01/anat/sub-01_T1w.nii.gz',
      sidecar: { RepetitionTime: 2.3 }
    })
    expect(rows[0].sidecarPath).toMatch(/sub-01_T1w\.json$/)
  })

  it('walks subject → session → datatype layout', () => {
    touch('sub-02/ses-pre/func/sub-02_ses-pre_task-rest_bold.nii.gz')
    writeJson('sub-02/ses-pre/func/sub-02_ses-pre_task-rest_bold.json', { TaskName: 'rest' })
    const rows = readBidsTree(tmpDir)
    expect(rows).toHaveLength(1)
    expect(rows[0].subject).toBe('02')
    expect(rows[0].session).toBe('pre')
    expect(rows[0].datatype).toBe('func')
  })

  it('returns empty sidecar object and null sidecarPath when no .json exists', () => {
    touch('sub-03/anat/sub-03_T2w.nii.gz')
    const rows = readBidsTree(tmpDir)
    expect(rows).toHaveLength(1)
    expect(rows[0].sidecar).toEqual({})
    expect(rows[0].sidecarPath).toBeNull()
  })

  it('skips sourcedata/ and derivatives/', () => {
    touch('sub-04/anat/sub-04_T1w.nii.gz')
    touch('sourcedata/sub-04/anat/sub-04_T1w.nii.gz')
    touch('derivatives/foo/sub-04/anat/sub-04_T1w.nii.gz')
    const rows = readBidsTree(tmpDir)
    expect(rows).toHaveLength(1)
    expect(rows[0].bidsPath.startsWith('sub-04/')).toBe(true)
  })

  it('accepts both .nii and .nii.gz', () => {
    touch('sub-05/anat/sub-05_T1w.nii')
    touch('sub-05/anat/sub-05_T2w.nii.gz')
    const rows = readBidsTree(tmpDir)
    expect(rows.map((r) => r.filename).sort()).toEqual(['sub-05_T1w.nii', 'sub-05_T2w.nii.gz'])
  })

  it('returns empty sidecar object when sidecar JSON is malformed', () => {
    touch('sub-06/anat/sub-06_T1w.nii.gz')
    touch('sub-06/anat/sub-06_T1w.json', '{ not json')
    const rows = readBidsTree(tmpDir)
    expect(rows).toHaveLength(1)
    expect(rows[0].sidecar).toEqual({})
  })
})
