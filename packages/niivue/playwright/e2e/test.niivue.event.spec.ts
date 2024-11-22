import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue event onLocationChange 4D', async ({ page }) => {
  const frameVoxVal = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        frame4D: 2
      }
    ]
    await nv.loadVolumes(volumeList)

    let val

    nv.onLocationChange = (msg) => {
      if (msg && typeof msg === 'object' && 'values' in msg && msg.values && typeof msg.values === 'object') {
        val = msg.values[0].value
      }
    }

    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 200)
    nv.mouseClick(50, 200)
    return val
  }, TEST_OPTIONS)

  expect(frameVoxVal).toEqual(1058)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
