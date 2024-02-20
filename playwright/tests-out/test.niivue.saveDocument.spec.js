'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const fs = require('fs')
const path = require('path')
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue saveDocument nifti volume', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    const volumeList = [
      {
        url: './images/mni152.nii.gz',
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      },
      {
        url: './images/hippo.nii.gz',
        volume: { hdr: null, img: null },
        name: 'hippo.nii.gz',
        colormap: 'winter',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    await nv.saveDocument('test-volume.nvd')
  }, test_types_1.TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const data = fs.readFileSync(filePath, { encoding: 'utf-8' })
  try {
    if (typeof data === 'string') {
      const json = JSON.parse(data)
      const doc = index_1.NVDocument.loadFromJSON(json)
      ;(0, test_1.expect)(doc.data.encodedImageBlobs.length).toBe(2)
      ;(0, test_1.expect)(doc.data.opts.sliceType).toBe(2)
      ;(0, test_1.expect)(doc.scene.crosshairPos).toEqual([0.1, 0.2, 0.3])
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})
;(0, test_1.test)('niivue saveDocument mesh mz3', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    const meshList = [
      {
        url: './images/BrainMesh_ICBM152.lh.mz3',
        rgba255: [222, 164, 164, 255]
      }
    ]
    await nv.loadMeshes(meshList)
    // RENDER: 4,
    nv.setSliceType(4)
    await nv.saveDocument('test-mesh.nvd')
  }, test_types_1.TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const data = fs.readFileSync(filePath, { encoding: 'utf-8' })
  try {
    if (typeof data === 'string') {
      const json = JSON.parse(data)
      const doc = index_1.NVDocument.loadFromJSON(json)
      ;(0, test_1.expect)(doc.meshDataObjects.length).toBe(1)
      ;(0, test_1.expect)(doc.data.opts.sliceType).toBe(4)
      ;(0, test_1.expect)(doc.data.opts.show3Dcrosshair).toBe(true)
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})
// # sourceMappingURL=test.niivue.saveDocument.spec.js.map
