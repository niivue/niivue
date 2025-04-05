import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadDocumentFromUrl replaces previous document objects', async ({ page }) => {
  test.setTimeout(90_000)
  const { nvols, nmeshes } = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh-pre-0.52.0.nvd')
    return { nvols: nv.volumes.length, nmeshes: nv.meshes.length }
  }, TEST_OPTIONS)
  expect(nvols).toBe(0)
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
