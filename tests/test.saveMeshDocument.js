const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 10000 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("saveMeshDocument", async () => {
  let document = await page.evaluate(async () => {
    nv = new niivue.Niivue({show3Dcrosshair: true});
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var meshList = [
      {
        url: "./images/BrainMesh_ICBM152.lh.mz3",
        rgba255: [222, 164, 164, 255],
      },
    ];
    await nv.loadMeshes(meshList);
    // RENDER: 4,
    nv.setSliceType(4);
    const json = nv.json();    
    let document = niivue.NVDocument.loadFromJSON(json);
    
    
    return document;
  });

  expect(document.meshDataObjects.length).toBe(1);
  expect(document.data.opts.sliceType).toBe(4);
  expect(document.data.opts.show3Dcrosshair).toBe(true);
});
