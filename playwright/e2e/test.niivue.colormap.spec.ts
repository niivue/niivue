import * as fs from 'fs'
import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS, NiivueTestOptions } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

// get a list of cmap json file names. dont include files that start with "_"
let files = fs.readdirSync('./src/cmaps').filter((file) => {
  return file.endsWith('.json') && !file.startsWith('_')
})

// now just get the file name without the .json extension
files = files.map((file) => {
  return file.replace('.json', '')
})

for (const file of files) {
  test(`niivue colormap ${file}`, async ({ page }) => {
    await page.evaluate(
      async (testFileOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testFileOptions as NiivueTestOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const volumeList = [
          {
            url: `./images/mni152.nii.gz`,
            colormap: `${testFileOptions.file}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(volumeList)
      },
      { ...TEST_OPTIONS, file }
    )
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}

for (const file of files) {
  test(`niivue colormap ${file} inverted`, async ({ page }) => {
    await page.evaluate(
      async (testFileOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testFileOptions as NiivueTestOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const volumeList = [
          {
            url: `./images/mni152.nii.gz`,
            colormap: `${testFileOptions.file}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(volumeList)
        nv.volumes[0].colormapInvert = true
        nv.updateGLVolume()
      },
      { ...TEST_OPTIONS, file }
    )
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
