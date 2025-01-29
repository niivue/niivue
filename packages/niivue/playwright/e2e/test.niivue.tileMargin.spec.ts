import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue tileMargin -1', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue({
      tileMargin: -1,
      ...testOptions
    })
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
    nv.setOpacity(0, 0.2) // 0 is background image (first in list)
  }, TEST_OPTIONS)

  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue tileMargin 20', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue({
      tileMargin: 20,
      ...testOptions
    })
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
    nv.setOpacity(0, 0.2) // 0 is background image (first in list)
  }, TEST_OPTIONS)

  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
