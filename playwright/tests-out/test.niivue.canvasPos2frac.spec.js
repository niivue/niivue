'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue canvasPos2frac', async ({ page }) => {
  const frac = await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new index_1.Niivue(opts)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        intensityMin: 0, // not used yet
        intensityMax: 100, // not used yet
        intensityRange: [0, 100], // not used yet
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    const pos = [100, 200]
    const frac = nv.canvasPos2frac(pos)
    return frac
  }, test_types_1.TEST_OPTIONS)
  const expected = [0.4045893719806762, 0.5, 0.5]
  for (let i = 0; i < frac.length; i++) {
    ;(0, test_1.expect)(frac[i]).toBeCloseTo(expected[i])
  }
})
// # sourceMappingURL=test.niivue.canvasPos2frac.spec.js.map
