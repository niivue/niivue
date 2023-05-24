const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("volume is properly clipped in sagittal plane", async () => {
  await page.evaluate(async () => {
    let opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1], // green
    };
    let nv = new niivue.Niivue((opts = opts));
    await nv.attachTo("gl", false);
    nv.setSliceType(nv.sliceTypeRender);
    nv.setClipPlane([0, 270, 0]);

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
  });
  // take a snapshot for comparison
  await snapshot();
});
