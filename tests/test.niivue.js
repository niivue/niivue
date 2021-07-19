//import 'expect-puppeteer'

describe('Niivue', () => {
  beforeEach(async () => {
    await page.goto('http://localhost:5000/index.html')
  })

  it('title should be niivue test', async () => {
    let title = await page.title()
    await expect(title).toMatch('niivue test')
  })

  it('should create a Niivue instance', async () => {
    let nv = null
    nv = await page.evaluate(() => {
      nv = new niivue.Niivue()
      return nv
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
            url: "./mni152.nii.gz",//"./RAS.nii.gz", "./spm152.nii.gz",
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