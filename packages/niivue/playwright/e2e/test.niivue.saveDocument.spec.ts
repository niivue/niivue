import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '@playwright/test'
import { Niivue, NVDocument } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue saveDocument nifti volume', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
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

test('niivue saveDocument customData', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
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
    nv.document.customData = 'test message'
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
      expect(doc.customData).toBe('test message')
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})

test('niivue saveDocument clipVolume', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue({
      ...testOptions,
      clipThick: 0.42,
      clipVolumeLow: [0.46, 0.42, 0.31],
      clipVolumeHigh: [0.76, 0.73, 0.75]
    })
    await nv.attachTo('gl')
    const volumeList = [
      { url: './images/mni152.nii.gz', cal_min: 30, cal_max: 80 },
      { url: './images/spmMotor.nii.gz', cal_min: 3, cal_max: 8, colormap: 'warm' }
    ]
    await nv.loadVolumes(volumeList)
    await nv.saveDocument('test-clip-volume.nvd')
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
      expect(doc.opts.clipThick).toBe(0.42)
      expect(doc.opts.clipVolumeLow).toBe([0.46, 0.42, 0.31])
      expect(doc.opts.clipVolumeHigh).toBe([0.76, 0.73, 0.75])
    } else {
      throw new Error('NVDocument not correctly encoded')
    }
  } catch {}
  fs.unlinkSync(filePath)
})

test.skip('niivue saveDocument and loadDocument', async ({ page }) => {
  test.setTimeout(120000)
  const downloadPromise = page.waitForEvent('download')
  await page.evaluate(async (testOptions) => {
    const NVMeshLayerDefaults = {
      colormap: 'gray',
      opacity: 0.0,
      nFrame4D: 0,
      frame4D: 0,
      outlineBorder: 0,
      cal_min: 0,
      cal_max: 0,
      cal_minNeg: 0,
      cal_maxNeg: 0,
      values: new Array<number>()
    }

    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    nv.setClipPlane([-0.12, 180, 40])
    nv.setRenderAzimuthElevation(230, 15)
    nv.setSliceType(nv.sliceTypeMultiplanar)
    nv.opts.multiplanarForceRender = true
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
    const meshLayersList1 = [
      {
        ...NVMeshLayerDefaults,
        url: './images/pval.LH.nii.gz',
        cal_min: 25,
        cal_max: 35.0,
        opacity: 1
      }
    ]
    await nv.loadMeshes([
      {
        url: './images/lh.pial',
        rgba255: [212, 244, 212, 255],
        layers: meshLayersList1
      },
      { url: './images/dpsv.trx' },
      { url: './images/TR_S_R.tt.gz' },
      { url: './images/connectome.jcon' }
    ])

    nv.setSelectionBoxColor([0, 1, 0, 0.5])
    nv.setClipPlane([0.2, 0, 120])
    await nv.saveDocument('test-save-load.nvd')
  }, TEST_OPTIONS)
  const download = await downloadPromise
  const downloadPath = path.resolve('./downloads')
  const filePath = path.join(downloadPath, download.suggestedFilename())
  await download.saveAs(filePath)
  const documentText = fs.readFileSync(filePath, { encoding: 'utf-8' })
  const documentJSON = JSON.parse(documentText)
  await page.evaluate(
    async (testFileOptions) => {
      const nv = new Niivue(testFileOptions.options)
      await nv.attachTo('gl')
      // eslint-disable-next-line no-eval
      const nvDocument = eval('niivue.NVDocument')
      const doc = nvDocument.loadFromJSON(testFileOptions.documentJSON)
      nv.loadDocument(doc)
    },
    { options: TEST_OPTIONS, documentJSON }
  )
  await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 120000 })
  fs.unlinkSync(filePath)
})
