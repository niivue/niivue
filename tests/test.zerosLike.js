const { snapshot, httpServerAddressSync, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddressSync, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("zeroLike creates clone of object with all zeros", async () => {
  await page.evaluate(async () => {
    const volumeList1 = [
      // first item is background image
      {
        url: "./images/mni152.nii.gz", //"./images/RAS.nii.gz", "./images/spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];

    async function load() {
      let nv1 = new niivue.Niivue();
      await nv1.attachTo("gl1", false);
      await nv1.loadVolumes(volumeList1);
      nv1.setSliceType(nv1.sliceTypeMultiplanar);

      let nv2 = new niivue.Niivue();
      await nv2.attachTo("gl2", false);
      nv2.addVolume(niivue.NVImage.zerosLike(nv1.volumes[0]));
    }
    await load();
  });
  await snapshot("#gl2");
});
