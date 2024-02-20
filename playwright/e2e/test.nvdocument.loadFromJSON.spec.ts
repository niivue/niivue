import { test, expect } from '@playwright/test'
import { DocumentData, Niivue, NVDocument } from '../../dist/index'
import { httpServerAddress } from './helpers'
import { TEST_OPTIONS } from './test.types'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('nvdocument loadFromJSON', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
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
    const data = nv.document.json()
    const document = NVDocument.loadFromJSON({
      ...data,
      title: 'no titile',
      meshOptionsArray: []
    } as DocumentData)
    nv.volumes.length = 0
    nv.loadDocument(document)
    nv.drawScene()
    nv.gl.finish()
    return nv.volumes.length
  }, TEST_OPTIONS)
  expect(nvols).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
