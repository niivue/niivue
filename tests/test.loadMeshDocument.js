const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadMeshDocument", async () => {
  let counts = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    await nv.loadDocumentFromUrl("./images/document/niivue.mesh.nvd");
    return {
      meshCount: nv.meshes.length,
      layerCount: nv.meshes.length > 0 ? nv.meshes[0].layers.length : 0,
    };
  });
  expect(counts.meshCount).toBe(1);
  expect(counts.layerCount).toBe(1);
  await snapshot();
});
