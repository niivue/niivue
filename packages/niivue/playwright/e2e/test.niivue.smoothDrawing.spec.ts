import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue smooth drawing disabled renders discrete voxels in 3D', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const nv = new Niivue({ ...testOptions, smoothDrawing: 0 })
        await nv.attachTo('gl')
        await nv.loadVolumes([{ url: './images/mni152.nii.gz', colormap: 'gray', opacity: 1 }])
        nv.drawOtsu(2)
        nv.setSliceType(nv.sliceTypeRender)
        nv.setClipPlane([0.1, 270, 0])
        nv.drawScene()
        nv.gl.finish()
    }, TEST_OPTIONS)
    await page.waitForTimeout(1000)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue smooth drawing enabled renders smooth isosurface in 3D', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const nv = new Niivue({ ...testOptions, smoothDrawing: 1 })
        await nv.attachTo('gl')
        await nv.loadVolumes([{ url: './images/mni152.nii.gz', colormap: 'gray', opacity: 1 }])
        nv.drawOtsu(2)
        nv.setSliceType(nv.sliceTypeRender)
        nv.setClipPlane([0.1, 270, 0])
        nv.drawScene()
        nv.gl.finish()
    }, TEST_OPTIONS)
    await page.waitForTimeout(1000)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue smooth drawing clip plane suppresses cap', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const nv = new Niivue({ ...testOptions, smoothDrawing: 1, isClipAllVolumes: true })
        await nv.attachTo('gl')
        await nv.loadVolumes([{ url: './images/mni152.nii.gz', colormap: 'gray', opacity: 1 }])
        nv.drawOtsu(2)
        nv.setSliceType(nv.sliceTypeRender)
        nv.setClipPlane([0.0, 270, 0])
        nv.drawScene()
        nv.gl.finish()
    }, TEST_OPTIONS)
    await page.waitForTimeout(1000)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
