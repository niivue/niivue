const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  console.log(httpServerAddress);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadImageWithQueryString", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: "./images/mni152.nii.gz?test=test",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    return nv.volumes.length;
  });
  expect(nvols).toBe(1);
  await snapshot();
});
