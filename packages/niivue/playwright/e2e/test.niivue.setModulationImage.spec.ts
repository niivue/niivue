import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue setModulationImage', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: '../demos/images/V1.nii.gz',
        opacity: 1,
        visible: true
      },
      {
        url: '../demos/images/FA.nii.gz',
        colormap: 'gray',
        opacity: 1.0,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.setSliceType(nv.sliceTypeMultiplanar)
    nv.setOpacity(0, 1.0) // show V1
    nv.setOpacity(1, 0.0) // hide FA
    // modulate V1 by FA
    await nv.setModulationImage(nv.volumes[0].id, nv.volumes[1].id)
    await nv.updateGLVolume()

    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
