const { toMatchImageSnapshot } = require('jest-image-snapshot');
expect.extend({ toMatchImageSnapshot });

async function snapshot() {
  await page.waitForSelector('#gl2');          // Method to ensure that the element is loaded
  await page.waitForTimeout(1000) // wait a little longer to ensure image loaded (some images were not loading in time)
  const canvas2 = await page.$('#gl2');
  const image = await canvas2.screenshot();

  expect(image).toMatchImageSnapshot({
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
  });
}

describe('Niivue sync', () => {
  // start a new page for each test below.
  // A server is started prior to navigating to this location
  beforeEach(async () => {
    await page.setCacheEnabled(false);
    await page.goto('http://localhost:5000/sync.html')
    // page.on('console', msg => {
    //   for (let i = 0; i < msg._args.length; ++i)
    //     console.log(`${i}: ${msg._args[i]}`);
    // });
  })
  it('crosshairs synced on click', async () => {
    x = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // blue
      }
      nv1 = new niivue.Niivue(opts = opts)
      nv1.attachTo('gl1')
      nv2 = new niivue.Niivue(opts = opts)
      nv2.attachTo('gl2')
      // load one volume object in an array
      var volumeList1 = [
        {
          url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "mni152",
          intensityMin: 0, // not used yet
          intensityMax: 100, // not used yet
          intensityRange: [0, 100], // not used yet
          colorMap: "gray",
          opacity: 100,
          visible: true,
        },
      ]
      var volumeList2 = [
        {
          url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "mni152",
          intensityMin: 0, // not used yet
          intensityMax: 100, // not used yet
          intensityRange: [0, 100], // not used yet
          colorMap: "gray",
          opacity: 100,
          visible: true,
        },
      ]
      nv1.loadVolumes(volumeList1)
      nv2.loadVolumes(volumeList2)
      nv1.syncWith(nv2)
    })
    await page.waitForTimeout(5000)
    await page.mouse.click(100, 200)
    await snapshot()
    return 0
  })
})