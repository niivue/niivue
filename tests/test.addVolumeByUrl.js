const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 10000 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("addVolumeByUrl", async () => {
  let nvols = await page.evaluate(async () => {
    nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object by url with options
    let options = {
      url: "./images/mni152.nii.gz",
      volume: { hdr: null, img: null },
      name: "mni152.nii.gz",
      colormap: "gray",
      opacity: 1,
      visible: true,
    };

    await nv.addVolumeFromUrl(options);
    return nv.volumes.length;
  });

  expect(nvols).toBe(1);
  await snapshot();
});
