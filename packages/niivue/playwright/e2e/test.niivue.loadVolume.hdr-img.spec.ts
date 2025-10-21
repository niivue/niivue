// tests/niivue-hdr-img.spec.ts
import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js' // adjust path to your test helper
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  // go to the served index.html (root of the test server)
  await page.goto(httpServerAddress)
})

test('niivue loadVolume HDR IMG', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/ras.hdr',
        urlImgData: './images/ras.img',
        name: 'ras.hdr'
      }
    ]
    await nv.loadVolumes(volumeList)
    // set to 3d view
    nv.setSliceType(nv.sliceTypeRender)
    // then back to 2d view before snapshot to test cullface FRONT is still set
    nv.setSliceType(nv.sliceTypeMultiplanar)
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
