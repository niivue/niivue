const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("double click to reset brightness and contrast", async () => {
  await page.evaluate(async () => {
    let opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1], // green
    };
    let nv = new niivue.Niivue((opts = opts));
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
  });

  await page.waitForTimeout(500);
  // change intensity of image by selecting a region
  await page.mouse.move(100, 200);
  await page.mouse.click(100, 200);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(130, 230);
  await page.mouse.up({ button: "right" });
  // now double click to reset the intensity change we just created
  // a double left click triggers a reset
  await page.mouse.click(100, 200, { clickCount: 2 });
  // take a snapshot for comparison
  await snapshot();
});
