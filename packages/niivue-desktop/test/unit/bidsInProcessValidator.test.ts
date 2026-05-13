import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { validateBidsDirectoryInProcess } from '../../src/main/utils/bidsInProcessValidator.js'

describe('validateBidsDirectoryInProcess', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bids-validator-test-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('reports issues on an empty dataset', async () => {
    const result = await validateBidsDirectoryInProcess(root, [])
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    // Empty dataset must surface a dataset_description.json complaint somewhere.
    const allMessages = [...result.errors, ...result.warnings].map((e) => e.message).join('|')
    expect(allMessages.toLowerCase()).toMatch(/dataset_description|empty|missing/i)
  }, 30_000)

  it('accepts a minimal valid skeleton', async () => {
    fs.writeFileSync(
      path.join(root, 'dataset_description.json'),
      JSON.stringify({
        Name: 'Smoke Test',
        BIDSVersion: '1.9.0',
        DatasetType: 'raw'
      })
    )
    // Need at least one subject for a "valid" BIDS dataset; we still
    // expect warnings about missing files but no fatal errors on the
    // dataset_description itself.
    fs.mkdirSync(path.join(root, 'sub-01', 'anat'), { recursive: true })
    fs.writeFileSync(
      path.join(root, 'sub-01', 'anat', 'sub-01_T1w.json'),
      JSON.stringify({ MagneticFieldStrength: 3 })
    )
    fs.writeFileSync(path.join(root, 'sub-01', 'anat', 'sub-01_T1w.nii.gz'), Buffer.alloc(0))
    const result = await validateBidsDirectoryInProcess(root, [])
    // The validator returns a result object regardless of dataset state.
    expect(Array.isArray(result.errors)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
    // dataset_description-specific errors should NOT appear now.
    const ddErr = result.errors.find((e) => /dataset_description/i.test(e.message))
    expect(ddErr).toBeUndefined()
  }, 30_000)
})
