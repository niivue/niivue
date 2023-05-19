const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("vox2mm", async () => {
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
        intensityMin: 0, // not used yet
        intensityMax: 100, // not used yet
        intensityRange: [0, 100], // not used yet
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    let vox = [103, 128, 129];
    let xfm = [
      0.7375, 0, 0, -75.76, 0, 0.7375, 0, -110.8, 0, 0, 0.7375, -71.76, 0, 0, 0,
      1,
    ];
    let mm = nv.vox2mm(vox, xfm);
    return [mm[0], mm[1], mm[2]];
  });
  expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984];
  for (let i = 0; i < mm.length; i++) {
    expect(mm[i]).toBeCloseTo(expected[i]);
  }
});
