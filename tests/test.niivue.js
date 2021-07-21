const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const path = require('path')
const srcScreenshotsDir = './tests/src_screenshots'
const refScreenshotsDir = './tests/ref_screenshots'
const difScreenshotsDir = './tests/dif_screenshots'

/**
 * uses puppeteer's "page" to capture a screenshot, then uses pixelmatch to compare 
 * the current screenshot to a reference 
 * @param {string} screenshotName 
 * @returns ndiff
 */
async function captureAndCompare(screenshotName) {
  let screenshotRef = path.join(refScreenshotsDir, screenshotName)
  let screenshotSrc = path.join(srcScreenshotsDir, screenshotName)
  let screenshotDif = path.join(difScreenshotsDir, 'diff_' + screenshotName)
  await page.screenshot({ path: screenshotSrc }); // src_screenshots is not committed to github. It is is gitignore
  if (!fs.existsSync(screenshotRef)) {
    console.log(`*** WARNING *** no reference screenshot exists for ${screenshotName}. If running in CI, download the artifacts from Github and add a new reference image if needed. If running locally, you should add this reference image.`)
    return -1 // anything other than 0 will be an error
  }
  const ref = PNG.sync.read(fs.readFileSync(screenshotRef));
  const src = PNG.sync.read(fs.readFileSync(screenshotSrc));
  const { width, height } = ref;
  const diff = new PNG({ width, height });
  // returns number of different pixels
  var ndiff = pixelmatch(ref.data, src.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(screenshotDif, PNG.sync.write(diff));
  return ndiff
}


describe('Niivue', () => {
  // start a new page for each test below.
  // A server is started prior to navigating to this location
  beforeEach(async () => {
    await page.goto('http://localhost:5000/index.html')
  })

  // notice that the test cases use async functions
  // if you want to evaluate (run) a niivue method then do it like this:
  it('nv = new niivue.Niivue()', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      return nv // return the Niivue instance so that we can run assertion tests on it outside of this local function
    })
    await expect(nv).toBeDefined()
  })

  it('nv.attachTo("gl")', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      return nv
    })
    await expect(nv.gl).toBeDefined()
  })

  it('nv.loadVolumes(volumeList) -- single', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
      nv.loadVolumes(volumeList)
      return nv
    })
    await expect(nv.volumes).toHaveLength(1)
    await page.waitForTimeout(10000) // 10 secs is more than enough to render the mni152 image
    // the default page size is 800x600. screenshots will have those dimensions.
    // I (Taylor) have tested that a screenshot generated on my 2015 retina macbook, and
    // a screenshot generated on the github CI runner have 0% pixel difference. They are identical. 
    // given this, it seems ok to generate the reference set of screenshots locally, and add them to the repo. 
    // Then the github CI runner screenshots will be compared to a reference within each relevant test (i.e. all tests that need screenshots)
    let screenshotName = 'mni152_render.png'
    ndiff = await captureAndCompare(screenshotName)

    await expect(ndiff).toEqual(0)
  },
    15000) // wait for 15 seconds, this needs to be more than the page.waitForTimeout time.

  it('nv.loadVolumes(volumeList) -- multiple', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "mni152",
          intensityMin: 0, // not used yet
          intensityMax: 100, // not used yet
          intensityRange: [0, 100], // not used yet
          colorMap: "gray",
          opacity: 100,
          visible: true,
        },
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.volumes).toHaveLength(2)
  })

  it('nv = new niivue.Niivue(opts={})', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.opts.textHeight).toEqual(0.03)
    await expect(nv.opts.colorbarHeight).toEqual(0.05)
    await expect(nv.opts.crosshairWidth).toEqual(1)
    await expect(nv.opts.backColor).toEqual([0, 0, 0, 1])
    await expect(nv.opts.crosshairColor).toEqual([1, 0, 0, 1])
    await expect(nv.opts.selectionBoxColor).toEqual([1, 1, 1, .5])
    await expect(nv.opts.colorBarMargin).toEqual(0.05)
    await expect(nv.opts.briStep).toEqual(1) // deprecated since selection box is used now
    await expect(nv.opts.conStep).toEqual(1) //deprecated since selection box is used now
  })

  it('nv = new niivue.Niivue(opts=opts)', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.opts.textHeight).toEqual(0.05)
    await expect(nv.opts.crosshairColor).toEqual([0, 0, 1, 1])
  })

  it('nv.arrayEquals', async () => {
    let nv = null
    val = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3])
      return arreq
    })
    await expect(val).toBeTruthy()
  })

  it('nv.calculateMinMaxVoxIdx(array)', async () => {
    let minmax = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let minmax = nv.calculateMinMaxVoxIdx([10, 1])
      return minmax
    })
    await expect(minmax).toEqual([1, 10])
  })

  it('nv.sph2cartDeg(azimuth, elevation)', async () => {
    let xyz = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let xyz = nv.sph2cartDeg(42, 42)
      return xyz
    })
    await expect(xyz).toEqual([0.4972609476841367, -0.5522642316338268, -0.6691306063588582])
  })

  it('nv.clipPlaneUpdate(azimuthElevationDepth)', async () => {
    let clipPlane = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
        {
          url: "./data/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
      nv.loadVolumes(volumeList)
      nv.sliceType = nv.sliceTypeRender // ensure render mode is activated 
      nv.clipPlaneUpdate([42, 42, 0.5])
      return nv.scene.clipPlane
    })
    await expect(clipPlane).toEqual(
      [
        0.4972609476841367,
        -0.5522642316338268,
        -0.6691306063588582,
        0.5
      ]
    )
  })
})