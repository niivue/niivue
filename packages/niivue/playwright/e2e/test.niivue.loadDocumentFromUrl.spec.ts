import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test.skip('niivue loadDocumentFromUrl nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test.skip('niivue loadDocumentFromUrl nifti volume drawing', async ({ page }) => {
  const isDrawingPresent = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.drawing.nvd')
    return nv.drawBitmap != null
  }, TEST_OPTIONS)
  expect(isDrawingPresent).toBe(true)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl mesh', async ({ page }) => {
  const counts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return {
      meshCount: nv.meshes.length,
      layerCount: nv.meshes.length > 0 ? nv.meshes[0].layers.length : 0
    }
  }, TEST_OPTIONS)
  expect(counts.meshCount).toBe(1)
  expect(counts.layerCount).toBe(1)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl replaces previous document objects', async ({ page }) => {
  const { nvols, nmeshes } = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    // now load a document with no volumes
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return { nvols: nv.volumes.length, nmeshes: nv.meshes.length }
  }, TEST_OPTIONS)
  expect(nvols).toBe(0)
  expect(nmeshes).toBe(1)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadDocumentFromUrl compound document gzipped', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/atlas.gzipped.nvd')
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
