import fs from 'fs'
import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

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
    const retFile = await page.evaluate(async (file, testOptions) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue(testOptions)
      await nv.attachTo('gl', false)
      // load one volume object in an array
      const volumeList = [
        {
          url: `./images/mni152.nii.gz`,
          colormap: `${file}`,
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
      return file
    }, file)
    expect(retFile).toBe(file)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}

for (const file of files) {
  test(`niivue colormap ${file} inverted`, async ({ page }) => {
    const retFile = await page.evaluate(async (file) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue()
      await nv.attachTo('gl', false)
      // load one volume object in an array
      const volumeList = [
        {
          url: `./images/mni152.nii.gz`,
          colormap: `${file}`,
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
      nv.volumes[0].colormapInvert = true
      nv.updateGLVolume()
      return file
    }, file)
    expect(retFile).toBe(file)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
