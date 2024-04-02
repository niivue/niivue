import { test, expect } from '@playwright/test'
import { Niivue, Connectome, LegacyConnectome } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue load connectome tabular', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        colorbarVisible: false
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.opts.meshXRay = 0.2

    const connectome = {
      name: 'legacyConnectome',
      nodeColormap: 'warm',
      nodeColormapNegative: 'winter',
      nodeMinColor: 2,
      nodeMaxColor: 4,
      nodeScale: 3, // scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
      edgeColormap: 'warm',
      edgeColormapNegative: 'winter',
      edgeMin: 2,
      edgeMax: 6,
      edgeScale: 1,
      nodes: {
        names: ['RF', 'LF', 'RP', 'LP'], // currently unused
        X: [40, -40, 40, -40], // Xmm for each node
        Y: [40, 40, -40, -40], // Ymm for each node
        Z: [30, 20, 50, 50], // Zmm for each node
        Color: [2, 2, 3, 4], // Used to interpolate color
        Size: [2, 2, 3, 4], // Size of node
        prefilled: []
      },
      edges: [1, 2, -3, 4, 0, 1, 0, 6, 0, 0, 1, 0, 0, 0, 0, 1]
    } as LegacyConnectome

    nv.loadConnectome(connectome)
    nv.setMeshProperty(0, 'nodeScale', 3)
    nv.setClipPlane([-0.1, 270, 0])
    return nv.getAllLabels().length
  }, TEST_OPTIONS)
  expect(nlabels).toBe(4)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadConnectome with labels', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        colorbarVisible: false
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.opts.meshXRay = 0.2

    const connectome = {
      name: 'simpleConnectome',
      nodeColormap: 'warm',
      nodeColormapNegative: 'winter',
      nodeMinColor: 2,
      nodeMaxColor: 4,
      nodeScale: 3, // scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
      edgeColormap: 'warm',
      edgeColormapNegative: 'winter',
      edgeMin: 2,
      edgeMax: 6,
      edgeScale: 1,
      nodes: [
        {
          name: 'RF',
          x: 40,
          y: 40,
          z: 30,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: 'LF',
          x: -40,
          y: 40,
          z: 20,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: 'RP',
          x: 40,
          y: -40,
          z: 50,
          colorValue: 3,
          sizeValue: 3
        },
        {
          name: 'LP',
          x: -40,
          y: -40,
          z: 50,
          colorValue: 4,
          sizeValue: 4
        }
      ],
      edges: [
        {
          first: 0,
          second: 1,
          colorValue: 2
        },
        {
          first: 0,
          second: 2,
          colorValue: -3
        },
        {
          first: 0,
          second: 3,
          colorValue: 4
        },
        {
          first: 1,
          second: 3,
          colorValue: 6
        }
      ]
    } as Connectome

    await nv.loadConnectome(connectome)
    await nv.setMeshProperty(0, 'nodeScale', 3)
    await nv.setClipPlane([-0.1, 270, 0])
    nv.drawScene()
    return nv.getAllLabels().length
  }, TEST_OPTIONS)
  expect(nlabels).toBe(4)
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadConnectome replace label text', async ({ page }) => {
  const labels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        colorbarVisible: false
      }
    ]
    await nv.loadVolumes(volumeList)
    nv.opts.meshXRay = 0.2

    const connectome = {
      name: 'simpleConnectome',
      nodeColormap: 'warm',
      nodeColormapNegative: 'winter',
      nodeMinColor: 2,
      nodeMaxColor: 4,
      nodeScale: 3, // scale factor for node, e.g. if 2 and a node has size 3, a 6mm ball is drawn
      edgeColormap: 'warm',
      edgeColormapNegative: 'winter',
      edgeMin: 2,
      edgeMax: 6,
      edgeScale: 1,
      nodes: [
        {
          name: 'RF',
          x: 40,
          y: 40,
          z: 30,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: 'LF',
          x: -40,
          y: 40,
          z: 20,
          colorValue: 2,
          sizeValue: 2
        },
        {
          name: 'RP',
          x: 40,
          y: -40,
          z: 50,
          colorValue: 3,
          sizeValue: 3
        },
        {
          name: 'LP',
          x: -40,
          y: -40,
          z: 50,
          colorValue: 4,
          sizeValue: 4
        }
      ],
      edges: [
        {
          first: 0,
          second: 1,
          colorValue: 2
        },
        {
          first: 0,
          second: 2,
          colorValue: -3
        },
        {
          first: 0,
          second: 3,
          colorValue: 4
        },
        {
          first: 1,
          second: 3,
          colorValue: 6
        }
      ]
    }

    await nv.loadConnectome(connectome)
    // load the connectome again to verify that no new labels are added
    connectome.nodes[0].name = 'NewRF'
    await nv.loadConnectome(connectome)
    nv.setMeshProperty(0, 'nodeScale', 3)
    nv.setClipPlane([-0.1, 270, 0])

    return nv.getAllLabels()
  }, TEST_OPTIONS)
  expect(labels.length).toBe(4)
  expect(labels[0].text).toEqual('NewRF')
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
