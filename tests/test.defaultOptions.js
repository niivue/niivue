const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("defaultOptions", async () => {
  let opts = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    return nv.opts;
  });

  expect(opts.textHeight).toEqual(0.06);
  expect(opts.colorbarHeight).toEqual(0.05);
  expect(opts.crosshairWidth).toEqual(1);
  expect(opts.backColor).toEqual([0, 0, 0, 1]);
  expect(opts.crosshairColor).toEqual([1, 0, 0, 1]);
  expect(opts.selectionBoxColor).toEqual([1, 1, 1, 0.5]);
  expect(opts.colorbarMargin).toEqual(0.05);
});
