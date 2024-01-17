import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue loadMeshes MZ3', async ({ page }) => {
  const nmeshes = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    const layersList = [
      {
        url: './images/mz3/11ScalarMesh.mz3',
        colormap: 'actc'
      }
    ]
    await nv.loadMeshes([{ url: './images/mz3/3Mesh.mz3', layers: layersList }])
    return nv.meshes.length
  })
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadMeshes MZ3 with double layer', async ({ page }) => {
  const nmeshes = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    const layersList = [
      {
        url: './images/mz3/16DoubleOverlay_5124x2.mz3',
        colormap: 'actc'
      }
    ]
    await nv.loadMeshes([{ url: './images/mz3/cortex_5124.mz3', layers: layersList }])
    return nv.meshes.length
  })
  expect(nmeshes).toBe(1)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue loadMeshes meshes set with visible false should not be visible', async ({ page }) => {
  const nmeshes = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    const layersList = [
      {
        url: './images/mz3/11ScalarMesh.mz3',
        colormap: 'actc'
      }
    ]
    await nv.loadMeshes([
      { url: './images/mz3/3Mesh.mz3', layers: layersList, visible: false },
      { url: '../demos/images/CIT168.mz3', rgba255: [0, 0, 255, 255], visible: true }
    ])
    return nv.meshes.length
  })
  expect(nmeshes).toBe(2)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
