//import 'expect-puppeteer'

describe('Niivue', () => {
  // start a new page for each test below.
  // A server is started prior to navigating to this location
  beforeEach(async () => {
    await page.goto('http://localhost:5000/index.html')
  })

  // notice that the test cases use async functions
  // if you want to evaluate (run) a niivue method then do it like this:
  it('should create a Niivue instance', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      return nv // return the Niivue instance so that we can run assertion tests on it outside of this local function
    })
    await expect(nv).toBeDefined()
  })

  it('should attach to canvas element with id=gl', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      return nv
    })
    await expect(nv.gl).toBeDefined()
  })

  it ('should load an array of volume objects', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      nv.attachTo('gl')
      // load one volume object in an array
      var volumeList = [
          {
            url: "./images/mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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
})