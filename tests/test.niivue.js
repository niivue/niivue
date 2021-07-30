const { toMatchImageSnapshot } = require('jest-image-snapshot');
expect.extend({ toMatchImageSnapshot });

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

  it ('nv.loadVolumes(volumeList) -- single', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
            colorMap: "gray",
            opacity: 100,
            visible: true,
          },
        ]
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.volumes).toHaveLength(1)
  })

  it ('nv.loadVolumes(volumeList) -- multiple', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
            colorMap: "gray",
            opacity: 100,
            visible: true,
          },
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
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

  it ('nv = new niivue.Niivue(opts={})', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
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
    await expect(nv.opts.backColor).toEqual([0,0,0,1])
    await expect(nv.opts.crosshairColor).toEqual([1,0,0,1])
    await expect(nv.opts.selectionBoxColor).toEqual([1,1,1,.5])
    await expect(nv.opts.colorBarMargin).toEqual(0.05)
    await expect(nv.opts.briStep).toEqual(1) // deprecated since selection box is used now
    await expect(nv.opts.conStep).toEqual(1) //deprecated since selection box is used now
  })

  it ('nv = new niivue.Niivue(opts=opts)', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0,0,1,1] // green
      }
      nv = new niivue.Niivue(opts=opts)
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
            colorMap: "gray",
            opacity: 100,
            visible: true,
          },
        ]
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.opts.textHeight).toEqual(0.05)
    await expect(nv.opts.crosshairColor).toEqual([0,0,1,1])
  })

  it ('nv.arrayEquals', async () => {
    let nv = null
    val = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let arreq = nv.arrayEquals([1,2,3],[1,2,3])
      return arreq
    })
    await expect(val).toBeTruthy()
  })

  it ('nv.calculateMinMaxVoxIdx(array)', async () => {
    let minmax = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let minmax = nv.calculateMinMaxVoxIdx([10, 1])
      return minmax
    })
    await expect(minmax).toEqual([1, 10])
  })

  it ('nv.sph2cartDeg(azimuth, elevation)', async () => {
    let xyz = await page.evaluate(() => {
      nv = new niivue.Niivue()
      let xyz = nv.sph2cartDeg(42, 42)
      return xyz
    })
    await expect(xyz).toEqual([0.4972609476841367,-0.5522642316338268,-0.6691306063588582])
  })

  it ('nv.clipPlaneUpdate(azimuthElevationDepth)', async () => {
    let clipPlane = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "mni152",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
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

  it ('read RGB --slices', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0,0,1,1] // green
      }
      nv = new niivue.Niivue(opts=opts)
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/ct_perfusion.nii",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "ct perfusion",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
            colorMap: "gray",
            opacity: 100,
            visible: true,
          },
        ]
      nv.loadVolumes(volumeList)
      return nv
    })

    await page.waitForSelector('#gl');          // Method to ensure that the element is loaded
    const canvas2 = await page.$('#gl');
    const image = await canvas2.screenshot();

    expect(image).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent'
    });
  })
 
  it ('read RGB --render', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0,0,1,1] // green
      }
      nv = new niivue.Niivue(opts=opts)
      nv.attachTo('gl')
      
      // load one volume object in an array
      var volumeList = [
          {
            url: "../images/ct_perfusion.nii",//"./RAS.nii.gz", "./spm152.nii.gz",
            volume: {hdr: null, img: null},
            name: "ct perfusion",
            intensityMin: 0, // not used yet
            intensityMax: 100, // not used yet
            intensityRange:[0, 100], // not used yet
            colorMap: "gray",
            opacity: 100,
            visible: true,
          },
        ]
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
      return nv
    })

    await page.waitForSelector('#gl');          // Method to ensure that the element is loaded
    const canvas2 = await page.$('#gl');
    const image = await canvas2.screenshot();

    expect(image).toMatchImageSnapshot({
      failureThreshold: 0.1,
      failureThresholdType: 'percent'
    });
  })
})