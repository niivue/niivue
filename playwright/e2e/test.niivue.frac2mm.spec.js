import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue frac2mm', async ({ page }) => {
  const mm = await page.evaluate(async () => {
    const opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    // eslint-disable-next-line no-undef
    const nv = new Niivue(opts)
    await nv.attachTo('gl', false)

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
    const frac = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
    const mm = nv.frac2mm(frac)
    return mm
  })
  const expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
  for (let i = 0; i < mm.length; i++) {
    expect(mm[i]).toBeCloseTo(expected[i])
  }
})
