'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue event onLocationChange 4D', async ({ page }) => {
  const frameVoxVal = await page.evaluate(async (testOptions) => {
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        frame4D: 2
      }
    ]
    await nv.loadVolumes(volumeList)
    let val
    nv.onLocationChange = (msg) => {
      if (msg && typeof msg === 'object' && 'values' in msg && msg.values && typeof msg.values === 'object') {
        val = msg.values[0].value
      }
    }
    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 200)
    nv.mouseClick(50, 200)
    return val
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(frameVoxVal).toEqual(1058)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.event.spec.js.map
