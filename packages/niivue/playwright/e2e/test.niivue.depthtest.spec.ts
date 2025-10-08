import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue tractography regression: mesh should respect depth test (no UI controls)', async ({ page }) => {
  const result = await page.evaluate(async (testOptions) => {
    // Create Niivue instance using demo-like options
    const nv1 = new Niivue({
      ...testOptions,
      show3Dcrosshair: true,
      backColor: [0.8, 0.8, 1, 1]
    })

    nv1.opts.isColorbar = true
    nv1.setSliceType(nv1.sliceTypeRender)

    // attach to canvas id "gl1"
    await nv1.attachTo('gl')

    // load one volume and one mesh (paths relative to served page)
    const volumeList1 = [{ url: './images/mni152.nii.gz' }]
    await nv1.loadVolumes(volumeList1)

    // load mesh (use dpsv.trx like demo)
    await nv1.loadMeshes([{ url: './images/dpsv.trx', rgba255: [0, 142, 0, 255] }])

    // set some properties similar to demo (not UI-driven)
    nv1.setMeshProperty(0, 'colormap', 'blue')
    nv1.setMeshProperty(0, 'rgba255', [0, 255, 255, 255])

    // set a clip plane that reveals overlap situations to expose depth issues
    nv1.setClipPlane([-0.1, 270, 0])

    // draw and finish GL to ensure the frame is rendered
    nv1.drawScene()
    nv1.gl.finish()

    return {
      volumes: nv1.volumes.length,
      meshes: nv1.meshes.length
    }
  }, TEST_OPTIONS)

  // Basic sanity checks
  expect(result.volumes).toBe(1)
  expect(result.meshes).toBeGreaterThanOrEqual(1)

  // give a moment for the rendered frame to stabilize, then snapshot
  await page.waitForTimeout(1000)
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
