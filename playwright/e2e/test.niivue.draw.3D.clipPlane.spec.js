import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue draw 3D clipPlane correct in axial plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    // eslint-disable-next-line no-undef
    const nv = new Niivue(opts)
    await nv.attachTo('gl', false)
    nv.setSliceType(nv.sliceTypeRender)
    nv.setClipPlane([0, 0, -90])

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
  })
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D clipPlane correct in coronal plane', async ({ page }) => {
  await page.evaluate(async () => {
    const opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    // eslint-disable-next-line no-undef
    const nv = new Niivue(opts)
    await nv.attachTo('gl', false)
    nv.setSliceType(nv.sliceTypeRender)
    nv.setClipPlane([0, 0, 0])

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
  })
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D clipPlane correct in sagittal plane', async ({ page }) => {
  await page.evaluate(async () => {
    const opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    // eslint-disable-next-line no-undef
    const nv = new Niivue(opts)
    await nv.attachTo('gl', false)
    nv.setSliceType(nv.sliceTypeRender)
    nv.setClipPlane([0, 270, 0])

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
  })
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
