const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("set radiological convention", async () => {
  let rad = await page.evaluate(async () => {
    let opts = {
      isRadiologicalConvention: true, // right of the image will be on the left of the display space
    };
    let nv = new niivue.Niivue((options = opts));
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
    return nv.getRadiologicalConvention();
  });
  expect(rad).toBeTruthy();
  await snapshot();
});
