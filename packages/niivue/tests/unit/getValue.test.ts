// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'path'
import { expect, test } from 'vitest'
import { readHeaderAsync } from 'nifti-reader-js'
import { NVImage } from '../../src/niivue/index.js' // note the js extension

test('nvimage getValue', async () => {
  const name = 'hippo.nii.gz'
  const dataBuffer = readFileSync(path.join('./tests/images/', name))
  if (!dataBuffer.length) {
    throw new Error('buffer not loaded')
  }
  expect(dataBuffer.length).toBeGreaterThan(0)
  const u8 = new Uint8Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength)
  expect(u8[0]).toBe(0x1f) // first magic byte for gzip
  expect(u8[1]).toBe(0x8b) // second magic byte for gzip
  // 3) OPTIONAL debug: first 4 bytes should be gzip magic 0x1f8b0800
  // console.log('First 4 bytes of hippo.nii.gz (hex):', dataBuffer.subarray(0, 4).toString('hex'))
  // 5) Parse header with nifti-reader-js
  const header = await readHeaderAsync(u8.buffer)
  expect(header).not.toBeNull()

  // 7) Pass ArrayBuffer into NVImage
  const arrayBuf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
  const nvImage = await NVImage.new(arrayBuf, name)
  expect(nvImage).toBeDefined()

  // 8) Test getValue at a known voxel
  // console.log('data', dataBuffer)
  // const image = await NVImage.new(dataBuffer.buffer, name)
  // // console.log('image', image)
  const voxX = 31
  const voxY = 54
  const voxZ = 27
  const value = nvImage.getValue(voxX, voxY, voxZ)
  // // The expected value at this position should be 9
  expect(value).toBe(9)
})
