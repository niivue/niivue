import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import { Niivue, NVDocument } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue saveDocument nifti volume', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
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
  }, TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const data = fs.readFileSync(filePath, { encoding: 'utf-8' })
  try {
    if (typeof data === 'string') {
      const json = JSON.parse(data)
      const doc = NVDocument.loadFromJSON(json)
      expect(doc.data.encodedImageBlobs.length).toBe(2)
      expect(doc.data.opts.sliceType).toBe(2)
      expect(doc.scene.crosshairPos).toEqual([0.1, 0.2, 0.3])
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})

test('niivue saveDocument mesh mz3', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
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
  }, TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const data = fs.readFileSync(filePath, { encoding: 'utf-8' })
  try {
    if (typeof data === 'string') {
      const json = JSON.parse(data)
      const doc = NVDocument.loadFromJSON(json)
      expect(doc.meshDataObjects!.length).toBe(1)
      expect(doc.data.opts.sliceType).toBe(4)
      expect(doc.data.opts.show3Dcrosshair).toBe(true)
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})
