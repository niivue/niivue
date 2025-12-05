import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue with two instances and bounds', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const volGray = [{ url: './images/mni152.nii.gz', colormap: 'gray', visible: true, opacity: 1 }]
        const volHot = [{ url: './images/mni152.nii.gz', colormap: 'hot', visible: true, opacity: 1 }]

        const nv1 = new Niivue({
            ...testOptions,
            bounds: [
                [0.0, 0.0],
                [0.5, 0.5]
            ]
        })
        await nv1.attachTo('gl')
        await nv1.loadVolumes(volGray)
        nv1.setSliceType(nv1.sliceTypeMultiplanar)

        const nv2 = new Niivue({
            ...testOptions,
            bounds: [
                [0.5, 0.5],
                [1.0, 1.0]
            ]
        })
        await nv2.attachTo('gl')
        await nv2.loadVolumes(volHot)
        nv2.setSliceType(nv2.sliceTypeMultiplanar)
        nv1.gl.clear(nv1.gl.COLOR_BUFFER_BIT)
        nv1.drawScene()
        nv2.drawScene()
    }, TEST_OPTIONS)

    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue with bounds + custom layouts', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        const volGray = [{ url: './images/mni152.nii.gz', colormap: 'gray', visible: true, opacity: 1 }]
        const volHot = [{ url: './images/mni152.nii.gz', colormap: 'hot', visible: true, opacity: 1 }]

        const nv1 = new Niivue({
            ...testOptions,
            bounds: [
                [0.0, 0.0],
                [0.5, 0.5]
            ]
        })
        await nv1.attachTo('gl')
        await nv1.loadVolumes(volGray)
        nv1.setCustomLayout([
            { sliceType: nv1.sliceTypeAxial, position: [0, 0, 0.5, 1] },
            { sliceType: nv1.sliceTypeCoronal, position: [0.5, 0, 0.5, 1] }
        ])

        const nv2 = new Niivue({
            ...testOptions,
            bounds: [
                [0.5, 0.5],
                [1.0, 1.0]
            ]
        })
        await nv2.attachTo('gl')
        await nv2.loadVolumes(volHot)
        nv2.setCustomLayout([
            { sliceType: nv2.sliceTypeSagittal, position: [0, 0.5, 1, 0.5] },
            { sliceType: nv2.sliceTypeRender, position: [0, 0, 1, 0.5] }
        ])

        nv1.gl.clear(nv1.gl.COLOR_BUFFER_BIT)
        nv1.drawScene()
        nv2.drawScene()
    }, TEST_OPTIONS)

    await expect(page).toHaveScreenshot({ timeout: 30000 })
})
