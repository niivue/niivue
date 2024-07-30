import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue setCrosshairColor', async ({ page }) => {
  const crosshairColor = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
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
    nv.setCrosshairColor([0, 1, 0, 1]) // green (rgba)
    return nv.opts.crosshairColor
  }, TEST_OPTIONS)

  expect(crosshairColor).toEqual([0, 1, 0, 1])
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
