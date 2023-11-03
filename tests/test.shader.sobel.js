const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("sobelShader", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      { url: "./images/mni152.nii.gz", cal_min: 30, cal_max: 80 },
      {url: "./images/spmMotor.nii.gz",cal_min: 3,cal_max: 8,colormap: "warm"}
    ];
    nv.setSliceType(nv.sliceTypeRender);
    nv.opts.multiplanarForceRender = true;
    nv.setVolumeRenderIllumination(1.0);
    nv.setClipPlane([0.3, 180, 20]);
    await nv.loadVolumes(volumeList);
    await nv.loadMeshes([
      { url: "./images/connectome.jcon" },
      { url: "./images/dpsv.trx", rgba255: [0, 142, 0, 255] },
    ]);
    nv.loadMatCapTexture("./matcaps/Cortex.jpg");
    return nv.volumes.length;
  });
  console.log(nvols);
  expect(nvols).toBe(2);
  // expect(nv.meshes.length).toBe(1);
  await snapshot();
});
