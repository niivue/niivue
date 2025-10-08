import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue advanced world-space demo', async ({ page }) => {
  // ensure the canvas exists before we try to attach
  await page.waitForSelector('#gl', { timeout: 5000 })

  const result = await page.evaluate(async (testOptions) => {
    const nv1 = new Niivue({
      ...testOptions,
      dragAndDropEnabled: true,
      backColor: [0.3, 0.2, 0.4, 1],
      show3Dcrosshair: true
    })

    // match demo setup (no UI)
    nv1.setSliceMM(true)
    await nv1.attachTo('gl')

    // set a clip plane that exercises depth ordering
    nv1.setClipPlane([-0.1, 270, 0])
    nv1.setRenderAzimuthElevation(120, 10)
    nv1.setHighResolutionCapable(true)

    // load volume and meshes used by the demo (paths relative to served page)
    const volumeList = [{ url: './images/mni152.nii.gz', colormap: 'gray', opacity: 1, visible: true }]
    await nv1.loadVolumes(volumeList)

    await nv1.loadMeshes([
      { url: './images/BrainMesh_ICBM152.lh.mz3', rgba255: [200, 162, 255, 255] },
      { url: './images/dpsv.trx', rgba255: [255, 255, 255, 255] }
    ])

    // use multiplanar slice type per demo
    nv1.setSliceType(nv1.sliceTypeMultiplanar)

    // render and flush GL
    nv1.drawScene()
    nv1.gl.finish()

    return {
      volumes: nv1.volumes.length,
      meshes: nv1.meshes.length
    }
  }, TEST_OPTIONS)

  // sanity checks
  expect(result.volumes).toBe(1)
  expect(result.meshes).toBeGreaterThanOrEqual(1)

  // let rendering settle, then snapshot the canvas with id "gl"
  await page.waitForTimeout(1000)
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
