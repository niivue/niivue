// @ts-check
const { httpServerAddress } = require("./helpers");
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress);
  console.log(`Running ${testInfo.title}`);
});

test("sobelShader", async ({ page }) => {
  let nvols = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    // @ts-ignore
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      { url: "./images/mni152.nii.gz", cal_min: 30, cal_max: 80 },
      {
        url: "./images/spmMotor.nii.gz",
        cal_min: 3,
        cal_max: 8,
        colormap: "warm",
      },
    ];
    nv.setSliceType(nv.sliceTypeRender);
    nv.opts.multiplanarForceRender = true;
    nv.setVolumeRenderIllumination(1.0);
    nv.setClipPlane([0.3, 180, 20]);
    await nv.loadVolumes(volumeList);
    await nv.loadMeshes([
      { url: "./images/connectome.jcon" },
      { url: "./images/dpsv.trx", rgba255: [0, 142, 0, 255] },
    ]);
    nv.loadMatCapTexture("./matcaps/Cortex.jpg");

    nv.drawScene();
    return nv.volumes.length;
  });
  console.log(nvols);
  // await orderSent.waitFor();
  expect(nvols).toBe(2);
  // await page.waitForTimeout(10000);

  await expect(page).toHaveScreenshot();
});
