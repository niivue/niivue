const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('loadDicomManifest', async () => {
  const nvols = await page.evaluate(async () => {
    const nv = new niivue.Niivue()
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/dicom/niivue-manifest.txt',
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true,
        isManifest: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  })
  expect(nvols).toBe(1)
  await snapshot()
})
