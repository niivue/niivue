'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddressSync)
})
;(0, test_1.test)('niivue broadcastTo', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv1 = new index_1.Niivue(testOptions)
    await nv1.attachTo('gl1')
    nv1.attachTo('gl1')
    const nv2 = new index_1.Niivue(testOptions)
    await nv2.attachTo('gl2')
    const volumeList = [
      {
        url: './images/mni152.nii.gz',
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv1.loadVolumes(volumeList)
    await nv2.loadVolumes(volumeList)
    nv1.broadcastTo(nv2)
  }, test_types_1.TEST_OPTIONS)
  await page.mouse.click(100, 200)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000, fullPage: true })
})
// # sourceMappingURL=test.niivue.broadcastTo.spec.js.map
