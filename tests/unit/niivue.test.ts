import { expect, test } from 'vitest'
import { Niivue } from '../../src/niivue/index.js' // note the js extension

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
