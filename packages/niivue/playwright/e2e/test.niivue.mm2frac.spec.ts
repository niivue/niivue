import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mm2frac', async ({ page }) => {
  const frac = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
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
    const mm: [number, number, number] = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
    const frac = nv.mm2frac(mm)
    return frac
  }, TEST_OPTIONS)
  const expected = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
  for (let i = 0; i < frac.length; i++) {
    expect(frac[i]).toBeCloseTo(expected[i])
  }
})
