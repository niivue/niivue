import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue label addLabel', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
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
    nv.addLabel('Insula', { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.CENTER }, [0.0, 0.0, 0.0])
    nv.addLabel(
      'ventral anterior insula',
      { lineWidth: 3.0, textColor: [1.0, 1.0, 0.0, 1.0], lineColor: [1.0, 1.0, 0.0, 1.0] },
      [
        [-33, 13, -7],
        [32, 10, -6]
      ]
    )
    nv.addLabel(
      'dorsal anterior insula',
      { textColor: [0.0, 1.0, 0.0, 1.0], lineWidth: 3.0, lineColor: [0.0, 1.0, 0.0, 1.0] },
      [
        [-38, 6, 2],
        [35, 7, 3]
      ]
    )
    nv.addLabel(
      'posterior insula',
      { textColor: [0.0, 0.0, 1.0, 1.0], lineWidth: 3.0, lineColor: [0.0, 0.0, 1.0, 1.0] },
      [
        [-38, -6, 5],
        [35, -11, 6]
      ]
    )
    nv.addLabel(
      'hippocampus',
      { textColor: [1, 0, 0, 1], lineWidth: 3.0, lineColor: [1, 0, 0, 1] },
      [-25, -15.0, -25.0]
    )
    nv.addLabel(
      'right justified footnote',
      {
        textScale: 0.5,
        textAlignment: niivue.LabelTextAlignment.RIGHT,
        bulletColor: [1.0, 0.0, 1.0, 1.0],
        bulletScale: 0.5
      },
      [0.0, 0.0, 0.0]
    )
    nv.drawScene()
    return nv.document.labels.length
  }, TEST_OPTIONS)
  expect(nlabels).toBe(6)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue label addLabel with anchor', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
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
    nv.addLabel("Top Left", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT, textColor: [1.0, 1.0, 0.0, 1.0], backgroundColor: [1.0, 0.0, 0.0, 0.2] }, undefined, niivue.LabelAnchorPoint.TOPLEFT);
    nv.addLabel("Top Center", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.TOPCENTER);
    nv.addLabel("Top Right", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.TOPRIGHT);
    nv.addLabel("Middle Left", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.MIDDLELEFT);
    nv.addLabel("Middle Center", { textScale: 0.5, textAlignment: niivue.LabelTextAlignment.LEFT, backgroundColor: [0.0, 0.0, 1.0, 0.5] }, undefined, niivue.LabelAnchorPoint.MIDDLECENTER);
    nv.addLabel("Bottom Right", { textScale: 1.0, textAlignment: niivue.LabelTextAlignment.LEFT, backgroundColor: [0.0, 1.0, 0.0, 1.0] }, undefined, niivue.LabelAnchorPoint.BOTTOMRIGHT);
    nv.addLabel("Middle Right", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.MIDDLERIGHT);
    nv.addLabel("Bottom Left", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.BOTTOMLEFT);
    nv.addLabel("Bottom Center", { textScale: 2.0, textAlignment: niivue.LabelTextAlignment.LEFT }, undefined, niivue.LabelAnchorPoint.BOTTOMCENTER);
    nv.drawScene()
    return nv.document.labels.length
  }, TEST_OPTIONS)
  expect(nlabels).toBe(9)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
