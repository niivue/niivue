const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("calMinMax do not trust header cal min max", async () => {
  let minmax = await page.evaluate(async () => {
    let opts = {
      textHeight: 0.05, // larger text
      crosshairColor: [0, 0, 1, 1], // green
      trustCalMinMax: false,
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
    let overlayItem = nv.volumes[0];
    let minmax = overlayItem.calMinMax();
    return minmax;
  });
  expected = [40, 80, 0, 91.46501398086548];
  for (let i = 0; i < minmax.length; i++) {
    expect(minmax[i]).toBeCloseTo(expected[i]);
  }
});
