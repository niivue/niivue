import { describe, it, expect } from 'vitest'
import {
  buildSidecarFieldRows,
  groupRowsByStatus,
  issuesForFile,
  partitionIssuesByFile,
  type BidsMetadataDef
} from '../../src/renderer/src/components/BidsWizard/bidsViewSidecarModel.js'
import type { BidsValidationIssue } from '../../src/common/bidsTypes.js'

const sampleDefs: Record<string, BidsMetadataDef> = {
  SpoilingType: {
    name: 'SpoilingType',
    display_name: 'Spoiling Type',
    description: 'Specifies which spoiling method(s) are used by a spoiled sequence.',
    type: 'string',
    enum: ['RF', 'GRADIENT', 'COMBINED']
  },
  PulseSequenceType: {
    name: 'PulseSequenceType',
    display_name: 'Pulse Sequence Type',
    description: 'A general description of the pulse sequence used for the scan.',
    type: 'string'
  },
  PartialFourierDirection: {
    name: 'PartialFourierDirection',
    display_name: 'Partial Fourier Direction',
    description: 'The direction where only partial Fourier information was collected.',
    type: 'string'
  },
  RepetitionTime: {
    name: 'RepetitionTime',
    display_name: 'Repetition Time',
    description: 'Time in seconds between volume acquisitions.',
    type: 'number',
    unit: 's'
  }
}

function mkIssue(over: Partial<BidsValidationIssue>): BidsValidationIssue {
  return {
    severity: 'warning',
    message: 'something',
    ...over
  }
}

describe('buildSidecarFieldRows', () => {
  it('surfaces a recommended enum field missing from the sidecar', () => {
    const sidecar = { RepetitionTime: 2.0 }
    const issues: BidsValidationIssue[] = [
      mkIssue({
        severity: 'warning',
        code: 'SIDECAR_KEY_RECOMMENDED',
        subCode: 'SpoilingType',
        rule: 'rules.sidecars.mri.SpoilingType',
        message: 'Field description: Specifies which spoiling method(s) are used.'
      })
    ]
    const rows = buildSidecarFieldRows(sidecar, issues, sampleDefs)
    const spoiling = rows.find((r) => r.field === 'SpoilingType')
    expect(spoiling).toBeDefined()
    expect(spoiling!.status).toBe('recommended')
    expect(spoiling!.hasValue).toBe(false)
    expect(spoiling!.def?.enum).toEqual(['RF', 'GRADIENT', 'COMBINED'])
    expect(spoiling!.unknownToSchema).toBe(false)
  })

  it('keeps fields already present at status "present" when no validator issue fires', () => {
    const sidecar = { RepetitionTime: 2.5 }
    const rows = buildSidecarFieldRows(sidecar, [], sampleDefs)
    const tr = rows.find((r) => r.field === 'RepetitionTime')
    expect(tr).toBeDefined()
    expect(tr!.status).toBe('present')
    expect(tr!.hasValue).toBe(true)
    expect(tr!.value).toBe(2.5)
  })

  it('flags unknown sidecar keys with unknownToSchema=true and status "present"', () => {
    const sidecar = { CustomVendorThing: 'foo' }
    const rows = buildSidecarFieldRows(sidecar, [], sampleDefs)
    const row = rows.find((r) => r.field === 'CustomVendorThing')
    expect(row).toBeDefined()
    expect(row!.unknownToSchema).toBe(true)
    expect(row!.status).toBe('present')
  })

  it('escalates status when both recommended and required issues touch the same field', () => {
    const sidecar = {}
    const issues: BidsValidationIssue[] = [
      mkIssue({
        severity: 'warning',
        code: 'SIDECAR_KEY_RECOMMENDED',
        subCode: 'RepetitionTime'
      }),
      mkIssue({
        severity: 'error',
        code: 'SIDECAR_KEY_REQUIRED',
        subCode: 'RepetitionTime'
      })
    ]
    const rows = buildSidecarFieldRows(sidecar, issues, sampleDefs)
    const row = rows.find((r) => r.field === 'RepetitionTime')
    expect(row!.status).toBe('required')
  })

  it('marks schema-invalid values', () => {
    const sidecar = { RepetitionTime: -1 }
    const issues: BidsValidationIssue[] = [
      mkIssue({
        severity: 'error',
        code: 'JSON_SCHEMA_VALIDATION_ERROR',
        subCode: 'RepetitionTime',
        message: 'must be > 0'
      })
    ]
    const rows = buildSidecarFieldRows(sidecar, issues, sampleDefs)
    const row = rows.find((r) => r.field === 'RepetitionTime')
    expect(row!.status).toBe('invalid')
    expect(row!.value).toBe(-1)
  })

  it('orders rows so required > invalid > recommended > present > optional', () => {
    const sidecar = { PulseSequenceType: 'MPRAGE' }
    const issues: BidsValidationIssue[] = [
      mkIssue({
        code: 'SIDECAR_KEY_RECOMMENDED',
        subCode: 'PartialFourierDirection',
        severity: 'warning'
      }),
      mkIssue({
        code: 'SIDECAR_KEY_REQUIRED',
        subCode: 'RepetitionTime',
        severity: 'error'
      })
    ]
    const rows = buildSidecarFieldRows(sidecar, issues, sampleDefs)
    const fields = rows.map((r) => r.field)
    expect(fields[0]).toBe('RepetitionTime') // required
    expect(fields[1]).toBe('PartialFourierDirection') // recommended
    expect(fields[2]).toBe('PulseSequenceType') // present
  })
})

