import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadDocumentFromUrl nifti volume drawing', async ({ page }) => {
  test.setTimeout(90_000)
  const isDrawingPresent = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.drawing.nvd')
    return nv.drawBitmap != null
  }, TEST_OPTIONS)
  expect(isDrawingPresent).toBe(true)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
