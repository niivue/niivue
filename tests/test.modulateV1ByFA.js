const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
    await page.goto(httpServerAddress, { timeout: 0 })
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test('modulateV1ByFA', async () => {
    const nvols = await page.evaluate(async () => {
        const nv = new niivue.Niivue()
        await nv.attachTo('gl', false)
        // load one volume object in an array
        const volumeList = [
            {
                url: "../demos/images/V1.nii.gz",
                opacity: 1,
                visible: true,
            },
            {
                url: "../demos/images/FA.nii.gz",
                colormap: "gray",
                opacity: 1.0,
                visible: true,
            },
        ]
        await nv.loadVolumes(volumeList)
        nv.setSliceType(nv.sliceTypeMultiplanar)
        nv.setOpacity(0, 1.0); //show V1
        nv.setOpacity(1, 0.0); //hide FA
        // modulate V1 by FA
        await nv.setModulationImage(nv.volumes[0].id, nv.volumes[1].id)
        await nv.updateGLVolume()

        return nv.volumes.length
    })
    expect(nvols).toBe(2)
    await snapshot()
})
