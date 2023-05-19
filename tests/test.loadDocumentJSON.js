const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("loadDocumentJSON", async () => {
  let nvols = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    var volumeList = [
      {
        url: "./images/mni152.nii.gz",
        volume: { hdr: null, img: null },
        name: "mni152.nii.gz",
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
      {
        url: "./images/hippo.nii.gz",
        volume: { hdr: null, img: null },
        name: "hippo.nii.gz",
        colormap: "winter",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    let data = nv.document.json();
    let document = niivue.NVDocument.loadFromJSON(data);
    nv.volumes.length = 0;
    nv.loadDocument(document);
    return nv.volumes.length;
  });
  expect(nvols).toBe(2);
  await snapshot();
});
