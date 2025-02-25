import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { vox2nii } from '../src/lib/loader.js'
import * as nifti from 'nifti-reader-js'

describe('MagicaVoxel Conversion Tests', () => {
  it('should convert MagicaVoxel Vox to a NIfTI and test properties', async () => {
    const voxFilePath = join(__dirname, 'testData', 'monu1.vox')
    const fileBuffer = await fs.readFile(voxFilePath)
    const niidata = await vox2nii(fileBuffer)
    const hdr = nifti.readHeader(niidata.buffer)
    expect(hdr.dims[1]).toEqual(126)
    expect(hdr.dims[2]).toEqual(126)
    expect(hdr.dims[3]).toEqual(118)
    expect(hdr.datatypeCode).toEqual(2304)
    const niftiImageData = nifti.readImage(hdr, niidata)
  })
})
