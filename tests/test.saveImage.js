const { snapshot, httpServerAddress, seconds } = require("./helpers");
const path = require("path");
const fs = require("fs");
const {waitForDownload} = require("puppeteer-utilz");

const downloadPath = path.resolve('./downloads');
const fileName = "test.nii";

function getFilesizeInBytes(filename) {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

beforeEach(async () => {

  await page.goto(httpServerAddress, { timeout: 0 });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath,
  });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
});
test("saveImage", async () => {
  await page.evaluate(async () => {
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
    await nv.saveImage("test.nii");
    
    return;
  });
    
  // // wait until we navigate or the test will not wait for the downloaded file
  // await page.goto(httpServerAddress, {waitUntil: 'networkidle2'});
  const filePath = path.join(downloadPath, fileName);
  waitForDownload(downloadPath);
  const fileSize = getFilesizeInBytes(filePath);
  expect(fileSize).toBeGreaterThan(4336029);
  fs.unlinkSync(filePath);


});

