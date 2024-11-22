import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue canvasPos2frac', async ({ page }) => {
  const frac = await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new Niivue(opts)
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
  }, TEST_OPTIONS)
  const expected = [0.4045893719806762, 0.5, 0.5]
  for (let i = 0; i < frac.length; i++) {
    expect(frac[i]).toBeCloseTo(expected[i])
  }
})
