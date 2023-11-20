const { httpServerAddress } = require("./helpers");
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress);
  console.log(`Running ${testInfo.title}`);
});

test("loadSingleImage", async ({ page }) => {
  let nvols = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: "./images/mni152.nii.gz", //"./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    return nv.volumes.length;
  });
  expect(nvols).toBe(1);
  await expect(page).toHaveScreenshot({ timeout: 30000 });
});
