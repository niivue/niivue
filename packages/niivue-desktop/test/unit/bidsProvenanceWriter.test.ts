import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  provenanceFromDcm2niixSidecar,
  provenancePathFor,
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
