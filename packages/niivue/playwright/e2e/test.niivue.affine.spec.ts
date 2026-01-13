import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue applyVolumeTransform translates overlay', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        await nv.loadVolumes([
            { url: './images/mni152.nii.gz', colormap: 'gray' },
            { url: './images/mni152.nii.gz', colormap: 'red', opacity: 0.5 }
        ])
        nv.setSliceType(nv.sliceTypeMultiplanar)
        // Translate overlay 20mm in X direction
        nv.applyVolumeTransform(1, {
            translation: [20, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        })
    }, TEST_OPTIONS)
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue applyVolumeTransform rotates overlay', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        await nv.loadVolumes([
            { url: './images/mni152.nii.gz', colormap: 'gray' },
            { url: './images/mni152.nii.gz', colormap: 'red', opacity: 0.5 }
        ])
        nv.setSliceType(nv.sliceTypeMultiplanar)
        // Rotate overlay 15 degrees around Z axis
        nv.applyVolumeTransform(1, {
            translation: [0, 0, 0],
            rotation: [0, 0, 15],
            scale: [1, 1, 1]
        })
    }, TEST_OPTIONS)
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue resetVolumeAffine restores original', async ({ page }) => {
    const result = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        await nv.loadVolumes([
            { url: './images/mni152.nii.gz', colormap: 'gray' },
            { url: './images/mni152.nii.gz', colormap: 'red', opacity: 0.5 }
        ])
        // Get original affine
        const originalAffine = JSON.stringify(nv.getVolumeAffine(1))
        // Apply transform
        nv.applyVolumeTransform(1, {
            translation: [10, 10, 10],
            rotation: [5, 5, 5],
            scale: [1.1, 1.1, 1.1]
        })
        // Reset
        nv.resetVolumeAffine(1)
        const resetAffine = JSON.stringify(nv.getVolumeAffine(1))
        return originalAffine === resetAffine
    }, TEST_OPTIONS)
    expect(result).toBe(true)
})
