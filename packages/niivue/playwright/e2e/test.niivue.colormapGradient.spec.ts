import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

// Regression test for https://github.com/niivue/niivue/issues/1570
// Colormaps with zero in the red channel (cool, green, blue) produced blank
// 3D volume renders because Sobel gradient shaders sampled only the .r channel.
// The fix reads from .a (alpha), which always carries the scalar intensity.

test('niivue volume render with cool colormap and gradient illumination', async ({ page }) => {
    const result = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        const volumeList = [
            {
                url: './images/mni152.nii.gz',
                colormap: 'cool',
                opacity: 1,
                visible: true
            }
        ]
        await nv.loadVolumes(volumeList)
        nv.setSliceType(nv.sliceTypeRender)
        await nv.setVolumeRenderIllumination(0.5)
        nv.drawScene()
        nv.gl.finish()
        // Read pixels from canvas to verify the volume is visible (not blank)
        const gl = nv.gl
        const width = gl.drawingBufferWidth
        const height = gl.drawingBufferHeight
        const pixels = new Uint8Array(width * height * 4)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let nonBlackCount = 0
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
                nonBlackCount++
            }
        }
        return { nonBlackCount, totalPixels: width * height }
    }, TEST_OPTIONS)
    // The rendered volume must cover a meaningful portion of the canvas.
    // Before the fix, nonBlackCount was 0 for the cool colormap.
    expect(result.nonBlackCount).toBeGreaterThan(result.totalPixels * 0.05)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})

test('niivue volume render with cool colormap and second-order gradient', async ({ page }) => {
    const result = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        const volumeList = [
            {
                url: './images/mni152.nii.gz',
                colormap: 'cool',
                opacity: 1,
                visible: true
            }
        ]
        await nv.loadVolumes(volumeList)
        nv.setSliceType(nv.sliceTypeRender)
        nv.opts.gradientOrder = 2
        await nv.setVolumeRenderIllumination(0.5)
        nv.drawScene()
        nv.gl.finish()
        const gl = nv.gl
        const width = gl.drawingBufferWidth
        const height = gl.drawingBufferHeight
        const pixels = new Uint8Array(width * height * 4)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let nonBlackCount = 0
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
                nonBlackCount++
            }
        }
        return { nonBlackCount, totalPixels: width * height }
    }, TEST_OPTIONS)
    expect(result.nonBlackCount).toBeGreaterThan(result.totalPixels * 0.05)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
