import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue options enforced', async ({ page }) => {
  const opts = await page.evaluate(async (testOptions) => {
    const nv = new Niivue({
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // blue
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
    return nv.opts
  }, TEST_OPTIONS)

  expect(opts.textHeight).toEqual(0.05)
  expect(opts.crosshairColor).toEqual([0, 0, 1, 1])
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
