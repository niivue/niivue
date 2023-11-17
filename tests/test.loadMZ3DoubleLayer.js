const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadMZ3Mesh", async () => {
  let nmeshes = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    var layersList = [
      {
        url: "./images/mz3/16DoubleOverlay_5124x2.mz3",
        colormap: "actc",
      },
    ];
    await nv.loadMeshes([{ url: "./images/mz3/cortex_5124.mz3", layers: layersList,}]);
    return nv.meshes.length;
  });
  expect(nmeshes).toBe(1);
  await snapshot();
});
