'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const fs = require('fs')
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
// get a list of cmap json file names. dont include files that start with "_"
let files = fs.readdirSync('./src/cmaps').filter((file) => {
  return file.endsWith('.json') && !file.startsWith('_')
})
// now just get the file name without the .json extension
files = files.map((file) => {
  return file.replace('.json', '')
})
for (const file of files) {
  ;(0, test_1.test)(`niivue colormap ${file}`, async ({ page }) => {
    await page.evaluate(
      async (testFileOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new index_1.Niivue(testFileOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const volumeList = [
          {
            url: `./images/mni152.nii.gz`,
            colormap: `${testFileOptions.file}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(volumeList)
      },
      { ...test_types_1.TEST_OPTIONS, file }
    )
    await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
for (const file of files) {
  ;(0, test_1.test)(`niivue colormap ${file} inverted`, async ({ page }) => {
    await page.evaluate(
      async (testFileOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new index_1.Niivue(testFileOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const volumeList = [
          {
            url: `./images/mni152.nii.gz`,
            colormap: `${testFileOptions.file}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(volumeList)
        nv.volumes[0].colormapInvert = true
        nv.updateGLVolume()
      },
      { ...test_types_1.TEST_OPTIONS, file }
    )
    await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
// # sourceMappingURL=test.niivue.colormap.spec.js.map
