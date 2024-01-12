import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue draw 3D no crosshair', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new niivue.Niivue(testOptions)
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
    nv.setSliceType(nv.sliceTypeRender)
    return nv.volumes.length
  })
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
