import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue set RadiologicalConvention', async ({ page }) => {
  const isRad = await page.evaluate(async (testOptions) => {
    const nv = new Niivue({ ...testOptions, isRadiologicalConvention: true })
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz',
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.getRadiologicalConvention()
  }, TEST_OPTIONS)

  expect(isRad).toBeTruthy()
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
