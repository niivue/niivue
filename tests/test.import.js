const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("is available", async () => {
  let opts = null;
  // test if nv.opts is defined to make sure niivue is imported and loaded
  opts = await page.evaluate(() => {
    let nv = new niivue.Niivue();
    return nv.opts;
  });
  expect(opts).toBeDefined();
});
