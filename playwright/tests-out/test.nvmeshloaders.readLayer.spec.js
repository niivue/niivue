'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('nvmeshloaders readLayer', async ({ page }) => {
  const nlayers = await page.evaluate(async (testOptions) => {
    // load one volume object in an array
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue({
      ...testOptions,
      show3Dcrosshair: true,
      backColor: [1, 1, 1, 1],
      meshXRay: 0.3
    })
    nv.attachTo('gl')
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
    index_1.NVMeshLoaders.readLayer(
      layer.url,
      buffer,
      nv.meshes[0],
      layer.opacity,
      'gray',
      undefined,
      layer.useNegativeCmap
    )
    nv.meshes[0].updateMesh(nv.gl)
    nv.drawScene()
    return nv.meshes[0].layers.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nlayers).toBe(1)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.nvmeshloaders.readLayer.spec.js.map
