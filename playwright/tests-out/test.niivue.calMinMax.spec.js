'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue calMinMax do not trust header cal min max', async ({ page }) => {
  const minmax = await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1], // green
      trustCalMinMax: false
    }
    const nv = new index_1.Niivue(opts)
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
    const overlayItem = nv.volumes[0]
    const minmax = overlayItem.calMinMax()
    return minmax
  }, test_types_1.TEST_OPTIONS)
  const expected = [40, 80, 0, 91.46501398086548]
  for (let i = 0; i < minmax.length; i++) {
    ;(0, test_1.expect)(minmax[i]).toBeCloseTo(expected[i])
  }
})
;(0, test_1.test)('niivue calMinMax trust header cal min max', async ({ page }) => {
  const minmax = await page.evaluate(async (testOptions) => {
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
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    const overlayItem = nv.volumes[0]
    const minmax = overlayItem.calMinMax()
    return minmax
  }, test_types_1.TEST_OPTIONS)
  const expected = [40, 80, 40, 80]
  for (let i = 0; i < minmax.length; i++) {
    ;(0, test_1.expect)(minmax[i]).toBeCloseTo(expected[i])
  }
})
// # sourceMappingURL=test.niivue.calMinMax.spec.js.map
