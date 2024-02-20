'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue draw 3D sobel shader', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new index_1.Niivue(testOptions)
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
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue draw 3D clipPlane correct in axial plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new index_1.Niivue(opts)
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
  }, test_types_1.TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue draw 3D clipPlane correct in coronal plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new index_1.Niivue(opts)
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
  }, test_types_1.TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue draw 3D clipPlane correct in sagittal plane', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const opts = {
      ...testOptions,
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1] // green
    }
    const nv = new index_1.Niivue(opts)
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
  }, test_types_1.TEST_OPTIONS)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  // take a snapshot for comparison
  await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue draw 3D crosshair', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new index_1.Niivue({ ...testOptions, show3Dcrosshair: true })
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
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue draw 3D no crosshair', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    const nv = new index_1.Niivue({ ...testOptions, show3Dcrosshair: false })
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
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  // wait to take snapshot
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.draw3D.spec.js.map
