const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("arrayEquals", async () => {
  let val = await page.evaluate(() => {
    let nv = new niivue.Niivue();
    let arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3]);
    return arreq;
  });
  await expect(val).toBeTruthy();
});
