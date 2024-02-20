'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
// The header is the first 352 bytes, and the image data is dim1 * dim2 * dim3 * nbyper.
// So for the test case with the mni152 image we have 352 + (207 * 256 * 215 * 1).
const expectedImgLength = 11393632
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('save image no download trigger', async ({ page }) => {
  const imgLength = await page.evaluate(async (testOptions) => {
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
    const img = nv.saveImage()
    return img.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(imgLength).toBe(expectedImgLength)
})
;(0, test_1.test)('save image no download trigger partial options', async ({ page }) => {
  const imgLength = await page.evaluate(async (testOptions) => {
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
    const img = nv.saveImage()
    return img.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(imgLength).toBe(expectedImgLength)
})
// # sourceMappingURL=test.niivue.saveImageNoDownload.spec.js.map
