import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  applyUserEditsToProvenanceFile,
  provenanceFromDcm2niixSidecar,
  provenancePathFor,
  provenancePathForSidecar,
  readProvenanceFile,
  setProvenanceField,
  writeProvenanceFile
} from '../../src/main/utils/bidsProvenanceWriter.js'
import type { BidsProvenance } from '../../src/common/bidsTypes.js'

describe('bidsProvenanceWriter', () => {
  describe('provenancePathFor', () => {
    it('strips the full .nii.gz extension before appending .prov.json', () => {
      expect(provenancePathFor('sub-01/anat/sub-01_T1w.nii.gz')).toBe(
        'sub-01/anat/sub-01_T1w.prov.json'
      )
    })

    it('handles uncompressed .nii too', () => {
      expect(provenancePathFor('sub-01/anat/sub-01_T1w.nii')).toBe(
        'sub-01/anat/sub-01_T1w.prov.json'
      )
    })
  })

  describe('provenanceFromDcm2niixSidecar', () => {
    it('attributes every sidecar key to the DICOM source via dcm2niix', () => {
      const sidecar = {
        EchoTime: 0.0029,
        RepetitionTime: 2.4,
        Manufacturer: 'Siemens'
      }
      const prov = provenanceFromDcm2niixSidecar('sub-01/anat/sub-01_T1w.nii.gz', sidecar)
      expect(prov.schemaVersion).toBe('1')
      expect(prov.outputFile).toBe('sub-01/anat/sub-01_T1w.nii.gz')
      for (const key of Object.keys(sidecar)) {
        expect(prov.fields[key]).toBeDefined()
        expect(prov.fields[key].source.kind).toBe('dicom')
        expect(prov.fields[key].source.via).toBe('dcm2niix')
      }
      expect(prov.fields.EchoTime.value).toBe(0.0029)
    })
  })

  describe('setProvenanceField', () => {
    it('overrides a single field with a different source kind', () => {
      const prov = provenanceFromDcm2niixSidecar('sub-01/anat/sub-01_T1w.nii.gz', {
        Manufacturer: 'Siemens'
      })
      setProvenanceField(prov, 'SkullStripped', true, {
        kind: 'step',
        stepName: 'skull_strip',
        executor: 'niimath:skull-strip'
      })
      // Pre-existing field retains its DICOM attribution
      expect(prov.fields.Manufacturer.source.kind).toBe('dicom')
      // New field carries the step attribution
      expect(prov.fields.SkullStripped.value).toBe(true)
      expect(prov.fields.SkullStripped.source.kind).toBe('step')
      expect(prov.fields.SkullStripped.source.stepName).toBe('skull_strip')
    })
  })

  describe('applyUserEditsToProvenanceFile', () => {
    it('creates a fresh .prov.json marking edits as user-authored', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-prov-'))
      try {
        const niftiPath = path.join(tmpDir, 'sub-01_T1w.nii.gz')
        const sidecarPath = path.join(tmpDir, 'sub-01_T1w.json')
        // .prov.json is anchored on the NIfTI, so we need one on disk
        fs.writeFileSync(niftiPath, '')
        fs.writeFileSync(sidecarPath, '{}')

        const result = applyUserEditsToProvenanceFile(sidecarPath, {
          EchoTime: 0.005,
          Manufacturer: 'Siemens'
        })
        expect(result).not.toBeNull()
        const prov = readProvenanceFile(provenancePathForSidecar(sidecarPath))
        expect(prov).not.toBeNull()
        expect(prov!.outputFile).toBe('sub-01_T1w.nii.gz')
        expect(prov!.fields.EchoTime.value).toBe(0.005)
        expect(prov!.fields.EchoTime.source.kind).toBe('user')
        expect(prov!.fields.EchoTime.source.actor).toBe('bids-editor')
        expect(prov!.fields.Manufacturer.source.kind).toBe('user')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('updates an existing .prov.json and overwrites dicom attribution on edit', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-prov-'))
      try {
        const niftiPath = path.join(tmpDir, 'sub-01_T1w.nii.gz')
        const sidecarPath = path.join(tmpDir, 'sub-01_T1w.json')
        fs.writeFileSync(niftiPath, '')
        fs.writeFileSync(sidecarPath, '{}')

        // Seed an existing dcm2niix-attributed prov file
        const seed = provenanceFromDcm2niixSidecar('sub-01_T1w.nii.gz', {
          EchoTime: 0.0029,
          Manufacturer: 'Siemens'
        })
        writeProvenanceFile(provenancePathForSidecar(sidecarPath), seed)

        applyUserEditsToProvenanceFile(sidecarPath, { EchoTime: 0.005 })
        const prov = readProvenanceFile(provenancePathForSidecar(sidecarPath))!
        // Edited field flips to user attribution
        expect(prov.fields.EchoTime.value).toBe(0.005)
        expect(prov.fields.EchoTime.source.kind).toBe('user')
        // Untouched field keeps dicom attribution
        expect(prov.fields.Manufacturer.source.kind).toBe('dicom')
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('removes provenance entries when the edit is a delete sentinel', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-prov-'))
      try {
        const niftiPath = path.join(tmpDir, 'sub-01_T1w.nii.gz')
        const sidecarPath = path.join(tmpDir, 'sub-01_T1w.json')
        fs.writeFileSync(niftiPath, '')
        fs.writeFileSync(sidecarPath, '{}')

        const seed = provenanceFromDcm2niixSidecar('sub-01_T1w.nii.gz', {
          EchoTime: 0.0029,
          TaskName: 'rest'
        })
        writeProvenanceFile(provenancePathForSidecar(sidecarPath), seed)

        // Mirror updateSidecar's delete semantics: undefined / null /
        // empty string / empty array all delete.
        applyUserEditsToProvenanceFile(sidecarPath, {
          EchoTime: null,
          TaskName: ''
        })
        const prov = readProvenanceFile(provenancePathForSidecar(sidecarPath))!
        expect(prov.fields.EchoTime).toBeUndefined()
        expect(prov.fields.TaskName).toBeUndefined()
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    it('returns null when no NIfTI is present (dataset-level sidecars)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-prov-'))
      try {
        const sidecarPath = path.join(tmpDir, 'participants.json')
        fs.writeFileSync(sidecarPath, '{}')
        const result = applyUserEditsToProvenanceFile(sidecarPath, { foo: 'bar' })
        expect(result).toBeNull()
        // No prov file gets created either
        expect(fs.existsSync(provenancePathForSidecar(sidecarPath))).toBe(false)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })

  describe('writeProvenanceFile', () => {
    it('round-trips through disk as valid JSON', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-prov-'))
      try {
        const prov: BidsProvenance = provenanceFromDcm2niixSidecar(
          'sub-01/anat/sub-01_T1w.nii.gz',
          { EchoTime: 0.003 }
        )
        const dest = path.join(tmpDir, 'sub-01_T1w.prov.json')
        writeProvenanceFile(dest, prov)
        const parsed = JSON.parse(fs.readFileSync(dest, 'utf-8')) as BidsProvenance
        expect(parsed).toEqual(prov)
        // Trailing newline for diffability
        expect(fs.readFileSync(dest, 'utf-8').endsWith('\n')).toBe(true)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    })
  })
})
