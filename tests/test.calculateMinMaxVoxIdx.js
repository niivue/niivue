const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("calculateMinMaxVoxIdx", async () => {
  let minmax = await page.evaluate(() => {
    let nv = new niivue.Niivue();
    let minmax = nv.calculateMinMaxVoxIdx([10, 1]);
    return minmax;
  });
  expect(minmax).toEqual([1, 10]);
});
