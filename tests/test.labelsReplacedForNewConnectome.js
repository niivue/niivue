const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("labelsReplacedForNewConnectome", async () => {
  let labels = await page.evaluate(async () => {
    let nv = new niivue.Niivue({ show3Dcrosshair: true, isColorbar: true });
    nv.opts.multiplanarForceRender = true;
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
    nv.opts.meshXRay = 0.2;

    let connectome = {
      name: "simpleConnectome",
      nodeColormap: "warm",
      nodeColormapNegative: "winter",
      nodeMinColor: 2,
      nodeMaxColor: 4,
      nodeScale: 3, //scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
      edgeColormap: "warm",
      edgeColormapNegative: "winter",
      edgeMin: 2,
      edgeMax: 6,
      edgeScale: 1,
      nodes: [
        {
          name: "RF",
          x: 40,
          y: 40,
          z: 30,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: "LF",
          x: -40,
          y: 40,
          z: 20,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: "RP",
          x: 40,
          y: -40,
          z: 50,
          colorValue: 3,
          sizeValue: 3
        },
        {
          name: "LP",
          x: -40,
          y: -40,
          z: 50,
          colorValue: 4,
          sizeValue: 4
        }
      ],
      edges: [{
        first: 0,
        second: 1,
        colorValue: 2
      },
      {
        first: 0, 
        second: 2,
        colorValue: -3
      },
      {
        first: 0,
        second: 3,
        colorValue: 4
      },
      {
        first: 1,
        second: 3,
        colorValue: 6
      }],
    };

    await nv.loadConnectome(connectome);
    // load the connectome again to verify that no new labels are added
    connectome.nodes[0].name = "NewRF";
    await nv.loadConnectome(connectome);
    nv.setMeshProperty(nv.meshes[0].id, "nodeScale", 3);
    nv.setClipPlane([-0.1, 270, 0]);

    return nv.getAllLabels();
  });
  expect(labels.length).toBe(4);
  expect(labels[0].text).toEqual("NewRF");
  await snapshot();
});
