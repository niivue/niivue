'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue load thumbnail preview', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // extend testOptions with a thumbnail option
    const nv = new index_1.Niivue({ ...testOptions, thumbnail: '../../demos/images/pcasl.png' })
    // const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../../demos/images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        colormap: 'gray',
        opacity: 1
      }
    ]
    await nv.loadVolumes(volumeList)
  }, test_types_1.TEST_OPTIONS)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue thumbnail aspect ratio correct after window resize', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // extend testOptions with a thumbnail option
    const nv = new index_1.Niivue({ ...testOptions, thumbnail: '../../demos/images/pcasl.png' })
    // const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../../demos/images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        colormap: 'gray',
        opacity: 1
      }
    ]
    await nv.loadVolumes(volumeList)
  }, test_types_1.TEST_OPTIONS)
  // from: https://stackoverflow.com/a/77550054
  // Get the current viewport size
  const viewport = page.viewportSize()
  if (viewport) {
    const newWidth = Math.round(viewport.width * 0.8) // 80% of the current width
    const newHeight = viewport.height
    // Set the new viewport size
    await page.setViewportSize({ width: newWidth, height: newHeight })
  }
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.thumbnail.spec.js.map
