import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue crosshairWidth can be set', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  const opts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    nv.setCrosshairWidth(3)
    await nv.attachTo('gl')
    return nv.opts
  }, TEST_OPTIONS)
  expect(opts.crosshairWidth).toEqual(3)
  expect(errors).toHaveLength(0)
})
