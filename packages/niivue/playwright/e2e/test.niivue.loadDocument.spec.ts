import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue nvdocument preserve gradientOpacity and gradientAmount', async ({ page }) => {
  const json = await page.evaluate(async (testOptions) => {
    const nv = new Niivue({
      ...testOptions
    })
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
    const clipPlane = [0.35, 290, 0]
    nv.setSliceType(nv.sliceTypeRender)
    nv.setClipPlane(clipPlane)
    nv.opts.gradientOrder = 2
    await nv.setVolumeRenderIllumination(0.7)
    await nv.setGradientOpacity(0.4)
    const json = nv.document.json()
    return json
  }, TEST_OPTIONS)

  expect(json.opts.gradientAmount).toEqual(0.7)
  expect(json.opts.gradientOpacity).toEqual(0.4)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
