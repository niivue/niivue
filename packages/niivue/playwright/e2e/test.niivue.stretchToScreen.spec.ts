import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

// Regression tests for https://github.com/niivue/niivue/pull/1565
// Single-panel 2D slice views should fill the entire canvas rather than
// leaving black padding at the edges (letterboxing to preserve aspect ratio).

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

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

test('niivue 2D axial slice fills canvas', async ({ page }) => {
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue(testOptions)
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeAxial)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue 2D coronal slice fills canvas', async ({ page }) => {
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue(testOptions)
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeCoronal)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue 2D sagittal slice fills canvas', async ({ page }) => {
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue(testOptions)
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeSagittal)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue 2D axial slice fills canvas after mouse wheel zoom in pan mode', async ({ page }) => {
    // dragMode 3 = pan; in pan mode mouse-wheel zoom was leaving black padding (issue #1564)
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue({ ...testOptions, dragMode: 3 })
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeAxial)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    // zoom in via mouse wheel from canvas center
    await page.mouse.move(640, 360)
    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -120)
    }
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue 2D coronal slice fills canvas after mouse wheel zoom in pan mode', async ({ page }) => {
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue({ ...testOptions, dragMode: 3 })
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeCoronal)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    await page.mouse.move(640, 360)
    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -120)
    }
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue 2D sagittal slice fills canvas after mouse wheel zoom in pan mode', async ({ page }) => {
    await page.evaluate(
        async ({ testOptions, volumes }) => {
            const nv = new Niivue({ ...testOptions, dragMode: 3 })
            await nv.attachTo('gl')
            await nv.loadVolumes(volumes)
            nv.setSliceType(nv.sliceTypeSagittal)
        },
        { testOptions: TEST_OPTIONS, volumes: volumeList }
    )
    await page.mouse.move(640, 360)
    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -120)
    }
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})
