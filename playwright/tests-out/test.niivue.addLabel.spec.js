'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
test_1.test.skip('niivue label addLabel', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
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
    // await nv.loadVolumes(volumeList)
    // nv.addLabel('Insula', { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.CENTER }, [0.0, 0.0, 0.0])
    // nv.addLabel(
    //   'ventral anterior insula',
    //   { lineWidth: 3.0, textColor: [1.0, 1.0, 0.0, 1.0], lineColor: [1.0, 1.0, 0.0, 1.0] },
    //   [
    //     [-33, 13, -7],
    //     [32, 10, -6]
    //   ]
    // )
    // nv.addLabel(
    //   'dorsal anterior insula',
    //   { textColor: [0.0, 1.0, 0.0, 1.0], lineWidth: 3.0, lineColor: [0.0, 1.0, 0.0, 1.0] },
    //   [
    //     [-38, 6, 2],
    //     [35, 7, 3]
    //   ]
    // )
    // nv.addLabel(
    //   'posterior insula',
    //   { textColor: [0.0, 0.0, 1.0, 1.0], lineWidth: 3.0, lineColor: [0.0, 0.0, 1.0, 1.0] },
    //   [
    //     [-38, -6, 5],
    //     [35, -11, 6]
    //   ]
    // )
    // nv.addLabel(
    //   'hippocampus',
    //   { textColor: [1, 0, 0, 1], lineWidth: 3.0, lineColor: [1, 0, 0, 1] },
    //   [-25, -15.0, -25.0]
    // )
    // nv.addLabel(
    //   'right justified footnote',
    //   {
    //     textScale: 0.5,
    //     textAlignment: niivue.LabelTextAlignment.RIGHT,
    //     bulletColor: [1.0, 0.0, 1.0, 1.0],
    //     bulletScale: 0.5
    //   },
    //   [0.0, 0.0, 0.0]
    // )
    nv.drawScene()
    return nv.document.labels.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nlabels).toBe(6)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.addLabel.spec.js.map
