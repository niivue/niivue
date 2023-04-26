const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("limitVolsLoaded", async () => {
  let imgLength = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: "./images/pcasl.nii.gz",
        name: "pcasl.nii.gz",
        limitFrames4D: 1
      },
    ];
    await nv.loadVolumes(volumeList);
    return nv.volumes[0].img.length;
  });
  expect(imgLength).toBe(70720);
  await snapshot();
});
