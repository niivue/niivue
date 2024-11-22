import { test, expect } from '@playwright/test'
import { vec3 } from 'gl-matrix'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS, NiivueTestOptions } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue frac2mm', async ({ page }) => {
  const mm = await page.evaluate(
    async (testOptions) => {
      const opts = {
        ...(testOptions as NiivueTestOptions),
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      // eslint-disable-next-line no-undef
      const nv = new Niivue(opts)
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
    { ...TEST_OPTIONS, frac: vec3.fromValues(0.5000415009576917, 0.5017796754837036, 0.6023715706758721) }
  )
  const expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
  for (let i = 0; i < mm.length; i++) {
    expect(mm[i]).toBeCloseTo(expected[i])
  }
})
