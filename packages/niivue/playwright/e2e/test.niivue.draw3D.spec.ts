import * as process from 'node:process'
import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test.skip('niivue draw 3D sobel shader', async ({ page }) => {
  test.skip(process.platform === 'linux', 'do not run test on linux')
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const volumeList = [
      { url: './images/mni152.nii.gz', cal_min: 30, cal_max: 80 },
      { url: './images/spmMotor.nii.gz', cal_min: 3, cal_max: 8, colormap: 'warm' }
    ]
    nv.setSliceType(nv.sliceTypeRender)
    nv.setVolumeRenderIllumination(1.0)
    nv.setClipPlane([0.3, 180, 20])
    await nv.loadVolumes(volumeList)
    await nv.loadMeshes([{ url: './images/connectome.jcon' }, { url: './images/dpsv.trx', rgba255: [0, 142, 0, 255] }])
    await nv.loadMatCapTexture('./matcaps/Cortex.jpg')
    nv.drawScene()
    nv.gl.finish()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D clipPlane correct in axial plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new Niivue(opts)
    await nv.attachTo('gl')
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
  }, TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D clipPlane correct in coronal plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new Niivue(opts)
    await nv.attachTo('gl')
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
  }, TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D clipPlane correct in sagittal plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new Niivue(opts)
    await nv.attachTo('gl')
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
  }, TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D crosshair', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true })
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
    nv.setSliceType(nv.sliceTypeRender)
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue draw 3D no crosshair', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: false })
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
    nv.setSliceType(nv.sliceTypeRender)
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
