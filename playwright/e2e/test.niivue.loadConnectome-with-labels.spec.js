import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadConnectome with labels', async ({ page }) => {
  const nlabels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl', false)
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
    await nv.setMeshProperty(nv.meshes[0].id, 'nodeScale', 3)
    await nv.setClipPlane([-0.1, 270, 0])
    nv.drawScene()
    return nv.getAllLabels().length
  })
  expect(nlabels).toBe(4)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadConnectome replace label text', async ({ page }) => {
  const labels = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue({ ...testOptions, show3Dcrosshair: true, isColorbar: true })
    nv.opts.multiplanarForceRender = true
    await nv.attachTo('gl', false)
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
    nv.setMeshProperty(nv.meshes[0].id, 'nodeScale', 3)
    nv.setClipPlane([-0.1, 270, 0])

    return nv.getAllLabels()
  })
  expect(labels.length).toBe(4)
  expect(labels[0].text).toEqual('NewRF')
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
