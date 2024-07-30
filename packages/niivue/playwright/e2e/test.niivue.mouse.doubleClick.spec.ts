import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mouse double click to reset brightness and contrast', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
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
    return nv.volumes.length
  }, TEST_OPTIONS)
  // change intensity of image by selecting a region
  await page.mouse.move(100, 200)
  await page.mouse.click(100, 200)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(130, 230)
  await page.mouse.up({ button: 'right' })
  // now double click to reset the intensity change we just created
  // a double left click triggers a reset
  await page.mouse.click(100, 200, { clickCount: 2 })
  // take a snapshot for comparison
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
