import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('afni anat2temp', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true })
    nv.opts.isColorbar = false
    nv.opts.sagittalNoseLeft = true
    nv.opts.isRadiologicalConvention = false
    nv.opts.isCornerOrientationText = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        // ulay
        url: '../../demos/images/anat_final.FT+tlrc.HEAD',
        cal_max: 1184.07216
      },
      {
        // olay
        url: '../../demos/images/MNI152_2009_template.nii.gz',
        frame4D: 0, // idx of vol
        colorMap: 'gray',
        cal_min: 0,
        cal_max: 1059.0,
        opacity: 1.0
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.volumes[1].colormapType = 2 // ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN
    nv.overlayOutlineWidth = 0
    nv.opts.multiplanarForceRender = true
    nv.backgroundMasksOverlays = 1
    nv.scene.crosshairPos = nv.mm2frac([-1, -17, 5.0])
    nv.updateGLVolume()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('afni EPI', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true })
    nv.opts.isColorbar = false
    nv.opts.sagittalNoseLeft = true
    nv.opts.isRadiologicalConvention = false
    nv.opts.isCornerOrientationText = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        // olay
        url: '../../demos/images/vr_base_min_outlier+orig.HEAD',
        frame4D: 0, // idx of vol
        colorMap: 'gray',
        cal_min: 0,
        cal_max: 1751.0,
        opacity: 1.0
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.overlayOutlineWidth = 0
    nv.opts.multiplanarForceRender = true
    nv.backgroundMasksOverlays = 1 // was true in example from PT
    nv.scene.crosshairPos = nv.mm2frac([-2.662201, -4.528702, 30.34942])
    nv.updateGLVolume()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('afni vis 0 coef', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true })
    nv.opts.isColorbar = false
    nv.opts.sagittalNoseLeft = true
    nv.opts.isRadiologicalConvention = false
    nv.opts.isCornerOrientationText = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        // ulay
        url: '../../demos/images/MNI152_2009_template.nii.gz',
        cal_max: 1296.72432
      },
      {
        // olay
        url: '../../demos/images/stats.FT+tlrc.HEAD',
        frame4D: 1, // idx of vol
        colorMap: 'afni_reds_inv',
        colorMapNegative: 'afni_blues_inv',
        cal_min: 0,
        cal_max: 3.616329,
        opacity: 1.0
      },
      {
        // thr
        url: '../../demos/images/stats.FT+tlrc.HEAD', // same dset as olay
        frame4D: 2, // idx of vol
        colorMap: 'blue',
        colorMapNegative: 'blue',
        cal_min: 0,
        cal_max: 3.314297,
        opacity: 0
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.volumes[1].colormapType = 2 // ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN
    nv.overlayOutlineWidth = 1
    nv.opts.multiplanarForceRender = true
    nv.backgroundMasksOverlays = 1
    nv.setModulationImage(
      nv.volumes[1].id,
      nv.volumes[2].id,
      2.0 // modulateAlpha = 2.0
    ) // activate+specify mapping
    nv.scene.crosshairPos = nv.mm2frac([-1, -17, 5.0])
    nv.updateGLVolume()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(3)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
