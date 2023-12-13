import { expect, test } from 'vitest'
import { Niivue } from './index.js' // note the js extension

test('NiiVue', () => {
  expect(Niivue).toBeDefined()
})

test('backColor defaults to black', () => {
  const nv = new Niivue()
  expect(nv.opts.backColor).toStrictEqual([0, 0, 0, 1])
})

test('crosshairColor', async () => {
  const nv = new Niivue()
  const green = [0, 1, 0, 1] // RGBA green
  await nv.setCrosshairColor(green)
  expect(nv.opts.crosshairColor).toStrictEqual(green)
})
