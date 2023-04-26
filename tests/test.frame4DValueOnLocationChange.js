const { snapshot, httpServerAddress, seconds } = require("./helpers");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("frame4DValueOnLocationChange", async () => {
  let frameVoxVal = await page.evaluate(async () => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: "./images/pcasl.nii.gz",
        name: "pcasl.nii.gz",
        frame4D: 2
      },
    ];
    await nv.loadVolumes(volumeList);
    
    let val;

    nv.onLocationChange = (msg) => {
      console.log('callback called');
      val = msg.values[0].value;  
    }
  
    // set defaults
    nv.mousePos = [0, 0];
    nv.mouseDown(50, 200);
    nv.mouseClick(50, 200);
    return val
  });
  
  await snapshot();
  expect(frameVoxVal).toEqual(1058);

});
