const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("3DwithCrosshair", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue({ show3Dcrosshair: true });
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
    nv.setSliceType(nv.sliceTypeRender);
    return nv.volumes.length;
  });
  expect(nvols).toBe(1);
  await snapshot();
});
