import { test, expect } from '@playwright/test'
import { Niivue, LabelTextAlignment, LabelLineTerminator, LabelAnchorPoint } from '../../dist/index.js'
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
    nv.addLabel(
      'Insula',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.CENTER,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      [0, 0, 0]
    )

    nv.addLabel(
      'ventral anterior insula',
      {
        lineWidth: 3.0,
        textColor: [1, 1, 0, 1],
        lineColor: [1, 1, 0, 1],
        textScale: 0,
        lineTerminator: LabelLineTerminator.NONE
      },
      [
        [-33, 13, -7],
        [32, 10, -6]
      ]
    )

    nv.addLabel(
      'dorsal anterior insula',
      {
        lineWidth: 3.0,
        textColor: [0, 1, 0, 1],
        lineColor: [0, 1, 0, 1],
        textScale: 0,
        lineTerminator: LabelLineTerminator.NONE
      },
      [
        [-38, 6, 2],
        [35, 7, 3]
      ]
    )

    nv.addLabel(
      'posterior insula',
      {
        lineWidth: 3.0,
        textColor: [0, 0, 1, 1],
        lineColor: [0, 0, 1, 1],
        textScale: 0,
        lineTerminator: LabelLineTerminator.NONE
      },
      [
        [-38, -6, 5],
        [35, -11, 6]
      ]
    )

    nv.addLabel(
      'hippocampus',
      {
        lineWidth: 3.0,
        textColor: [1, 0, 0, 1],
        lineColor: [1, 0, 0, 1],
        textScale: 0,
        lineTerminator: LabelLineTerminator.NONE
      },
      [-25, -15, -25]
    )

    nv.addLabel(
      'right justified footnote',
      {
        textScale: 0.5,
        textAlignment: LabelTextAlignment.RIGHT,
        bulletColor: [1, 0, 1, 1],
        bulletScale: 0.5,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      [0, 0, 0]
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
    nv.addLabel(
      'Top Left',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [1.0, 1.0, 0.0, 1.0],
        backgroundColor: [1.0, 0.0, 0.0, 0.2],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.TOPLEFT
    )
    nv.addLabel(
      'Top Center',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.TOPCENTER
    )
    nv.addLabel(
      'Top Right',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.TOPRIGHT
    )
    nv.addLabel(
      'Middle Left',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.MIDDLELEFT
    )
    nv.addLabel(
      'Middle Center',
      {
        textScale: 0.5,
        textAlignment: LabelTextAlignment.LEFT,
        backgroundColor: [0.0, 0.0, 1.0, 0.5],
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.MIDDLECENTER
    )
    nv.addLabel(
      'Bottom Right',
      {
        textScale: 1.0,
        textAlignment: LabelTextAlignment.LEFT,
        backgroundColor: [0.0, 1.0, 0.0, 1.0],
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.BOTTOMRIGHT
    )
    nv.addLabel(
      'Middle Right',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.MIDDLERIGHT
    )
    nv.addLabel(
      'Bottom Left',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.BOTTOMLEFT
    )
    nv.addLabel(
      'Bottom Center',
      {
        textScale: 2.0,
        textAlignment: LabelTextAlignment.LEFT,
        textColor: [],
        lineWidth: 0,
        lineColor: [],
        lineTerminator: LabelLineTerminator.NONE
      },
      undefined,
      LabelAnchorPoint.BOTTOMCENTER
    )
    nv.drawScene()
    return nv.document.labels.length
  }, TEST_OPTIONS)
  expect(nlabels).toBe(9)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue label onClick receives MouseEvent with right-click', async ({ page }) => {
  await page.goto(httpServerAddress)

  const rightClickHandled = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')

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

    const label = nv.addLabel(
      'RightClickTest',
      {
        textScale: 1.5,
        textColor: [1, 1, 1, 1],
        backgroundColor: [0, 0, 0, 0.5],
        lineWidth: 1,
        lineColor: [1, 1, 1, 1],
        textAlignment: LabelTextAlignment.CENTER,
        lineTerminator: LabelLineTerminator.NONE
      },
      [0, 0, 0]
    )

    return await new Promise((resolve) => {
      label.onClick = (_label, e) => {
        resolve(e?.button === 2)
      }

      const rect = nv.canvas.getBoundingClientRect()
      const evt = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2 // right-click
      })
      nv.canvas.dispatchEvent(evt)
    })
  }, TEST_OPTIONS)

  expect(rightClickHandled).toBe(true)
})
