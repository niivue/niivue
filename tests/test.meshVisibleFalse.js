const { snapshot, httpServerAddress } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('meshVisibleFalse', async () => {
  const nmeshes = await page.evaluate(async () => {
    const nv = new niivue.Niivue()
    await nv.attachTo('gl', false)
    const layersList = [
      {
        url: './images/mz3/11ScalarMesh.mz3',
        colormap: 'actc'
      }
    ]
    await nv.loadMeshes([
      { url: './images/mz3/3Mesh.mz3', layers: layersList, visible: false},
      { url: "../demos/images/CIT168.mz3", rgba255: [0, 0, 255, 255], visible: true },
    ])
    return nv.meshes.length
  })
  expect(nmeshes).toBe(2)
  // snapshot should just be a blank canvas (no mesh present)
  await snapshot()
})
