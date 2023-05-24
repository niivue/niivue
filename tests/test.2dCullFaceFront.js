const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadSingleImage", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: "./images/mni152.nii.gz", //"./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    // set to 3d view
    nv.setSliceType(nv.sliceTypeRender);
    // then back to 2d view before snapshot to test cullface FRONT is still set
    nv.setSliceType(nv.sliceTypeMultiplanar);
    return nv.volumes.length;
  });
  expect(nvols).toBe(1);
  await snapshot();
});
