import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue mouse down updates onLocationChange', async ({ page }) => {
  const xy = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
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
    let xy: number[] = []

    nv.onLocationChange = (msg) => {
      if (msg && typeof msg === 'object' && 'xy' in msg && Array.isArray(msg.xy)) {
        xy = msg.xy
      }
    }

    // set defaults
    nv.mousePos = [0, 0]
    nv.mouseDown(50, 50)
    nv.mouseClick(50, 50)

    return xy
  }, TEST_OPTIONS)
  expect(xy[0]).toEqual(50)
  expect(xy[1]).toEqual(50)
})
