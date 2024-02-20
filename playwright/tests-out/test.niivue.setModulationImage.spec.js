'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue setModulationImage', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../demos/images/V1.nii.gz',
        opacity: 1,
        visible: true
      },
      {
        url: '../demos/images/FA.nii.gz',
        colormap: 'gray',
        opacity: 1.0,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.setSliceType(nv.sliceTypeMultiplanar)
    nv.setOpacity(0, 1.0) // show V1
    nv.setOpacity(1, 0.0) // hide FA
    // modulate V1 by FA
    await nv.setModulationImage(nv.volumes[0].id, nv.volumes[1].id)
    await nv.updateGLVolume()
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.setModulationImage.spec.js.map
