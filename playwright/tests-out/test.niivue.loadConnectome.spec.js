'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue load connectome tabular', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
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
        visible: true
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
    }
    nv.loadConnectome(connectome)
    nv.setMeshProperty(0, 'nodeScale', 3)
    nv.setClipPlane([-0.1, 270, 0])
    return nv.getAllLabels().length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nlabels).toBe(4)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadConnectome with labels', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
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
        visible: true
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
    await nv.setMeshProperty(0, 'nodeScale', 3)
    await nv.setClipPlane([-0.1, 270, 0])
    nv.drawScene()
    return nv.getAllLabels().length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nlabels).toBe(4)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadConnectome replace label text', async ({ page }) => {
  const labels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
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
        visible: true
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
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(labels.length).toBe(4)
  ;(0, test_1.expect)(labels[0].text).toEqual('NewRF')
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.loadConnectome.spec.js.map
