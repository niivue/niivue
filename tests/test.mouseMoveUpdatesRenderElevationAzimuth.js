const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("mouseMoveUpdatesRenderElevationAzimuth", async () => {
  let scene = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    nv.setSliceType(nv.sliceTypeRender);
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
    // set defaults
    nv.mousePos = [0, 0];
    nv.setRenderAzimuthElevation(110, 10); // set to default
    nv.mouseMove(50, 50);
    
    return nv.scene
  });
  
  expect(scene.renderAzimuth).toEqual(160);
  expect(scene.renderElevation).toEqual(60);
  await snapshot();
});
