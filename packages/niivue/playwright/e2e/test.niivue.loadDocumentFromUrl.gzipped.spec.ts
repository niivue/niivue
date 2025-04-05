import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadDocumentFromUrl compound document gzipped', async ({ page }) => {
  test.setTimeout(90_000)
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/atlas.gzipped.nvd')
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 90000 })
})
