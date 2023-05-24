const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("frac2mm", async () => {
  let mm = await page.evaluate(async () => {
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
    let frac = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721];
    let mm = nv.frac2mm(frac);
    return mm;
  });
  let expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984];
  for (let i = 0; i < mm.length; i++) {
    expect(mm[i]).toBeCloseTo(expected[i]);
  }
});
