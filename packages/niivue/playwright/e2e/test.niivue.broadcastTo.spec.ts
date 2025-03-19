import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddressSync } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddressSync)
})

test('niivue broadcastTo', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv1 = new Niivue(testOptions)
    await nv1.attachTo('gl1')
    await nv1.attachTo('gl1')
    const nv2 = new Niivue(testOptions)
    await nv2.attachTo('gl2')
    const volumeList = [
      {
        url: './images/mni152.nii.gz',
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv1.loadVolumes(volumeList)
    await nv2.loadVolumes(volumeList)
    nv1.broadcastTo(nv2)
  }, TEST_OPTIONS)

  await page.mouse.click(100, 200)
  await expect(page).toHaveScreenshot({ timeout: 30000, fullPage: true })
})

test('niivue broadcastTo can be turned off', async ({ page }) => {
  const scenesHandle = await page.evaluateHandle(async (testOptions) => {
    const panTestOptions = { ...testOptions, dragMode: 3 }
    const nv1 = new Niivue(panTestOptions)
    await nv1.attachTo('gl1')
    await nv1.attachTo('gl1')
    const nv2 = new Niivue(panTestOptions)
    await nv2.attachTo('gl2')
    const volumeList = [
      {
        url: './images/mni152.nii.gz',
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv1.loadVolumes(volumeList)
    await nv2.loadVolumes(volumeList)
    nv1.broadcastTo(nv2)
    nv1.broadcastTo(nv2, { '2d': false, '3d': false })
    nv1.setPan2Dxyzmm([5, -4, 2, 1.5])
    return [nv1.scene, nv2.scene]
  }, TEST_OPTIONS)

  let scenes = await scenesHandle.jsonValue()
  expect(scenes[0].crosshairPos[0]).toBe(scenes[1].crosshairPos[0])
  expect(scenes[0].crosshairPos[1]).toBe(scenes[1].crosshairPos[1])
  expect(scenes[0].pan2Dxyzmm).toEqual(expect.arrayContaining([...Array.from(scenes[1].pan2Dxyzmm)]))
  await page.mouse.click(100, 200)
  scenes = await scenesHandle.jsonValue()
  expect(Object.values(scenes[0].pan2Dxyzmm)).toEqual(expect.arrayContaining([5, -4, 2, 1.5]))
  expect(scenes[0].crosshairPos[0]).not.toBe(scenes[1].crosshairPos[0])
  expect(scenes[0].crosshairPos[1]).not.toBe(scenes[1].crosshairPos[1])
  expect(Object.values(scenes[1].pan2Dxyzmm)).toEqual(expect.arrayContaining([0, 0, 0, 1]))
  await scenesHandle.dispose()
})
