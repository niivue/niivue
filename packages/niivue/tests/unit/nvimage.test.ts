// @vitest-environment node
import { expect, test } from 'vitest'
import { NVImage } from '../../src/niivue/index.js' // note the js extension
import { readFileSync } from 'node:fs'
import path from 'path'
import { vec3 } from 'gl-matrix'

test('nvimage convertVox2Frac', async () => {
  const name = 'mni152.nii.gz'
  const dataBuffer = readFileSync(path.join('./tests/images/', name))
  const image = await NVImage.new(dataBuffer.buffer, name)
  const vox = vec3.fromValues(103, 128, 129)
  const frac = image.convertVox2Frac(vox)
  const expected = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
  for (let i = 0; i < frac.length; i++) {
    expect(frac[i]).toBeCloseTo(expected[i])
  }
})

test('nvimage zerosLike', async () => {
  const name = 'mni152.nii.gz'
  const dataBuffer = readFileSync(path.join('./tests/images/', name))
  const image = await NVImage.new(dataBuffer.buffer, name)
  const zeroImage = NVImage.zerosLike(image)
  expect(JSON.stringify(image.hdr)).toBe(JSON.stringify(zeroImage.hdr))
  expect(zeroImage.img!.every((item: number) => item === 0)).toBeTruthy()
})

test('nvimage clone has unique ID', async () => {
  const name = 'mni152.nii.gz'
  const dataBuffer = readFileSync(path.join('./tests/images/', name))
  const image = await NVImage.new(dataBuffer.buffer, name)
  const clone = image.clone()
  expect(clone.id).not.toBe(image.id)
})
