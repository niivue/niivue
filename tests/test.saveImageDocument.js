const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 10000 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test.skip('saveImageDocument', async () => {
  const document = await page.evaluate(async () => {
    nv = new niivue.Niivue()
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      },
      {
        url: './images/hippo.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'hippo.nii.gz',
        colormap: 'winter',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    // SAGITTAL: 2
    nv.setSliceType(2)
    nv.scene.crosshairPos = [0.1, 0.2, 0.3]
    const json = nv.json()
    const document = niivue.NVDocument.loadFromJSON(json)

    return document
  })

  expect(document.data.encodedImageBlobs.length).toBe(2)
  expect(document.data.opts.sliceType).toBe(2)
  expect(document.scene.crosshairPos).toEqual([0.1, 0.2, 0.3])
})
