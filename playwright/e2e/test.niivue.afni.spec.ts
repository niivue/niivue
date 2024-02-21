import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('anat2temp', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
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
    nv.volumes[1].alphaThreshold = 1 // was true in example from PT
    nv.overlayOutlineWidth = 0
    nv.opts.multiplanarForceRender = true
    nv.backgroundMasksOverlays = 1 // was true in example from PT
    nv.scene.crosshairPos = nv.mm2frac([-1, -17, 5.0])
    nv.updateGLVolume()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
