const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadTwoDocuments", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    await nv.loadDocumentFromUrl("./images/document/niivue.drawing.nvd");
    // now load a document with no meshes
    await nv.loadDocumentFromUrl("./images/document/niivue.mesh.nvd");
    return nv.volumes.length;
  });
  expect(nvols).toBe(0);
  await snapshot();
});
