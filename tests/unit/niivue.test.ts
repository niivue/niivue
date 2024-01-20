import { expect, test } from 'vitest'
import { Niivue, SLICE_TYPE } from '../../src/niivue/index.js' // note the js extension

test('backColor defaults to black', () => {
  const nv = new Niivue()
  expect(nv.opts.backColor).toStrictEqual([0, 0, 0, 1])
})

test('crosshairColor can be set', async () => {
  const nv = new Niivue()
  const green = [0, 1, 0, 1] // RGBA green
  await nv.setCrosshairColor(green)
  expect(nv.opts.crosshairColor).toStrictEqual(green)
})

test('options are copied and not referenced', () => {
  const nv1 = new Niivue()
  const nv2 = new Niivue()
  nv1.setSliceType(SLICE_TYPE.SAGITTAL)
  nv2.setSliceType(SLICE_TYPE.AXIAL)
  expect(nv1.opts.sliceType).toBe(2) // SLICE_TYPE.SAGITTAL  
})