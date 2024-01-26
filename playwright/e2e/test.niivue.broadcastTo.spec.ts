import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddressSync } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddressSync)
})

test('niivue broadcastTo', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv1 = new Niivue(testOptions)
    await nv1.attachTo('gl1')
    nv1.attachTo('gl1')
    const nv2 = new Niivue(testOptions)
    await nv2.attachTo('gl2')
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
    await nv1.loadVolumes(volumeList)
    await nv2.loadVolumes(volumeList)
    nv1.broadcastTo(nv2)
  }, TEST_OPTIONS)

  await page.mouse.click(100, 200)
  await expect(page).toHaveScreenshot({ timeout: 30000, fullPage : true })
})
