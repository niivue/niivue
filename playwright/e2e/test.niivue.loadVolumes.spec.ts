import fs from 'fs'
import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { NiivueTestOptions, NiivueTestOptionsFilePath, TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadVolumes readRGB nifti', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/ct_perfusion.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'ct_perfusion.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

const files = fs.readdirSync('./tests/images/nifti_space')
for (const file of files) {
  test(`niivue load niftispace ${file}`, async ({ page }) => {
    const options: NiivueTestOptionsFilePath = { ...TEST_OPTIONS, filePath: file }
    await page.evaluate(async (options) => {
      const nv = new Niivue(options as NiivueTestOptions)
      await nv.attachTo('gl')
      const volumeList = [
        {
          url: `./images/nifti_space/${options.filePath}`,
          colormap: 'gray',
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
    }, options)

    await expect(page).toHaveScreenshot({ timeout: 30000 })
  })
}

for (const file of files) {
  test(`niivue load niftispace ${file} 3D render`, async ({ page }) => {
    const options: NiivueTestOptionsFilePath = { ...TEST_OPTIONS, filePath: file }
    await page.evaluate(async (options) => {
      const nv = new Niivue(options as NiivueTestOptions)
      await nv.attachTo('gl')
      const volumeList = [
        {
          url: `./images/nifti_space/${options.filePath}`,
          colormap: 'gray',
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
    }, options)

    await expect(page).toHaveScreenshot({ timeout: 30000 })
  })
}
