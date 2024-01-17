import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadVolumes complex nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/complex_image.nii.gz',
        name: 'complex_image.nii.gz',
        colormap: 'gray'
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  })
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadVolumes dicom manifest', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/dicom/niivue-manifest.txt',
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true,
        isManifest: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  })
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadVolumes limit 4D frames loaded', async ({ page }) => {
  const imgLength = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        limitFrames4D: 1
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes[0].img.length
  })
  expect(imgLength).toBe(imgLength)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadVolumes from query string nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz?test=test',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  })
  expect(nvols).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadVolumes nifti volume overlay', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      },
      {
        url: './images/hippo.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'hippo.nii.gz',
        colormap: 'winter',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  })
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
