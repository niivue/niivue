import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadDocumentFromUrl mesh', async ({ page }) => {
  test.setTimeout(90_000)
  const counts = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh-pre-0.52.0.nvd')
    return {
      meshCount: nv.meshes.length,
      layerCount: nv.meshes.length > 0 ? nv.meshes[0].layers.length : 0
    }
  }, TEST_OPTIONS)
  expect(counts.meshCount).toBe(1)
  expect(counts.layerCount).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
