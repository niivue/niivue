const fs = require('fs')
const { snapshot, httpServerAddress, seconds } = require('./helpers')
beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})

// let files = fs.readdirSync('../images/nifti_space')
const files = fs.readdirSync('./tests/images/nifti_space')
// let filesArray = []
// files.forEach(file => {
//	filesArray.push([file])
// })
// console.log(filesArray)

test.each(files)('niftispace_%s', async (file) => {
  const retFile = await page.evaluate(async (file) => {
    const nv = new Niivue()
    await nv.attachTo('gl', false)
    // load one volume object in an array
    const volumeList = [
      {
        url: `./images/nifti_space/${file}`,
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return file
  }, file)
  expect(retFile).toBe(file)
  await snapshot()
})
