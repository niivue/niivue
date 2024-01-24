import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue draw3D sobel shader', async ({ page }) => {
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
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
