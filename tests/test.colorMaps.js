const { snapshot, httpServerAddress, seconds } = require("./helpers");
const fs = require("fs");
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});


// get a list of cmap json file names. dont include files that start with "_"
let files = fs.readdirSync("./src/cmaps").filter((file) => {
    return file.endsWith(".json") && !file.startsWith("_");
});

// now just get the file name without the .json extension
files = files.map((file) => {
    return file.replace(".json", "");
});


test.each(files)("colormap_%s", async (file) => {
  let retFile = await page.evaluate(async (file) => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    console.log(`${file}`)
    var volumeList = [
      {
        url: `./images/mni152.nii.gz`,
        colormap: `${file}`,
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    return file;
  }, file);
  expect(retFile).toBe(file);
  await snapshot();
});

test.each(files)("colormap_inverted_%s", async (file) => {
  let retFile = await page.evaluate(async (file) => {
    let nv = new niivue.Niivue();
    await nv.attachTo("gl", false);
    // load one volume object in an array
    console.log(`${file}`)
    var volumeList = [
      {
        url: `./images/mni152.nii.gz`,
        colormap: `${file}`,
        opacity: 1,
        visible: true,
      },
    ];
    await nv.loadVolumes(volumeList);
    nv.volumes[0].colormapInvert = true;
    nv.updateGLVolume();
    return file;
  }, file);
  expect(retFile).toBe(file);
  await snapshot();
});