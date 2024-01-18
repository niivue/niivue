import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mouse down updates onLocationChange', async ({ page }) => {
  const xy = await page.evaluate(async (testOptions) => {
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
    let xy = []

    nv.onLocationChange = (msg) => {
      xy = msg.xy
    }

    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 50)
    nv.mouseClick(50, 50)

    return xy
  })
  expect(xy[0]).toEqual(50)
  expect(xy[1]).toEqual(50)
})
