const path = require('path')
const fs = require('fs')
const { waitForDownload } = require('puppeteer-utilz')
const { httpServerAddress, ensureDownloadFolder } = require('./helpers')

const downloadPath = path.resolve('./downloads')
const fileName = 'test.nii'

function getFilesizeInBytes(filename) {
  const stats = fs.statSync(filename)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}

beforeEach(async () => {
  ensureDownloadFolder()
  await page.goto(httpServerAddress, { timeout: 0 })
  const client = await page.target().createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath
  })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})
test.skip('saveImage', async () => {
  await page.evaluate(async () => {
    const nv = new Niivue()
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    await nv.saveImage('test.nii')
  })

  // // wait until we navigate or the test will not wait for the downloaded file
  // await page.goto(httpServerAddress, {waitUntil: 'networkidle2'});
  const filePath = path.join(downloadPath, fileName)
  waitForDownload(downloadPath)
  const fileSize = getFilesizeInBytes(filePath)
  expect(fileSize).toBeGreaterThan(4336029)
  fs.unlinkSync(filePath)
})
