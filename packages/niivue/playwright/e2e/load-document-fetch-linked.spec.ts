import { test, expect } from '@playwright/test'
import { Niivue, NVDocument, DEFAULT_OPTIONS, INITIAL_SCENE_DATA } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`Browser log [${msg.type()}]: ${msg.text()}`)
  })
  await page.goto(httpServerAddress)
})

test('niivue load meta-document and fetch linked nifti', async ({ page }) => {
  const result = await page.evaluate(async (testOptions) => {
    const meta = {
      encodedImageBlobs: [],
      imageOptionsArray: [
        {
          name: 'mni152.nii.gz',
          url: './images/mni152.nii.gz',
          colormap: 'gray',
          opacity: 1
        }
      ],
      previewImageDataURL: '',
      opts: { ...DEFAULT_OPTIONS },
      labels: [],
      meshesString: '[]',
      meshOptionsArray: [], // ✅ add this line
      sceneData: { ...INITIAL_SCENE_DATA },
      encodedDrawingBlob: '',
      customData: '',
      title: 'meta'
    }

    const doc = NVDocument.loadFromJSON(meta)
    await doc.fetchLinkedData()

    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    await nv.loadDocument(doc)

    const back = nv.back
    const dims = back?.dims ?? []

    return {
      hasBlob: doc.encodedImageBlobs.length === 1,
      nVolumes: nv.volumes.length,
      dims
    }
  }, TEST_OPTIONS)

  expect(result.hasBlob).toBe(true)
  expect(result.nVolumes).toBe(1)
  expect(Array.isArray(result.dims)).toBe(true)
  expect(result.dims.length).toBe(4)

  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 60000 })
})
