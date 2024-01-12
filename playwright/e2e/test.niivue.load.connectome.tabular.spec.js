import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue load connectome tabular', async ({ page }) => {
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
        Size: [2, 2, 3, 4] // Size of node
      },
      edges: [1, 2, -3, 4, 0, 1, 0, 6, 0, 0, 1, 0, 0, 0, 0, 1]
    }

    await nv.loadConnectome(connectome)
    nv.setMeshProperty(nv.meshes[0].id, 'nodeScale', 3)
    nv.setClipPlane([-0.1, 270, 0])
    return nv.getAllLabels().length
  })
  expect(nlabels).toBe(4)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
