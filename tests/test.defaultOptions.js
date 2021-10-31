const { snapshot, httpServerAddress, seconds } = require("./helpers")
beforeEach(async () => {
  await page.goto(httpServerAddress, {timeout:0})
  await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 1});
})
test('defaultOptions', async () => {
  let nv = await page.evaluate(async () => {
    let nv = new niivue.Niivue()
    await nv.attachTo('gl')
    // load one volume object in an array
    // var volumeList = [
    //   {
    //     url: "../images/mni152.nii.gz",
    //     volume: { hdr: null, img: null },
    //     name: "mni152",
    //     colorMap: "gray",
    //     opacity: 1,
    //     visible: true,
    //   },
    // ]
    // await nv.loadVolumes(volumeList)
    return nv
  })

  expect(nv.opts.textHeight).toEqual(0.03)
  expect(nv.opts.colorbarHeight).toEqual(0.05)
  expect(nv.opts.crosshairWidth).toEqual(1)
  expect(nv.opts.backColor).toEqual([0, 0, 0, 1])
  expect(nv.opts.crosshairColor).toEqual([1, 0, 0, 1])
  expect(nv.opts.selectionBoxColor).toEqual([1, 1, 1, .5])
  expect(nv.opts.colorBarMargin).toEqual(0.05)
  expect(nv.opts.briStep).toEqual(1) // deprecated since selection box is used now
  expect(nv.opts.conStep).toEqual(1) //deprecated since selection box is used now
})