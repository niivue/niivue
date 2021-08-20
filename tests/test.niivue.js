const { toMatchImageSnapshot } = require('jest-image-snapshot');
const { onErrorResumeNext } = require('rxjs/operators');
expect.extend({ toMatchImageSnapshot });

async function snapshot() {
  await page.waitForSelector('#gl');          // Method to ensure that the element is loaded
  await page.waitForTimeout(1000) // wait a little longer to ensure image loaded (some images were not loading in time)
  const canvas2 = await page.$('#gl');
  const image = await canvas2.screenshot();

  expect(image).toMatchImageSnapshot({
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
  });
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
    await snapshot() // will be blank as expected
  })

  it('nv.loadVolumes(volumeList) -- single', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.volumes).toHaveLength(1)
    await snapshot()
  })

  it('overlay', async () => {
    let nv = null
    nv = await page.evaluate(async () => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
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
        {
          url: "../images/hippo.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "hippo",
          intensityMin: 0, // not used yet
          intensityMax: 100, // not used yet
          intensityRange: [0, 100], // not used yet
          colorMap: "Winter",
          opacity: 100,
          visible: true,
        },
      ]
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      await wait(2 * 1000).then(() => {
      });
      return nv
    })

    await expect(nv.volumes).toHaveLength(2)
    // await page.waitForTimeout(5000)
    await snapshot()
  })

  it('nv = new niivue.Niivue(opts={})', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
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
    await snapshot()
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await expect(nv.opts.textHeight).toEqual(0.05)
    await expect(nv.opts.crosshairColor).toEqual([0, 0, 1, 1])
    await snapshot()
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
          url: "../images/mni152.nii.gz",
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

    await snapshot()
  })

  it('read RGB --slices', async () => {
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
          url: "../images/ct_perfusion.nii",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "ct perfusion",
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

    await snapshot()

  })

  it('read RGB --render', async () => {
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
          url: "../images/ct_perfusion.nii",//"./RAS.nii.gz", "./spm152.nii.gz",
          volume: { hdr: null, img: null },
          name: "ct perfusion",
          intensityMin: 0, // not used yet
          intensityMax: 100, // not used yet
          intensityRange: [0, 100], // not used yet
          colorMap: "gray",
          opacity: 100,
          visible: true,
        },
      ]
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
      return nv
    })

    await snapshot()

  })

  it('mouse left click focuses crosshair', async () => {
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await page.waitForTimeout(500)
    await page.mouse.click(100, 200)
    // take a snapshot for comparison
    await snapshot()

  })

  it('mouse right click and drag draws selection box', async () => {
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await page.waitForTimeout(500)
    await page.mouse.move(100, 200)
    await page.mouse.click(100, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(130, 230)
    // await page.mouse.up({button: 'right'})
    // take a snapshot for comparison
    await snapshot()

  })

  it('selectionbox disabled in 3D', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
      return nv
    })

    await page.waitForTimeout(500)
    await page.mouse.move(100, 200)
    await page.mouse.click(100, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(130, 230)
    // await page.mouse.up({button: 'right'})
    // take a snapshot for comparison
    await snapshot()

  })

  it('mouse right click and drag sets intensity range', async () => {
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await page.waitForTimeout(500)
    await page.mouse.move(100, 200)
    await page.mouse.click(100, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(130, 230)
    await page.mouse.up({ button: 'right' })
    // take a snapshot for comparison
    await snapshot()

  })

  it('reset brightness and contrast', async () => {
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
      nv.loadVolumes(volumeList)
      return nv
    })

    await page.waitForTimeout(500)
    // change intensity of image by selecting a region
    await page.mouse.move(100, 200)
    await page.mouse.click(100, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(130, 230)
    await page.mouse.up({ button: 'right' })
    // now double click to reset the intensity change we just created
    // a double left click triggers a reset
    await page.mouse.click(100, 200, { clickCount: 2 })
    // take a snapshot for comparison
    await snapshot()

  })

  it('set selection box color', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSelectionBoxColor([0, 1, 0, 1]) // green (rgba)
      return nv
    })

    await page.waitForTimeout(500)
    // change intensity of image by selecting a region
    await page.mouse.move(100, 200)
    await page.mouse.click(100, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(130, 230)

    await expect(nv.opts.selectionBoxColor).toEqual([0, 1, 0, 1])
    // take a snapshot for comparison
    await snapshot()

  })

  it('set crosshair color', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setCrosshairColor([0, 1, 0, 1]) // green (rgba)
      return nv
    })
    await expect(nv.opts.crosshairColor).toEqual([0, 1, 0, 1])
    // take a snapshot for comparison
    await snapshot()

  })

  it('mouse wheel changes slices in 2D view', async () => {
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
      nv.loadVolumes(volumeList)
      return nv
    })
    await page.waitForTimeout(500)
    await page.mouse.move(100, 200)
    for (var i = 0; i < 20; i++) {
      await page.mouse.wheel({
        deltaY: -1
      })
    }
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets slice type axial', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeAxial)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets slice type coronal', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeCoronal)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets slice type sagittal', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeSagittal)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets slice type render', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets volume opacity', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setOpacity(0, 0.2) // 0 is backgroun image (first in list)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('sets volume scale in render mode', async () => {
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
      nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
      nv.setScale(0.5)
      return nv
    })
    // take a snapshot for comparison
    await snapshot()

  })

  it('vox2mm', async () => {
    let mm = []
    mm = await page.evaluate(() => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      nv.loadVolumes(volumeList)
      let vox = [103, 128, 129]
      let xfm = [
        0.7375, 0, 0, -75.76,
        0, 0.7375, 0, -110.8,
        0, 0, 0.7375, -71.76,
        0, 0, 0, 1
      ]
      let mm = nv.vox2mm(vox, xfm)
      return [mm[0], mm[1], mm[2]]
    })
    // console.log(mm)
    expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
    for (let i=0; i<mm.length; i++){
      await expect(mm[i]).toBeCloseTo(expected[i])
    }
  })

  it('calMinMax do not trust cal min max', async () => {
    let minmax = null
    minmax = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1], // green
        trustCalMinMax: false
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let minmax = await wait(2 * 1000).then(() => {
        let overlayItem = nv.volumes[0]
        console.log(overlayItem)
        let hdr = overlayItem.volume.hdr
        let img = overlayItem.volume.img
        let imgRaw
        if (hdr.datatypeCode === 2) {
          imgRaw = new Uint8Array(img);
        } else if (hdr.datatypeCode === 4) {
          imgRaw = new Int16Array(img);
        } else if (hdr.datatypeCode === 16) {
          imgRaw = new Float32Array(img);
        } else if (hdr.datatypeCode === 64) {
          imgRaw = new Float64Array(img)
        } else if (hdr.datatypeCode === 128) {
          imgRaw = new Uint8Array(img);
        } else if (hdr.datatypeCode === 512) {
          imgRaw = new Uint16Array(img);
        } else if (hdr.datatypeCode === 2304) {
          imgRaw = new Uint8Array(img);
        }
        let minmax = nv.calMinMax(overlayItem, imgRaw)
        return minmax
      });
      return minmax
    })
    console.log(minmax)
    expected = [40, 80, 0, 91.46501398086548]
    for (let i=0; i<minmax.length; i++){
      await expect(minmax[i]).toBeCloseTo(expected[i])
    }
  })

  it('calMinMax trust cal min max', async () => {
    let minmax = null
    minmax = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let minmax = await wait(2 * 1000).then(() => {
        let overlayItem = nv.volumes[0]
        console.log(overlayItem)
        let hdr = overlayItem.volume.hdr
        let img = overlayItem.volume.img
        let imgRaw
        if (hdr.datatypeCode === 2) {
          imgRaw = new Uint8Array(img);
        } else if (hdr.datatypeCode === 4) {
          imgRaw = new Int16Array(img);
        } else if (hdr.datatypeCode === 16) {
          imgRaw = new Float32Array(img);
        } else if (hdr.datatypeCode === 64) {
          imgRaw = new Float64Array(img)
        } else if (hdr.datatypeCode === 128) {
          imgRaw = new Uint8Array(img);
        } else if (hdr.datatypeCode === 512) {
          imgRaw = new Uint16Array(img);
        } else if (hdr.datatypeCode === 2304) {
          imgRaw = new Uint8Array(img);
        }
        let minmax = nv.calMinMax(overlayItem, imgRaw)
        return minmax
      });
      return minmax
    })
    console.log(minmax)
    expected = [40, 80, 40, 80]
    for (let i=0; i<minmax.length; i++){
      await expect(minmax[i]).toBeCloseTo(expected[i])
    }
  })

  it('mm2frac', async () => {
    let frac = null
    frac = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let frac = await wait(2 * 1000).then(() => {
        let mm = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
        let frac = nv.mm2frac(mm)
        return frac
      });
      return frac
    })
    console.log(frac)
    expected = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
    for (let i=0; i<frac.length; i++){
      await expect(frac[i]).toBeCloseTo(expected[i])
    }
  })


  it('vox2frac', async () => {
    let frac = null
    frac = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let frac = await wait(2 * 1000).then(() => {
        let vox = [103, 128, 129]
        let frac = nv.vox2frac(vox)
        return frac
      });
      return frac
    })
    expected = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
    for (let i=0; i<frac.length; i++){
      await expect(frac[i]).toBeCloseTo(expected[i])
    }
  })

  it('frac2vox', async () => {
    let vox = null
    vox = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let vox = await wait(2 * 1000).then(() => {
        let frac = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
        let vox = nv.frac2vox(frac)
        return vox
      });
      return vox
    })
    let expected = [103, 128, 129]
    for (let i=0; i<vox.length; i++){
      await expect(vox[i]).toBeCloseTo(expected[i])
    }
  })

  it('frac2mm', async () => {
    let mm = null
    mm = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let mm = await wait(2 * 1000).then(() => {
        let frac = [0.5000415009576917, 0.5017796754837036, 0.6023715706758721]
        let mm = nv.frac2mm(frac)
        return mm
      });
      return mm
    })
    let expected = [0.20249909162521362, -16.400001525878906, 23.377498626708984]
    for (let i=0; i<mm.length; i++){
      await expect(mm[i]).toBeCloseTo(expected[i])
    }
  })

  it('canvasPos2frac', async () => {
    let frac = null
    frac = await page.evaluate(async () => {
      let opts = {
        textHeight: 0.05, // larger text
        crosshairColor: [0, 0, 1, 1] // green
      }
      nv = new niivue.Niivue(opts = opts)
      nv.attachTo('gl')

      // load one volume object in an array
      var volumeList = [
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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      nv = nv.loadVolumes(volumeList)
      let frac = await wait(2 * 1000).then(() => {
        let pos = [100, 200]
        let frac = nv.canvasPos2frac(pos)
        return frac
      });
      return frac
    })
    let expected = [ 0.4045893719806762, 0.5, 0.5 ]
    for (let i=0; i<frac.length; i++){
      await expect(frac[i]).toBeCloseTo(expected[i])
    }
  })

  it('clip plane is rendered when it is set to visible', async () => {
    jest.setTimeout(30000); // long running test
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
      nv.loadVolumes(volumeList)
      nv.sliceType = nv.sliceTypeRender;
      nv.clipPlaneObject3D.isVisible = true;
      return nv
    })

    await page.waitForTimeout(500)
    // take a snapshot for comparison
    await snapshot()

  })

  it('volume is properly clipped in sagittal plane', async () => {
    jest.setTimeout(30000); // long running test
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
      nv.loadVolumes(volumeList)
      nv.sliceType = nv.sliceTypeRender;
      nv.clipPlaneObject3D.isVisible = true;
      nv.scene.clipPlane = [1, 0, 0, 0];
      nv.clipPlaneObject3D.rotation = [0, 1, 0];

      return nv
    })

    await page.waitForTimeout(500)
    // take a snapshot for comparison
    await snapshot()

  })

  it('volume is properly clipped in axial plane', async () => {
    jest.setTimeout(30000); // long running test
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
      nv.loadVolumes(volumeList)
      nv.sliceType = nv.sliceTypeRender;
      nv.clipPlaneObject3D.isVisible = true;
      nv.scene.clipPlane = [0, 1, 0, 0];
      nv.clipPlaneObject3D.rotation = [1, 0, 0];

      return nv
    })

    await page.waitForTimeout(500)
    // take a snapshot for comparison
    await snapshot()

  })

  it('volume is properly clipped in coronal plane', async () => {
    jest.setTimeout(30000); // long running test
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
      nv.loadVolumes(volumeList)
      nv.sliceType = nv.sliceTypeRender;
      nv.clipPlaneObject3D.isVisible = true;
      nv.scene.clipPlane = [0, 0, 1, 0];
      nv.clipPlaneObject3D.rotation = [0, 0, 1];

      return nv
    })

    await page.waitForTimeout(500)
    // take a snapshot for comparison
    await snapshot()

  })
})