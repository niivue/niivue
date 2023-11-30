const { snapshot, httpServerAddress } = require('./helpers')

beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('sobelShader', async () => {
  const nvols = await page.evaluate(async () => {
    const nv = new Niivue()
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      { url: './images/mni152.nii.gz', cal_min: 30, cal_max: 80 },
      { url: './images/spmMotor.nii.gz', cal_min: 3, cal_max: 8, colormap: 'warm' }
    ]
    await nv.setSliceType(nv.sliceTypeRender)
    await nv.setVolumeRenderIllumination(1.0)
    await nv.setClipPlane([0.3, 180, 20])
    await nv.loadVolumes(volumeList)
    await nv.loadMeshes([{ url: './images/connectome.jcon' }, { url: './images/dpsv.trx', rgba255: [0, 142, 0, 255] }])
    await nv.loadMatCapTexture('./matcaps/Cortex.jpg')
    return nv.volumes.length
  })
  expect(nvols).toBe(2)
  await snapshot()
})
