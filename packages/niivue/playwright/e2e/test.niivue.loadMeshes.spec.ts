import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { NiivueTestOptions, TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

const defaultLayerOptions = {
  opacity: 1.0,
  colormap: '',
  colormapNegative: '',
  colormapInvert: false,
  useNegativeCmap: false,
  global_min: 0,
  global_max: 0,
  cal_min: 0,
  cal_max: 0,
  cal_minNeg: 0,
  cal_maxNeg: 0,
  isAdditiveBlend: false,
  frame4D: 0,
  nFrame4D: 0,
  values: [],
  isOutlineBorder: false,
  colormapType: 0
}

test('niivue loadMeshes MZ3', async ({ page }) => {
  const nmeshes = await page.evaluate(
    async (testOptions) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue(testOptions as NiivueTestOptions)
      await nv.attachTo('gl')
      const layers = [
        {
          ...testOptions.defaultLayerOptions,
          url: './images/mz3/11ScalarMesh.mz3',
          colormap: 'actc'
        }
      ]
      // const layers = { ...defaultLayerOptions, ...layersList }
      await nv.loadMeshes([{ url: './images/mz3/3Mesh.mz3', layers }])
      return nv.meshes.length
    },
    { ...TEST_OPTIONS, defaultLayerOptions }
  )
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadMeshes MZ3 with double layer', async ({ page }) => {
  const nmeshes = await page.evaluate(
    async (testOptions) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue(testOptions)
      await nv.attachTo('gl')
      const layersList = [
        {
          ...testOptions.defaultLayerOptions,
          url: './images/mz3/16DoubleOverlay_5124x2.mz3',
          colormap: 'actc'
        }
      ]
      await nv.loadMeshes([{ url: './images/mz3/cortex_5124.mz3', layers: layersList }])
      return nv.meshes.length
    },
    { ...TEST_OPTIONS, defaultLayerOptions }
  )
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadMeshes meshes set with visible false should not be visible', async ({ page }) => {
  const nmeshes = await page.evaluate(
    async (testOptions) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue(testOptions)
      await nv.attachTo('gl')
      const layersList = [
        {
          ...testOptions.defaultLayerOptions,
          url: './images/mz3/11ScalarMesh.mz3',
          colormap: 'actc'
        }
      ]
      await nv.loadMeshes([
        { url: './images/mz3/3Mesh.mz3', layers: layersList, visible: false },
        { url: '../demos/images/CIT168.mz3', rgba255: [0, 0, 255, 255], visible: true }
      ])
      return nv.meshes.length
    },
    { ...TEST_OPTIONS, defaultLayerOptions }
  )
  expect(nmeshes).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

// construct an object with file types as keys and an file names as values
const meshFormats = [
  { fileType: 'mz3', fileName: 'BrainMesh_ICBM152.lh.mz3', meshOrVolume: 'mesh' },
  { fileType: 'gifti', fileName: 'Conte69.L.inflated.32k_fs_LR.surf.gii', meshOrVolume: 'mesh' },
  { fileType: 'obj', fileName: 'simplify_brain.obj', meshOrVolume: 'mesh' },
  { fileType: 'vtk', fileName: 'tract.FAT_R.vtk', meshOrVolume: 'mesh' },
  { fileType: 'trk', fileName: 'tract.IFOF_R.trk', meshOrVolume: 'mesh' },
  { fileType: 'tck', fileName: 'tract.SLF1_R.tck', meshOrVolume: 'mesh' },
  { fileType: 'x3d', fileName: 'MolView-sticks-color_38.x3d', meshOrVolume: 'mesh' }
]

for (const file of meshFormats) {
  test(`niivue loadMeshes for file format ${file.fileName}`, async ({ page }) => {
    await page.evaluate(
      async (testOptions) => {
        const nv = new Niivue(testOptions as NiivueTestOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const imageList = [
          {
            url: `./images/${testOptions.file.fileName}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadMeshes(imageList)
      },
      { ...TEST_OPTIONS, file }
    )
    await page.waitForTimeout(1000)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
