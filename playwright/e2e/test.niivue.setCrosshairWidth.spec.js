import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue crosshairWidth can be set', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error))
  const opts = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue()
    nv.setCrosshairWidth(3)
    await nv.attachTo('gl', false)
    return nv.opts
  })
  expect(opts.crosshairWidth).toEqual(3)
  expect(errors).toHaveLength(0)
})
