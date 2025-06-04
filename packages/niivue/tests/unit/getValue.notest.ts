// @vitest-environment node
import { expect, test } from 'vitest'
import { NVImage } from '../../src/niivue/index.js' // note the js extension
import { readFileSync } from 'node:fs'
import path from 'path'

test('nvimage getValue', async () => {
  const name = 'hippo.nii.gz'
  const dataBuffer = readFileSync(path.join('./tests/images/', name))
  const image = await NVImage.new(dataBuffer.buffer, name)
  const voxX = 31
  const voxY = 54
  const voxZ = 27
  const value = image.getValue(voxX, voxY, voxZ)
  // The expected value at this position should be 9
  expect(value).toBe(9)
})
