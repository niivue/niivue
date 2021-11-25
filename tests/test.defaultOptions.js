const { snapshot, httpServerAddress, seconds } = require("./helpers")
beforeEach(async () => {
  await page.goto(httpServerAddress, {timeout:0})
  await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 1});
})
test('defaultOptions', async () => {
  let opts = await page.evaluate(async () => {
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
    return nv.opts
  })

  expect(opts.textHeight).toEqual(0.03)
  expect(opts.colorbarHeight).toEqual(0.05)
  expect(opts.crosshairWidth).toEqual(1)
  expect(opts.backColor).toEqual([0, 0, 0, 1])
  expect(opts.crosshairColor).toEqual([1, 0, 0, 1])
  expect(opts.selectionBoxColor).toEqual([1, 1, 1, .5])
  expect(opts.colorBarMargin).toEqual(0.05)
  expect(opts.briStep).toEqual(1) // deprecated since selection box is used now
  expect(opts.conStep).toEqual(1) //deprecated since selection box is used now
})