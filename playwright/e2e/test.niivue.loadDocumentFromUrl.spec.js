import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadDocumentFromUrl nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    return nv.volumes.length
  })
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl nifti volume drawing', async ({ page }) => {
  const isDrawingPresent = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    await nv.loadDocumentFromUrl('./images/document/niivue.drawing.nvd')
    return nv.drawBitmap != null
  })
  expect(isDrawingPresent).toBe(true)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl mesh', async ({ page }) => {
  const counts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return {
      meshCount: nv.meshes.length,
      layerCount: nv.meshes.length > 0 ? nv.meshes[0].layers.length : 0
    }
  })
  expect(counts.meshCount).toBe(1)
  expect(counts.layerCount).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl replaces previous document objects', async ({ page }) => {
  const { nvols, nmeshes } = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    // now load a document with no volumes
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return { nvols: nv.volumes.length, nmeshes: nv.meshes.length }
  })
  expect(nvols).toBe(0)
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
