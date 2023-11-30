import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue calMinMax trust header cal min max', async ({ page }) => {
  const minmax = await page.evaluate(async () => {
    const opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new niivue.Niivue(opts)
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
    const overlayItem = nv.volumes[0]
    const minmax = overlayItem.calMinMax()
    return minmax
  })
  const expected = [40, 80, 40, 80]
  for (let i = 0; i < minmax.length; i++) {
    expect(minmax[i]).toBeCloseTo(expected[i])
  }
})
