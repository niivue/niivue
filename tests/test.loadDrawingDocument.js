const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadDrawingDocument", async () => {
  let isDrawingPresent = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    await nv.loadDocumentFromUrl("./images/document/niivue.drawing.nvd");
    return nv.drawBitmap != null;
  });
  expect(isDrawingPresent).toBe(true);
  await snapshot();
});
