import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mouse right click and drag draws selection box', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
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
  })
  await page.mouse.move(100, 200)
  await page.mouse.click(100, 200)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(130, 230)
  // take a snapshot for comparison
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue mouse right click, drag and up sets intensity range', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
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
  })
  await page.mouse.move(100, 200)
  await page.mouse.click(100, 200)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(130, 230)
  await page.mouse.up({ button: 'right' })
  // take a snapshot for comparison
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
