import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue load thumbnail preview', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // extend testOptions with a thumbnail option
    const nv = new Niivue({ ...testOptions, thumbnail: '../../demos/images/pcasl.png' })
    // const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../../demos/images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        colormap: 'gray',
        opacity: 1
      }
    ]
    await nv.loadVolumes(volumeList)
  }, TEST_OPTIONS)

  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue thumbnail aspect ratio correct after window resize', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    // extend testOptions with a thumbnail option
    const nv = new Niivue({ ...testOptions, thumbnail: '../../demos/images/pcasl.png' })
    // const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../../demos/images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        colormap: 'gray',
        opacity: 1
      }
    ]
    await nv.loadVolumes(volumeList)
  }, TEST_OPTIONS)

  // from: https://stackoverflow.com/a/77550054
  // Get the current viewport size
  const viewport = page.viewportSize()
  if (viewport) {
    const newWidth = Math.round(viewport.width * 0.8) // 80% of the current width
    const newHeight = viewport.height
    // Set the new viewport size
    await page.setViewportSize({ width: newWidth, height: newHeight })
  }

  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
