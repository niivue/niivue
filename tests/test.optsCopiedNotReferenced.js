const { snapshot, httpServerAddress } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("optsCopiedNotReferenced", async () => {
  let sliceType = await page.evaluate(async () => {
    let nv1 = new niivue.Niivue();
    let nv2 = new niivue.Niivue();
    nv1.setSliceType(niivue.SLICE_TYPE.SAGITTAL);
    nv2.setSliceType(niivue.SLICE_TYPE.AXIAL);
    return nv1.opts.sliceType;
  });
  expect(sliceType).toBe(2); // niivue.SLICE_TYPE.SAGITTAL
});
