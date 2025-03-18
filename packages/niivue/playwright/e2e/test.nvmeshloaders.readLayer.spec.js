import { test, expect } from '@playwright/test'
import { Niivue, NVMeshLoaders } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'
test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('nvmeshloaders readLayer', async ({ page }) => {
  const nlayers = await page.evaluate(async (testOptions) => {
    // load one volume object in an array
    // eslint-disable-next-line no-undef
    const nv = new Niivue({
      ...testOptions,
      show3Dcrosshair: true,
      backColor: [1, 1, 1, 1],
      meshXRay: 0.3
    })
    await nv.attachTo('gl')
    nv.opts.isColorbar = true

    await nv.loadMeshes([
      {
        url: './images/BrainMesh_ICBM152.lh.mz3',
        rgba255: [255, 255, 255, 255]
      },
      { url: './images/CIT168.mz3', rgba255: [0, 0, 255, 255] }
    ])
    const layer = {
      url: './images/BrainMesh_ICBM152.lh.motor.mz3',
      cal_min: 0.5,
      cal_max: 5.5,
      useNegativeCmap: true,
      opacity: 0.7
    }
    const response = await fetch(layer.url)
    if (!response.ok) {
      throw Error(response.statusText)
    }
    const buffer = await response.arrayBuffer()
    const meshLayer = await NVMeshLoaders.readLayer(
      layer.url,
      buffer,
      nv.meshes[0],
      layer.opacity,
      'gray',
      undefined,
      layer.useNegativeCmap
    )
    nv.meshes[0].layers.push(meshLayer)
    nv.meshes[0].updateMesh(nv.gl)
    nv.drawScene()
    return nv.meshes[0].layers.length
  }, TEST_OPTIONS)
  expect(nlayers).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
