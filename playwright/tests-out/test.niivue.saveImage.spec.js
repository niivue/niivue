'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const fs = require('fs')
const path = require('path')
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
function getFilesizeInBytes(filename) {
  const stats = fs.statSync(filename)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue saveImage', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
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
    await nv.saveImage({ filename: 'test.nii', isSaveDrawing: false, volumeByIndex: 0 })
  }, test_types_1.TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const fileSize = getFilesizeInBytes(filePath)
  ;(0, test_1.expect)(fileSize).toBeGreaterThan(4336029)
  fs.unlinkSync(filePath)
})
// # sourceMappingURL=test.niivue.saveImage.spec.js.map
