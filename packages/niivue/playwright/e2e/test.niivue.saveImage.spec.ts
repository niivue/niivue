import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '@playwright/test'
import * as nifti from 'nifti-reader-js'
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

test('niivue save drawing LAS', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/nifti_space/LAS.nii.gz',
        volume: { hdr: null, img: null },
        name: 'LAS.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    await nv.loadDrawingFromUrl('./images/LAS_drawing_correct.nii.gz')
    await nv.saveImage({ filename: 'test_LAS_drawing.nii.gz', isSaveDrawing: true, volumeByIndex: 0 })
  }, TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const correctImageBuffer = fs.readFileSync('./tests/images/LAS_drawing_correct.nii.gz')
  let correctImage = correctImageBuffer.buffer.slice(
    correctImageBuffer.byteOffset,
    correctImageBuffer.byteOffset + correctImageBuffer.byteLength
  )
  const incorrectImageBuffer = fs.readFileSync('./tests/images/LAS_drawing_incorrect.nii.gz')
  let incorrectImage = incorrectImageBuffer.buffer.slice(
    incorrectImageBuffer.byteOffset,
    incorrectImageBuffer.byteOffset + incorrectImageBuffer.byteLength
  )
  const downloadedImageBuffer = fs.readFileSync(filePath)
  let downloadedImage = downloadedImageBuffer.buffer.slice(
    downloadedImageBuffer.byteOffset,
    downloadedImageBuffer.byteOffset + downloadedImageBuffer.byteLength
  )
  if (nifti.isCompressed(downloadedImage as ArrayBuffer)) {
    downloadedImage = nifti.decompress(downloadedImage as ArrayBuffer)
  }
  if (nifti.isCompressed(correctImage as ArrayBuffer)) {
    correctImage = nifti.decompress(correctImage as ArrayBuffer)
  }
  if (nifti.isCompressed(incorrectImage as ArrayBuffer)) {
    incorrectImage = nifti.decompress(incorrectImage as ArrayBuffer)
  }

  // compare the downloaded drawing to the correct and incorrect variants (regression test).
  // when loading an LAS drawing, we display it as RAS, but when saving it again, it should be in LAS (the original orientation)
  const downloadedHeader = nifti.readHeader(downloadedImage as ArrayBuffer)
  const correctHeader = nifti.readHeader(correctImage as ArrayBuffer)
  const incorrectHeader = nifti.readHeader(incorrectImage as ArrayBuffer)
  const downloadedImageData = nifti.readImage(downloadedHeader, downloadedImage as ArrayBuffer)
  const correctImageData = nifti.readImage(correctHeader, correctImage as ArrayBuffer)
  const incorrectImageData = nifti.readImage(incorrectHeader, incorrectImage as ArrayBuffer)
  // expect the downloaded drawing to be equal to the correct drawing (LAS)
  expect(new Uint8Array(downloadedImageData)).toEqual(new Uint8Array(correctImageData))
  // expect the downloaded drawing to not be equal to the incorrect drawing (which has a double permutation)
  expect(new Uint8Array(downloadedImageData)).not.toEqual(new Uint8Array(incorrectImageData))
  fs.unlinkSync(filePath)
})
