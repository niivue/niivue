import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue event onLocationChange 4D', async ({ page }) => {
  const frameVoxVal = await page.evaluate(async () => {
    const nv = new Niivue()
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
      console.log('callback called')
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