describe('groupRowsByStatus', () => {
  it('drops empty sections and keeps priority order', () => {
    const sidecar = { PulseSequenceType: 'MPRAGE' }
    const issues: BidsValidationIssue[] = [
      mkIssue({
        code: 'SIDECAR_KEY_RECOMMENDED',
        subCode: 'SpoilingType',
        severity: 'warning'
      })
    ]
    const rows = buildSidecarFieldRows(sidecar, issues, sampleDefs)
    const sections = groupRowsByStatus(rows)
    expect(sections.map((s) => s.label)).toEqual(['Recommended', 'Present'])
  })
})

describe('partitionIssuesByFile / issuesForFile', () => {
  it('groups issues by file path', () => {
    const issues: BidsValidationIssue[] = [
      mkIssue({ file: '/sub-01/anat/sub-01_T1w.nii.gz', code: 'A' }),
      mkIssue({ file: '/sub-01/anat/sub-01_T1w.nii.gz', code: 'B' }),
      mkIssue({ file: '/sub-02/anat/sub-02_T1w.nii.gz', code: 'C' })
    ]
    const buckets = partitionIssuesByFile(issues)
    expect(buckets.get('/sub-01/anat/sub-01_T1w.nii.gz')).toHaveLength(2)
    expect(buckets.get('/sub-02/anat/sub-02_T1w.nii.gz')).toHaveLength(1)
  })

  it('matches issues to either the nifti or its sidecar', () => {
    const issues: BidsValidationIssue[] = [
      mkIssue({ file: '/sub-01/anat/sub-01_T1w.nii.gz', code: 'A' }),
      mkIssue({ file: '/sub-01/anat/sub-01_T1w.json', code: 'B' }),
      mkIssue({ file: '/sub-02/anat/sub-02_T1w.nii.gz', code: 'C' })
    ]
    const matched = issuesForFile(
      issues,
      '/sub-01/anat/sub-01_T1w.nii.gz',
      '/sub-01/anat/sub-01_T1w.json'
    )
    expect(matched.map((i) => i.code)).toEqual(['A', 'B'])
  })

  it('normalises bare relative paths to dataset-rooted form', () => {
    const issues: BidsValidationIssue[] = [
      mkIssue({ file: 'sub-01/anat/sub-01_T1w.nii.gz', code: 'A' })
    ]
    const matched = issuesForFile(issues, '/sub-01/anat/sub-01_T1w.nii.gz')
    expect(matched).toHaveLength(1)
  })
})
