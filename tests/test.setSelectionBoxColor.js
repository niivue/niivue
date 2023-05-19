const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("set selection box color", async () => {
  let selectionBoxColor = await page.evaluate(async () => {
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
    nv.setSelectionBoxColor([0, 1, 0, 1]); // green (rgba)
    return nv.opts.selectionBoxColor;
  });

  await page.waitForTimeout(500);
  // change intensity of image by selecting a region
  await page.mouse.move(100, 200);
  await page.mouse.click(100, 200);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(130, 230);

  expect(selectionBoxColor).toEqual([0, 1, 0, 1]);
  // take a snapshot for comparison
  await snapshot();
});
