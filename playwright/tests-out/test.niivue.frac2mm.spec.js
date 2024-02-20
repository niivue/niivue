'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const gl_matrix_1 = require('gl-matrix')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue frac2mm', async ({ page }) => {
  const mm = await page.evaluate(
    async (testOptions) => {
      const opts = {
        ...testOptions,
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      // eslint-disable-next-line no-undef
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
      const mm = nv.frac2mm(testOptions.frac)
      return mm
    },
    {
      ...test_types_1.TEST_OPTIONS,
      frac: gl_matrix_1.vec3.fromValues(0.5000415009576917, 0.5017796754837036, 0.6023715706758721)
    }
  )
  const expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
  for (let i = 0; i < mm.length; i++) {
    ;(0, test_1.expect)(mm[i]).toBeCloseTo(expected[i])
  }
})
// # sourceMappingURL=test.niivue.frac2mm.spec.js.map
