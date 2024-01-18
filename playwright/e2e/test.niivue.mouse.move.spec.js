import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mouse move updates renderAzimuth and renderElevation', async ({ page }) => {
  const scene = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    nv.setSliceType(nv.sliceTypeRender)
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
    // set defaults
    nv.mousePos = [0, 0]
    nv.setRenderAzimuthElevation(110, 10) // set to default
    nv.mouseMove(50, 50)
    return nv.scene
  })

  expect(scene.renderAzimuth).toEqual(160)
  expect(scene.renderElevation).toEqual(60)
  // take a snapshot for comparison
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
