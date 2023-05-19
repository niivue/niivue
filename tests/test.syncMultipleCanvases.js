const { snapshot, httpServerAddressSync, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddressSync, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("crosshairs synced on click", async () => {
  await page.evaluate(async () => {
    let opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1], // blue
    };
    nv1 = new niivue.Niivue((opts = opts));
    nv1.attachTo("gl1", false);
    nv2 = new niivue.Niivue((opts = opts));
    nv2.attachTo("gl2", false);
    // load one volume object in an array
    var volumeList1 = [
      {
        url: "./images/mni152.nii.gz", //"./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    var volumeList2 = [
      {
        url: "./images/mni152.nii.gz", //"./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv1.loadVolumes(volumeList1);
    await nv2.loadVolumes(volumeList2);
    nv1.syncWith(nv2);
  });
  await page.mouse.click(100, 200);
  await page.waitForTimeout(1000);
  await snapshot("#gl2");
});
