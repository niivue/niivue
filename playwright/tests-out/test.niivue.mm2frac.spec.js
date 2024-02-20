'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue mm2frac', async ({ page }) => {
  const frac = await page.evaluate(async (testOptions) => {
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
    const mm = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
    const frac = nv.mm2frac(mm)
    return frac
  }, test_types_1.TEST_OPTIONS)
  const expected = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
  for (let i = 0; i < frac.length; i++) {
    ;(0, test_1.expect)(frac[i]).toBeCloseTo(expected[i])
  }
})
// # sourceMappingURL=test.niivue.mm2frac.spec.js.map
