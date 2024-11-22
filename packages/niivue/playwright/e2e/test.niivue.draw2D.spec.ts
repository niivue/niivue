import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue draw 2D set cull front face', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
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
    // set to 3d view
    nv.setSliceType(nv.sliceTypeRender)
    // then back to 2d view before snapshot to test cullface FRONT is still set
    nv.setSliceType(nv.sliceTypeMultiplanar)
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
