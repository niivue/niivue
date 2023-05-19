const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("mouseDownUpdatesOnLocationChange", async () => {
  let xy = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
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
    
    let xy = [];

    nv.onLocationChange = (msg) => {
      console.log('callback called');
      xy = msg.xy;  
    }
  
    // set defaults
    nv.mousePos = [0, 0];
    nv.mouseDown(50, 50);
    nv.mouseClick(50, 50);
    
    return xy
  });
  
  expect(xy[0]).toEqual(50);
  expect(xy[1]).toEqual(50);
});
