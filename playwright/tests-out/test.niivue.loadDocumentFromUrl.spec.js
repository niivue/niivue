'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
test_1.test.skip('niivue loadDocumentFromUrl nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadDocumentFromUrl nifti volume drawing', async ({ page }) => {
  const isDrawingPresent = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.drawing.nvd')
    return nv.drawBitmap != null
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(isDrawingPresent).toBe(true)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadDocumentFromUrl mesh', async ({ page }) => {
  const counts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return {
      meshCount: nv.meshes.length,
      layerCount: nv.meshes.length > 0 ? nv.meshes[0].layers.length : 0
    }
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(counts.meshCount).toBe(1)
  ;(0, test_1.expect)(counts.layerCount).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadDocumentFromUrl replaces previous document objects', async ({ page }) => {
  const { nvols, nmeshes } = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocumentFromUrl('./images/document/niivue.basic.nvd')
    // now load a document with no volumes
    await nv.loadDocumentFromUrl('./images/document/niivue.mesh.nvd')
    return { nvols: nv.volumes.length, nmeshes: nv.meshes.length }
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(0)
  ;(0, test_1.expect)(nmeshes).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.loadDocumentFromUrl.spec.js.map
