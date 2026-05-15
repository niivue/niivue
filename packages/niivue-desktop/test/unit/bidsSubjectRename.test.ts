import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renameSubject } from '../../src/main/utils/bidsSubjectRename.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bids-rename-'))
})

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* */
  }
})

function touch(rel: string, content = ''): void {
  const full = path.join(tmpDir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

describe('renameSubject', () => {
  it('rejects non-alphanumeric labels', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    const r = renameSubject(tmpDir, '01', 'foo_bar')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/alphanumeric/i)
  })

  it('no-ops when old === new', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    const r = renameSubject(tmpDir, '01', '01')
    expect(r.success).toBe(true)
    expect(r.renamedFiles).toBe(0)
  })

  it('errors when source subject does not exist', () => {
    const r = renameSubject(tmpDir, 'missing', 'newname')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/not found/i)
  })

  it('refuses to overwrite an existing destination', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    touch('sub-02/anat/sub-02_T1w.nii.gz')
    const r = renameSubject(tmpDir, '01', '02')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/already exists/i)
    // Source must not have moved
    expect(fs.existsSync(path.join(tmpDir, 'sub-01'))).toBe(true)
  })

  it('renames the directory and every file inside', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz', 'nifti')
    touch('sub-01/anat/sub-01_T1w.json', '{}')
    touch('sub-01/func/sub-01_task-rest_bold.nii.gz', 'nifti')
    touch('sub-01/func/sub-01_task-rest_bold.json', '{}')

    const r = renameSubject(tmpDir, '01', 'abc')
    expect(r.success).toBe(true)
    expect(r.renamedFiles).toBe(4)

    expect(fs.existsSync(path.join(tmpDir, 'sub-01'))).toBe(false)
    expect(fs.existsSync(path.join(tmpDir, 'sub-abc/anat/sub-abc_T1w.nii.gz'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'sub-abc/anat/sub-abc_T1w.json'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'sub-abc/func/sub-abc_task-rest_bold.nii.gz'))).toBe(true)
  })

  it('renames inside session subdirs', () => {
    touch('sub-01/ses-pre/anat/sub-01_ses-pre_T1w.nii.gz', 'nifti')
    touch('sub-01/ses-pre/anat/sub-01_ses-pre_T1w.json', '{}')
    const r = renameSubject(tmpDir, '01', 'xyz')
    expect(r.success).toBe(true)
    expect(
      fs.existsSync(path.join(tmpDir, 'sub-xyz/ses-pre/anat/sub-xyz_ses-pre_T1w.nii.gz'))
    ).toBe(true)
  })

  it('does NOT touch files belonging to other subjects with shared prefix', () => {
    // sub-01 vs sub-011 — must not match by partial prefix
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    touch('sub-011/anat/sub-011_T1w.nii.gz')
    const r = renameSubject(tmpDir, '01', 'zzz')
    expect(r.success).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'sub-zzz/anat/sub-zzz_T1w.nii.gz'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'sub-011/anat/sub-011_T1w.nii.gz'))).toBe(true)
  })

  it('updates participants.tsv participant_id column', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    touch('participants.tsv', 'participant_id\tage\nsub-01\t30\nsub-02\t40\n')
    const r = renameSubject(tmpDir, '01', 'newid')
    expect(r.success).toBe(true)
    expect(r.participantsUpdated).toBe(true)
    const updated = fs.readFileSync(path.join(tmpDir, 'participants.tsv'), 'utf-8')
    expect(updated).toContain('sub-newid\t30')
    expect(updated).toContain('sub-02\t40')
  })

  it('leaves participants.tsv alone when subject is not present in it', () => {
    touch('sub-01/anat/sub-01_T1w.nii.gz')
    touch('participants.tsv', 'participant_id\tage\nsub-02\t40\n')
    const r = renameSubject(tmpDir, '01', 'newid')
    expect(r.success).toBe(true)
    expect(r.participantsUpdated).toBe(false)
  })
})
