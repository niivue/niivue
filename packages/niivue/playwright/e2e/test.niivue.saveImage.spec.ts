import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

function getFilesizeInBytes(filename) {
  const stats = fs.statSync(filename)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue saveImage', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
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
    await nv.saveImage({ filename: 'test.nii', isSaveDrawing: false, volumeByIndex: 0 })
  }, TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const fileSize = getFilesizeInBytes(filePath)
  expect(fileSize).toBeGreaterThan(4336029)
  fs.unlinkSync(filePath)
})
