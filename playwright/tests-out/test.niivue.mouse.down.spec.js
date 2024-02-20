'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue mouse down updates onLocationChange', async ({ page }) => {
  const xy = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    let xy = []
    nv.onLocationChange = (msg) => {
      if (msg && typeof msg === 'object' && 'xy' in msg && Array.isArray(msg.xy)) {
        xy = msg.xy
      }
    }
    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 50)
    nv.mouseClick(50, 50)
    return xy
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(xy[0]).toEqual(50)
  ;(0, test_1.expect)(xy[1]).toEqual(50)
})
// # sourceMappingURL=test.niivue.mouse.down.spec.js.map
