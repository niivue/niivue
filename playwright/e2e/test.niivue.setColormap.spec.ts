import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue setColormap', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
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
    nv.setColormap(nv.volumes[0].id, 'red')
  }, TEST_OPTIONS)

  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
