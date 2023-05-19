const { snapshot, httpServerAddress, seconds } = require("./helpers");
const fs = require("fs");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});

//let files = fs.readdirSync('../images/nifti_space')
let files = fs.readdirSync("./tests/images/nifti_space");
//let filesArray = []
//files.forEach(file => {
//	filesArray.push([file])
//})
//console.log(filesArray)

test.each(files)("niftispace_%s", async (file) => {
  let retFile = await page.evaluate(async (file) => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    var volumeList = [
      {
        url: `./images/nifti_space/${file}`,
        colormap: "gray",
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    nv.setSliceType(nv.sliceTypeRender);
    return file;
  }, file);
  expect(retFile).toBe(file);
  // set failure threshold to 50% due to volume renderer differences between macos local screenshots and CI macos screenshots
  // local screenshots (macos 12 M1, Chrome) have a slight noise in them, whereas github actions macos 11 runner does not
  await snapshot("#gl", 0.5);
});
