import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue event onLocationChange 4D', async ({ page }) => {
  const frameVoxVal = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
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
      val = msg.values[0].value
    }

    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 200)
    nv.mouseClick(50, 200)
    return val
  })

  expect(frameVoxVal).toEqual(1058)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
