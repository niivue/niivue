const { httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("embedUMD", async () => {
  let umd = await page.evaluate(async () => {
    nv = new niivue.Niivue();
    return nv.decodeEmbeddedUMD(); 
  });
  expect(umd.trim().endsWith("{value:\"Module\"})});")).toBe(true);
  
});
